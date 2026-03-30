/**
 * Run a bounded SELECT via Athena (server-only credentials).
 * Supports: start-only, single poll, full result fetch, or sync wait (compose).
 */
import AWS from "aws-sdk";
import { isValidColumnIdentifier } from "./athenaTableMap";
import {
  buildComposeAthenaSelectSql,
  composeUnboundedSelectShouldCapRows,
  COMPOSE_UNCONSTRAINED_ROW_CAP,
} from "./buildComposeAthenaSql";
import { sortRowsChronologicallyByDetectedBucketColumn } from "./sortAthenaDateBuckets";

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
 * @param {"select" | "count" | "sum" | "compose"} [opts.queryType]
 * @param {object | null | undefined} [opts.compose]
 * @param {string | null | undefined} [opts.lake] — required for compose queries that use compose.join (Kalshi presets).
 * @param {string | null | undefined} [opts.countAlias]
 * @param {string | null | undefined} [opts.countDistinctColumn]
 * @param {string | null | undefined} [opts.sumColumn]
 * @param {string | null | undefined} [opts.sumAlias]
 * @param {{ and: Array<{ column: string; kind: "date" | "string" | "number"; op: string; value: any }>; or: Array<{ column: string; kind: "date" | "string" | "number"; op: string; value: any }> } | null | undefined} [opts.filters]
 * @param {boolean} [opts.caseSensitive]
 * @param {number} opts.limit
 * @returns {Promise<{ queryExecutionId: string; sql: string; rowLimit: number | null }>}
 */
export async function startAthenaBoundedQuery({
  physicalTableName,
  database,
  columns,
  queryType = "select",
  countAlias,
  countDistinctColumn,
  sumColumn,
  sumAlias,
  compose = null,
  lake = null,
  filters = null,
  caseSensitive = false,
  limit,
}) {
  const output = assertAthenaConfig();

  const workGroup = process.env.DATA_LAKE_ATHENA_WORKGROUP || "primary";
  const catalog = process.env.DATA_LAKE_ATHENA_CATALOG || "AwsDataCatalog";
  const db = String(database || "").trim();
  if (!db) {
    const err = new Error("Server missing DATA_LAKE_ATHENA_DATABASE");
    err.code = "CONFIG";
    throw err;
  }

  let sqlSelect = "*";
  if (queryType === "count") {
    const alias = String(countAlias || "count").trim();
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(alias)) {
      const err = new Error("Invalid countAlias");
      err.code = "BAD_REQUEST";
      throw err;
    }
    const distinctCol = String(countDistinctColumn || "").trim();
    if (distinctCol) {
      if (!isValidColumnIdentifier(distinctCol)) {
        const err = new Error("Invalid countDistinctColumn");
        err.code = "BAD_REQUEST";
        throw err;
      }
      sqlSelect = `COUNT(DISTINCT "${distinctCol}") AS "${alias}"`;
    } else {
      sqlSelect = `COUNT(*) AS "${alias}"`;
    }
  } else if (queryType === "sum") {
    const col = String(sumColumn || "").trim();
    if (!isValidColumnIdentifier(col)) {
      const err = new Error("Invalid sumColumn");
      err.code = "BAD_REQUEST";
      throw err;
    }
    const alias = String(sumAlias || "sum").trim();
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(alias)) {
      const err = new Error("Invalid sumAlias");
      err.code = "BAD_REQUEST";
      throw err;
    }
    sqlSelect = `SUM("${col}") AS "${alias}"`;
  } else {
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
    sqlSelect = selectList;
  }

  const safeTable = String(physicalTableName).trim();
  if (!/^[a-zA-Z0-9_]+$/.test(safeTable)) {
    const err = new Error("Invalid table name");
    err.code = "BAD_REQUEST";
    throw err;
  }
  const sqlTable = `"${safeTable}"`;

  const lim = Math.min(Math.max(1, Math.floor(Number(limit) || 1)), 1000);

  const escapeSqlString = (s) => String(s).replace(/'/g, "''");
  const escapeLike = (s) => String(s).replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");

  /** @param {{ column: string; kind: "date" | "string" | "number"; op: string; value: any }} p */
  const predicateToSql = (p) => {
    const colSql = `"${p.column}"`;

    if (p.op === "in" || p.op === "not_in") {
      const opSql = p.op === "in" ? "IN" : "NOT IN";

      if (p.kind === "number") {
        const values = Array.isArray(p.value) ? p.value : [];
        if (!values.length) return "TRUE";
        const list = values.map((v) => Number(v)).map((n) => (Number.isFinite(n) ? String(n) : "NULL")).join(", ");
        return `${colSql} ${opSql} (${list})`;
      }

      if (p.kind === "string") {
        const values = Array.isArray(p.value) ? p.value : [];
        if (!values.length) return "TRUE";
        const colMaybeLower = caseSensitive ? colSql : `LOWER(${colSql})`;
        const lits = values.map((v) => {
          const s = String(v);
          return caseSensitive ? `'${escapeSqlString(s)}'` : `LOWER('${escapeSqlString(s)}')`;
        });
        return `${colMaybeLower} ${opSql} (${lits.join(", ")})`;
      }

      // date IN/NOT IN not supported in this composer.
      return "TRUE";
    }

    if (p.kind === "date") {
      const colMs = `CASE WHEN ${colSql} < 1000000000000 THEN ${colSql} * 1000 ELSE ${colSql} END`;
      const opSql = p.op === "gt" ? ">" : p.op === "lt" ? "<" : p.op === "eq" ? "=" : "<>";
      return `${colMs} ${opSql} ${Number(p.value)}`;
    }

    if (p.kind === "number") {
      const opSql = p.op === "gt" ? ">" : p.op === "lt" ? "<" : p.op === "eq" ? "=" : "<>";
      return `${colSql} ${opSql} ${Number(p.value)}`;
    }

    // string
    const colMaybeLower = caseSensitive ? colSql : `LOWER(${colSql})`;
    if (p.op === "contains" || p.op === "not_contains") {
      const pattern = `%${escapeLike(p.value)}%`;
      const litMaybeLower = caseSensitive ? `'${escapeSqlString(pattern)}'` : `LOWER('${escapeSqlString(pattern)}')`;
      const opSql = p.op === "contains" ? "LIKE" : "NOT LIKE";
      // Use backslash as ESCAPE char so escaped %/_ are treated literally.
      return `${colMaybeLower} ${opSql} ${litMaybeLower} ESCAPE '\\\\'`;
    }

    const litMaybeLower = caseSensitive ? `'${escapeSqlString(p.value)}'` : `LOWER('${escapeSqlString(p.value)}')`;
    const opSql = p.op === "eq" ? "=" : "!=";
    return `${colMaybeLower} ${opSql} ${litMaybeLower}`;
  };

  let whereSql = "";
  if ((queryType === "count" || queryType === "sum" || queryType === "compose") && filters) {
    const andPreds = Array.isArray(filters.and) ? filters.and : [];
    const orPreds = Array.isArray(filters.or) ? filters.or : [];
    const mergeAndPreds = Array.isArray(filters.mergeAnd) ? filters.mergeAnd : [];
    const mergeOrBranchPreds = Array.isArray(filters.mergeOrBranch) ? filters.mergeOrBranch : [];

    const andExpr = andPreds.length ? andPreds.map(predicateToSql).join(" AND ") : null;
    const orExpr = orPreds.length ? orPreds.map(predicateToSql).join(" OR ") : null;
    const baseExpr = andExpr && orExpr ? `(${andExpr}) AND (${orExpr})` : andExpr ? `(${andExpr})` : orExpr ? `(${orExpr})` : "TRUE";

    if (mergeAndPreds.length > 0 || mergeOrBranchPreds.length > 0) {
      const baseWithAnd =
        mergeAndPreds.length > 0 ? `((${baseExpr}) AND (${mergeAndPreds.map(predicateToSql).join(" AND ")}))` : `(${baseExpr})`;
      if (mergeOrBranchPreds.length > 0) {
        whereSql = ` WHERE ${baseWithAnd} OR (${mergeOrBranchPreds.map(predicateToSql).join(" OR ")})`;
      } else {
        whereSql = ` WHERE ${baseWithAnd}`;
      }
    } else if (andPreds.length > 0 || orPreds.length > 0) {
      whereSql = ` WHERE ${baseExpr}`;
    }
  }

  if (queryType === "compose") {
    if (!compose || typeof compose !== "object") {
      const err = new Error("compose query missing compose spec");
      err.code = "BAD_REQUEST";
      throw err;
    }
    const capRows = composeUnboundedSelectShouldCapRows(compose) ? COMPOSE_UNCONSTRAINED_ROW_CAP : null;
    const sql = buildComposeAthenaSelectSql({
      physicalTableName: safeTable,
      limit: capRows,
      compose,
      lake,
      whereSql,
    });
    const athena = new AWS.Athena({ region: getRegion() });
    const { QueryExecutionId } = await athena
      .startQueryExecution({
        QueryString: sql,
        WorkGroup: workGroup,
        ResultConfiguration: { OutputLocation: output },
        QueryExecutionContext: { Catalog: catalog, Database: db },
      })
      .promise();
    return { queryExecutionId: QueryExecutionId, sql, rowLimit: capRows };
  }

  const sql =
    queryType === "count" || queryType === "sum"
      ? `SELECT ${sqlSelect} FROM ${sqlTable}${whereSql}`
      : `SELECT ${sqlSelect} FROM ${sqlTable}${whereSql} LIMIT ${lim}`;

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
 * @param {number | null} rowLimit max rows, or null to read every page until exhausted
 */
export async function fetchAthenaQueryResultRows(queryExecutionId, rowLimit) {
  const unlimited = rowLimit == null;
  const lim = unlimited ? Number.MAX_SAFE_INTEGER : Math.min(1000, Math.max(1, Math.floor(Number(rowLimit) || 1)));
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
    if (!unlimited && dataRows.length >= lim) {
      truncated = true;
      break;
    }
  }

  // If the compose result contains a human-readable date bucket column
  // (e.g. "Q1 '24"), Athena may return grouped rows in lexicographic
  // order when no explicit ORDER BY is present. Re-sort chronologically
  // on the detected bucket column so the client can display correctly.
  const sorted = sortRowsChronologicallyByDetectedBucketColumn({
    columns: columnNames,
    rows: dataRows,
  });

  return {
    columns: columnNames,
    rows: sorted,
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
 * @param {"select" | "count"} [opts.queryType]
 * @param {string | null | undefined} [opts.countAlias]
 * @param {{ and: Array<{ column: string; kind: "date" | "string" | "number"; op: string; value: any }>; or: Array<{ column: string; kind: "date" | "string" | "number"; op: string; value: any }> } | null | undefined} [opts.filters]
 * @param {boolean} [opts.caseSensitive]
 * @param {number} opts.limit
 * @param {number} opts.maxWaitMs
 */
export async function runAthenaBoundedSelect({
  physicalTableName,
  database,
  columns,
  queryType = "select",
  countAlias = null,
  countDistinctColumn = null,
  sumColumn = null,
  sumAlias = null,
  compose = null,
  lake = null,
  filters = null,
  caseSensitive = false,
  limit,
  maxWaitMs,
}) {
  const { queryExecutionId, sql, rowLimit } = await startAthenaBoundedQuery({
    physicalTableName,
    database,
    columns,
    queryType,
    countAlias,
    countDistinctColumn,
    sumColumn,
    sumAlias,
    compose,
    lake,
    filters,
    caseSensitive,
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
