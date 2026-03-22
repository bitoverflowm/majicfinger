/**
 * Run a bounded SELECT via Athena (server-only credentials).
 * Supports: start-only, single poll, full result fetch, or sync wait (compose).
 */
import AWS from "aws-sdk";
import { isValidColumnIdentifier } from "./athenaTableMap";

function getRegion() {
  return process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
}

function normalizeOutputUri(uri) {
  if (!uri || typeof uri !== "string") return "";
  const t = uri.trim();
  if (!t.startsWith("s3://")) return "";
  return t.endsWith("/") ? t : `${t}/`;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function assertAthenaConfig() {
  const output = normalizeOutputUri(process.env.DATA_LAKE_ATHENA_OUTPUT_S3_URI || "");
  if (!output) {
    const err = new Error("Server missing DATA_LAKE_ATHENA_OUTPUT_S3_URI");
    err.code = "CONFIG";
    throw err;
  }
  return output;
}

/**
 * @param {object} opts
 * @param {string} opts.physicalTableName
 * @param {string} opts.database
 * @param {string[] | null | undefined} opts.columns
 * @param {number} opts.limit
 * @returns {Promise<{ queryExecutionId: string; sql: string; rowLimit: number }>}
 */
export async function startAthenaBoundedQuery({ physicalTableName, database, columns, limit }) {
  const output = assertAthenaConfig();

  const workGroup = process.env.DATA_LAKE_ATHENA_WORKGROUP || "primary";
  const catalog = process.env.DATA_LAKE_ATHENA_CATALOG || "AwsDataCatalog";
  const db = String(database || "").trim();
  if (!db) {
    const err = new Error("Server missing DATA_LAKE_ATHENA_DATABASE");
    err.code = "CONFIG";
    throw err;
  }

  let selectList = "*";
  if (columns && columns.length > 0) {
    for (const c of columns) {
      if (!isValidColumnIdentifier(c)) {
        const err = new Error(`Invalid column name: ${c}`);
        err.code = "BAD_REQUEST";
        throw err;
      }
    }
    selectList = columns.map((c) => `"${c}"`).join(", ");
  }

  const safeTable = String(physicalTableName).trim();
  if (!/^[a-zA-Z0-9_]+$/.test(safeTable)) {
    const err = new Error("Invalid table name");
    err.code = "BAD_REQUEST";
    throw err;
  }

  const lim = Math.min(Math.max(1, Math.floor(Number(limit) || 1)), 1000);
  const sql = `SELECT ${selectList} FROM "${safeTable}" LIMIT ${lim}`;

  const athena = new AWS.Athena({ region: getRegion() });
  const { QueryExecutionId } = await athena
    .startQueryExecution({
      QueryString: sql,
      WorkGroup: workGroup,
      ResultConfiguration: { OutputLocation: output },
      QueryExecutionContext: { Catalog: catalog, Database: db },
    })
    .promise();

  return { queryExecutionId: QueryExecutionId, sql, rowLimit: lim };
}

/**
 * One GetQueryExecution (for async poll).
 * @param {string} queryExecutionId
 * @returns {Promise<{ state: string; reason: string; dataScannedBytes: number | null }>}
 */
export async function getAthenaQueryState(queryExecutionId) {
  const athena = new AWS.Athena({ region: getRegion() });
  const { QueryExecution } = await athena.getQueryExecution({ QueryExecutionId: queryExecutionId }).promise();
  const state = QueryExecution.Status.State;
  const reason = QueryExecution.Status.StateChangeReason || "";
  let dataScannedBytes = null;
  const stats = QueryExecution.Statistics;
  if (stats && stats.DataScannedInBytes != null) {
    dataScannedBytes = stats.DataScannedInBytes;
  }
  return { state, reason, dataScannedBytes };
}

/**
 * Paginate GetQueryResults until rowLimit data rows (excluding header).
 * @param {string} queryExecutionId
 * @param {number} rowLimit
 */
export async function fetchAthenaQueryResultRows(queryExecutionId, rowLimit) {
  const lim = Math.min(1000, Math.max(1, Math.floor(Number(rowLimit) || 1)));
  const athena = new AWS.Athena({ region: getRegion() });

  const columnNames = [];
  const dataRows = [];
  let nextToken;
  let isFirstPage = true;
  let truncated = false;

  while (dataRows.length < lim) {
    const page = await athena
      .getQueryResults({
        QueryExecutionId: queryExecutionId,
        NextToken: nextToken,
        MaxResults: 1000,
      })
      .promise();

    const rs = page.ResultSet;
    const meta = rs?.ResultSetMetadata?.ColumnInfo;
    const rows = rs?.Rows || [];

    if (isFirstPage && meta?.length && !columnNames.length) {
      for (const c of meta) {
        columnNames.push(c.Name || "");
      }
    }

    let startIdx = 0;
    if (isFirstPage && rows.length > 0) {
      if (!columnNames.length) {
        columnNames.push(...(rows[0].Data?.map((d) => d.VarCharValue ?? "") || []));
      }
      startIdx = 1;
      isFirstPage = false;
    }

    for (let i = startIdx; i < rows.length && dataRows.length < lim; i++) {
      dataRows.push(rows[i].Data?.map((d) => d.VarCharValue ?? "") || []);
    }

    nextToken = page.NextToken;
    if (!nextToken) break;
    if (dataRows.length >= lim) {
      truncated = true;
      break;
    }
  }

  return {
    columns: columnNames,
    rows: dataRows,
    rowCount: dataRows.length,
    truncated,
  };
}

/**
 * Sync path: start → poll until done or timeout → fetch rows.
 * @param {object} opts
 * @param {string} opts.physicalTableName
 * @param {string} opts.database
 * @param {string[] | null | undefined} opts.columns
 * @param {number} opts.limit
 * @param {number} opts.maxWaitMs
 */
export async function runAthenaBoundedSelect({
  physicalTableName,
  database,
  columns,
  limit,
  maxWaitMs,
}) {
  const { queryExecutionId, sql, rowLimit } = await startAthenaBoundedQuery({
    physicalTableName,
    database,
    columns,
    limit,
  });

  const deadline = Date.now() + maxWaitMs;
  let status = "RUNNING";
  let reason = "";
  let dataScannedBytes = null;

  while (Date.now() < deadline) {
    const snap = await getAthenaQueryState(queryExecutionId);
    status = snap.state;
    reason = snap.reason;
    dataScannedBytes = snap.dataScannedBytes;

    if (status === "SUCCEEDED") break;
    if (status === "FAILED" || status === "CANCELLED") {
      const err = new Error(reason || `Athena query ${status}`);
      err.code = "ATHENA_FAILED";
      err.queryExecutionId = queryExecutionId;
      err.engineState = status;
      throw err;
    }
    await sleep(400);
  }

  if (status !== "SUCCEEDED") {
    try {
      const athena = new AWS.Athena({ region: getRegion() });
      await athena.stopQueryExecution({ QueryExecutionId: queryExecutionId }).promise();
    } catch {
      /* ignore */
    }
    const err = new Error("Athena query timed out");
    err.code = "TIMEOUT";
    err.queryExecutionId = queryExecutionId;
    throw err;
  }

  const result = await fetchAthenaQueryResultRows(queryExecutionId, rowLimit);

  return {
    ...result,
    queryExecutionId,
    dataScannedBytes,
    engineState: "SUCCEEDED",
    sql,
  };
}

export { sleep };
