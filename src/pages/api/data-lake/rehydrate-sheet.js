/**
 * Rebuild a saved provenance-backed sheet from Data Lake query history.
 *
 * This intentionally does not materialize/cache results in object storage yet.
 */
import AWS from "aws-sdk";
import {
  AthenaLakeRequestError,
  validateAthenaLakeQueryBody,
} from "../../../lib/dataLake/validateAthenaLakeRequest";
import { runAthenaBoundedSelect, getAthenaQueryState, fetchAthenaQueryResultRows } from "../../../lib/dataLake/runAthenaSelect";
import { buildComposeAthenaSelectSql } from "../../../lib/dataLake/buildComposeAthenaSql";
import {
  buildComposeFiltersWhereSql,
  collectKalshiMarketsMaterializedVirtuals,
} from "../../../lib/dataLake/composeWherePredicateSql";
import { getAthenaAccessFromRequest } from "../../../lib/athenaAccess";
import { replayOperations, hashJson } from "../../../lib/projectPersistence";
import { normalizeLakeBigintFieldsInRows } from "../../../lib/dataLake/lakeBigintNormalize";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "4mb",
    },
  },
};

function parseBody(req) {
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body || "{}");
    } catch {
      return null;
    }
  }
  return req.body && typeof req.body === "object" ? req.body : null;
}

function rowsToObjects(columns, rows) {
  const cols = Array.isArray(columns) ? columns : [];
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const arr = Array.isArray(row) ? row : [];
    return cols.reduce((acc, col, idx) => {
      acc[col] = arr[idx] === "" || arr[idx] == null ? null : arr[idx];
      return acc;
    }, {});
  });
}

function normalizeLimit(body, provenance, access) {
  const requested = Number(body?.maxRows ?? provenance?.composeAthenaRowLimit ?? access.maxComposeRows ?? access.maxSelectRows);
  const fallback = Math.max(1, Math.floor(Number(access.maxComposeRows || access.maxSelectRows || 100)));
  if (!Number.isFinite(requested)) return fallback;
  return Math.max(1, Math.min(Math.floor(requested), fallback));
}

function safeIdentifier(s) {
  const t = String(s || "").trim().replace(/[^a-zA-Z0-9_]+/g, "_");
  const out = /^[0-9]/.test(t) ? `s_${t}` : t;
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(out) ? out.slice(0, 60) : "";
}

function getRegion() {
  return process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
}

function normalizeOutputUri(uri) {
  if (!uri || typeof uri !== "string") return "";
  const t = uri.trim();
  if (!t.startsWith("s3://")) return "";
  return t.endsWith("/") ? t : `${t}/`;
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

async function executeAthenaSql({ database, sql, maxWaitMs, rowLimit }) {
  const output = assertAthenaConfig();
  const workGroup = process.env.DATA_LAKE_ATHENA_WORKGROUP || "primary";
  const catalog = process.env.DATA_LAKE_ATHENA_CATALOG || "AwsDataCatalog";
  const db = String(database || "").trim();
  if (!db) {
    const err = new Error("Server missing DATA_LAKE_ATHENA_DATABASE");
    err.code = "CONFIG";
    throw err;
  }

  const athena = new AWS.Athena({ region: getRegion() });
  const { QueryExecutionId } = await athena
    .startQueryExecution({
      QueryString: sql,
      WorkGroup: workGroup,
      ResultConfiguration: { OutputLocation: output },
      QueryExecutionContext: { Catalog: catalog, Database: db },
    })
    .promise();

  const deadline = Date.now() + maxWaitMs;
  let status = "RUNNING";
  let reason = "";
  let dataScannedBytes = null;
  while (Date.now() < deadline) {
    const snap = await getAthenaQueryState(QueryExecutionId);
    status = snap.state;
    reason = snap.reason;
    dataScannedBytes = snap.dataScannedBytes;
    if (status === "SUCCEEDED") break;
    if (status === "FAILED" || status === "CANCELLED") {
      const err = new Error(reason || `Athena query ${status}`);
      err.code = "ATHENA_FAILED";
      err.queryExecutionId = QueryExecutionId;
      throw err;
    }
    await new Promise((r) => setTimeout(r, 400));
  }

  if (status !== "SUCCEEDED") {
    try {
      await athena.stopQueryExecution({ QueryExecutionId }).promise();
    } catch {
      /* ignore */
    }
    const err = new Error("Athena query timed out");
    err.code = "TIMEOUT";
    err.queryExecutionId = QueryExecutionId;
    throw err;
  }

  const result = await fetchAthenaQueryResultRows(QueryExecutionId, rowLimit);
  return { ...result, queryExecutionId: QueryExecutionId, dataScannedBytes, sql };
}

function buildWhereSql(validated) {
  const materializedVirtuals = collectKalshiMarketsMaterializedVirtuals({
    compose: validated.compose,
    filters: validated.filters,
    lake: validated.lake,
    table: validated.table,
  });
  const whereSql = buildComposeFiltersWhereSql({
    filters: validated.filters,
    caseSensitive: validated.caseSensitive,
    baseAlias: "t0",
    lake: validated.lake,
    table: validated.table,
    materializedVirtualColumns: materializedVirtuals,
  });
  return { whereSql, materializedVirtuals };
}

async function runComposeWithSheetGraph({ provenance, body, access, limit, maxWaitMs }) {
  const sheetGraph = body?.sheetGraph && typeof body.sheetGraph === "object" ? body.sheetGraph : {};
  const rootSheetId = String(body?.sheetId || "root");
  const rootEntry = {
    name: safeIdentifier(sheetGraph[rootSheetId]?.name || "root_sheet") || "root_sheet",
    provenance,
  };
  const graph = { ...sheetGraph, [rootSheetId]: rootEntry };
  const cteSqlById = new Map();
  const cteDefsInOrder = [];
  const visiting = new Set();
  let database = "";

  const buildSheetCte = async (sheetId) => {
    if (cteSqlById.has(sheetId)) return;
    if (visiting.has(sheetId)) {
      const err = new Error("Cycle detected in sheet provenance graph");
      err.code = "BAD_REQUEST";
      throw err;
    }
    visiting.add(sheetId);

    const entry = graph[sheetId];
    const prov = entry?.provenance;
    const cteName = safeIdentifier(entry?.name || sheetId);
    if (!cteName || !prov || prov.kind !== "compose") {
      const err = new Error(`Missing CTE-rebuildable provenance for sheet ${sheetId}`);
      err.code = "BAD_REQUEST";
      throw err;
    }

    const deps = Array.isArray(prov.serverSheetJoins) ? prov.serverSheetJoins : [];
    const depCteJoins = [];
    for (const dep of deps) {
      const depId = dep?.targetSheetId;
      if (!depId || !graph[depId]) {
        const err = new Error(`Missing saved provenance for joined sheet ${depId}`);
        err.code = "BAD_REQUEST";
        throw err;
      }
      await buildSheetCte(depId);
      const depName = safeIdentifier(graph[depId]?.name || depId);
      depCteJoins.push({
        joinType: String(dep?.joinType || "left").toLowerCase().trim() === "inner" ? "inner" : "left",
        cteName: depName,
        on: {
          leftColumn: String(dep?.leftColumn || "").trim(),
          rightColumn: String(dep?.rightColumn || "").trim(),
        },
      });
    }

    const compose = {
      ...(prov.composeSpec || {}),
      ...(depCteJoins.length ? { cteJoins: depCteJoins } : {}),
    };
    const validated = validateAthenaLakeQueryBody(
      {
        lake: prov.lake,
        table: prov.table,
        queryType: "compose",
        compose,
        filters: prov.composeFilters && typeof prov.composeFilters === "object" ? prov.composeFilters : null,
        caseSensitive: true,
        ...(sheetId === rootSheetId ? { limit } : {}),
      },
      access,
    );
    if (sheetId === rootSheetId) database = validated.database;
    const { whereSql, materializedVirtuals } = buildWhereSql(validated);
    const sql = buildComposeAthenaSelectSql({
      physicalTableName: validated.physical,
      limit: sheetId === rootSheetId ? validated.limit : null,
      compose: validated.compose,
      lake: validated.lake,
      table: validated.table,
      whereSql,
      kalshiMaterializedVirtuals: materializedVirtuals,
    });
    cteSqlById.set(sheetId, { cteName, sql });
    cteDefsInOrder.push(sheetId);
    visiting.delete(sheetId);
  };

  await buildSheetCte(rootSheetId);
  const rootSql = cteSqlById.get(rootSheetId)?.sql || "";
  const depIds = cteDefsInOrder.filter((id) => id !== rootSheetId);
  const cteDefs = depIds.map((id) => `${cteSqlById.get(id).cteName} AS (${cteSqlById.get(id).sql})`);
  const sql = cteDefs.length ? `WITH ${cteDefs.join(", ")} ${rootSql}` : rootSql;
  return executeAthenaSql({ database, sql, maxWaitMs, rowLimit: limit });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ error: "Method not allowed", code: "METHOD" });
  }

  const body = parseBody(req);
  if (!body) {
    return res.status(400).json({ error: "Invalid JSON body", code: "BAD_REQUEST" });
  }

  const provenance = body.provenance && typeof body.provenance === "object" ? body.provenance : null;
  if (!provenance) {
    return res.status(400).json({ error: "Missing sheet provenance", code: "BAD_REQUEST" });
  }
  if (provenance.kind !== "compose") {
    return res.status(400).json({
      error: `Only CTE-rebuildable compose provenance can be rehydrated by this endpoint (got ${String(provenance.kind || "unknown")}).`,
      code: "UNSUPPORTED_PROVENANCE",
    });
  }

  try {
    const access = await getAthenaAccessFromRequest(req);
    const limit = normalizeLimit(body, provenance, access);
    const maxWaitMs = Math.min(
      Math.max(5000, parseInt(process.env.DATA_LAKE_ATHENA_MAX_WAIT_MS || "45000", 10) || 45000),
      120000,
    );

    const hasServerDeps = Array.isArray(provenance.serverSheetJoins) && provenance.serverSheetJoins.length > 0;
    const result = hasServerDeps
      ? await runComposeWithSheetGraph({ provenance, body, access, limit, maxWaitMs })
      : await (async () => {
          const validated = validateAthenaLakeQueryBody(
            {
              lake: provenance.lake,
              table: provenance.table,
              queryType: "compose",
              compose: provenance.composeSpec || {},
              filters: provenance.composeFilters && typeof provenance.composeFilters === "object" ? provenance.composeFilters : null,
              caseSensitive: true,
              limit,
            },
            access,
          );
          return runAthenaBoundedSelect({
            physicalTableName: validated.physical,
            database: validated.database,
            columns: validated.columns,
            queryType: validated.queryType,
            compose: validated.compose,
            lake: validated.lake,
            table: validated.table,
            filters: validated.filters,
            caseSensitive: validated.caseSensitive,
            limit: validated.limit,
            maxWaitMs,
            demo: validated.demo,
            composeSqlCap: validated.maxComposeRows,
          });
        })();

    const rawObjects = rowsToObjects(result.columns, result.rows);
    const replayedRows = normalizeLakeBigintFieldsInRows(
      replayOperations({
        rows: rawObjects,
        operations: Array.isArray(body.operationHistory) ? body.operationHistory : [],
      }),
    );
    const replayedColumns = [];
    const seenColumns = new Set();
    for (const col of Array.isArray(result.columns) ? result.columns : []) {
      if (seenColumns.has(col)) continue;
      seenColumns.add(col);
      replayedColumns.push(col);
    }
    for (const row of replayedRows) {
      if (!row || typeof row !== "object") continue;
      for (const col of Object.keys(row)) {
        if (seenColumns.has(col)) continue;
        seenColumns.add(col);
        replayedColumns.push(col);
      }
    }
    const previewRows = replayedRows.slice(0, Array.isArray(body.previewRows) ? body.previewRows.length : 0);
    const previewHash = previewRows.length ? hashJson(previewRows) : null;
    const expectedPreviewHash = body?.saveMeta?.previewHash || null;

    return res.status(200).json({
      sheetId: body.sheetId || null,
      columns: replayedColumns,
      rows: replayedRows,
      rowCount: replayedRows.length,
      queryExecutionId: result.queryExecutionId,
      dataScannedBytes: result.dataScannedBytes,
      previewHash,
      previewMatches: expectedPreviewHash ? previewHash === expectedPreviewHash : null,
      warning:
        expectedPreviewHash && previewHash !== expectedPreviewHash
          ? "Source data or query behavior changed since this project was saved."
          : null,
    });
  } catch (e) {
    if (e instanceof AthenaLakeRequestError) {
      return res.status(e.statusCode).json({ error: e.message, code: e.code });
    }
    const code = e?.code || "INTERNAL";
    if (code === "CONFIG") {
      return res.status(503).json({ error: e.message, code: "CONFIG" });
    }
    if (code === "TIMEOUT") {
      return res.status(408).json({ error: e.message, code: "TIMEOUT", queryExecutionId: e.queryExecutionId });
    }
    if (code === "ATHENA_FAILED") {
      return res.status(502).json({ error: e.message, code: "ATHENA_FAILED", queryExecutionId: e.queryExecutionId });
    }
    return res.status(500).json({ error: e?.message || "Internal error", code });
  }
}
