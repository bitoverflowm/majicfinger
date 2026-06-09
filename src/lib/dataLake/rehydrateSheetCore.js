/**
 * Shared compose-sheet rehydration (Athena → rows) for API routes and public embed hydration.
 */
import {
  StartQueryExecutionCommand,
  StopQueryExecutionCommand,
  getAthenaClient,
} from "@/lib/awsClients";
import { validateAthenaLakeQueryBody } from "@/lib/dataLake/validateAthenaLakeRequest";
import {
  runAthenaBoundedSelect,
  startAthenaBoundedQuery,
  getAthenaQueryState,
  fetchAthenaQueryResultRows,
} from "@/lib/dataLake/runAthenaSelect";
import { finalizeRehydrateSheetResult } from "@/lib/dataLake/rehydrateSheetFinalize";
export {
  buildRehydrateSheetRequestBody,
  resolvePreviewRowCountForRehydrate,
} from "@/lib/dataLake/rehydrateSheetShared";
import { buildComposeAthenaSelectSql } from "@/lib/dataLake/buildComposeAthenaSql";
import {
  buildComposeFiltersWhereSql,
  collectKalshiMarketsMaterializedVirtuals,
} from "@/lib/dataLake/composeWherePredicateSql";

export function safeIdentifierForSheetGraph(s) {
  const t = String(s || "").trim().replace(/[^a-zA-Z0-9_]+/g, "_");
  const out = /^[0-9]/.test(t) ? `s_${t}` : t;
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(out) ? out.slice(0, 60) : "";
}

/**
 * Build the `sheetGraph` payload expected by rehydrate (matches gridView `collectSheetGraph`).
 *
 * @param {Record<string, any>} dataSheets
 * @param {string} rootSheetId
 */
export function buildSheetProvenanceGraphForRehydrate(dataSheets, rootSheetId) {
  const out = {};
  const visit = (id) => {
    if (!id || out[id]) return;
    const sh = dataSheets?.[id];
    if (!sh?.provenance) return;
    const nm = safeIdentifierForSheetGraph(sh.name || id) || safeIdentifierForSheetGraph(`sheet_${String(id).replace(/\W/g, "")}`) || "root_sheet";
    out[id] = { name: nm, provenance: sh.provenance };
    for (const dep of sh.provenance?.serverSheetJoins || []) {
      if (dep?.targetSheetId) visit(dep.targetSheetId);
    }
  };
  visit(String(rootSheetId || "").trim());
  return out;
}

function normalizeLimit(body, provenance, access) {
  const tierMax = Math.max(1, Math.floor(Number(access.maxComposeRows || access.maxSelectRows || 100)));
  const savedFull = Math.max(
    0,
    Math.floor(Number(body?.fullRowCount) || 0),
    Math.floor(Number(body?.saveMeta?.fullRowCount) || 0),
    Math.floor(Number(body?.saveMeta?.estimatedFullRows) || 0),
  );
  const intentFull = Math.max(
    savedFull,
    Math.floor(Number(body?.intentFullRowCount) || 0),
  );
  const explicitProv = provenance?.composeAthenaRowLimit;
  let target = null;
  // User-set compose row cap in provenance — only when no stronger intent from request history.
  if (
    explicitProv != null &&
    explicitProv !== "" &&
    Number.isFinite(Number(explicitProv)) &&
    (intentFull <= 0 || Math.floor(Number(explicitProv)) <= intentFull)
  ) {
    target = Math.floor(Number(explicitProv));
  }
  const requested = Number(body?.maxRows);
  if (Number.isFinite(requested) && requested > 0) {
    target = target == null ? Math.floor(requested) : Math.max(target, Math.floor(requested));
  }
  // Restore the row count from request cards / saved metadata, not a stale partial reload (12.5k).
  if (intentFull > 0) {
    target = target == null ? intentFull : Math.max(target, intentFull);
  }
  if (target != null) {
    return Math.max(1, Math.min(target, tierMax));
  }
  if (access.unlimitedComposeRows) {
    return tierMax;
  }
  return tierMax;
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

async function startAthenaSqlExecution({ database, sql }) {
  const output = assertAthenaConfig();
  const workGroup = process.env.DATA_LAKE_ATHENA_WORKGROUP || "primary";
  const catalog = process.env.DATA_LAKE_ATHENA_CATALOG || "AwsDataCatalog";
  const db = String(database || "").trim();
  if (!db) {
    const err = new Error("Server missing DATA_LAKE_ATHENA_DATABASE");
    err.code = "CONFIG";
    throw err;
  }

  const athena = getAthenaClient();
  const { QueryExecutionId } = await athena.send(
    new StartQueryExecutionCommand({
      QueryString: sql,
      WorkGroup: workGroup,
      ResultConfiguration: { OutputLocation: output },
      QueryExecutionContext: { Catalog: catalog, Database: db },
    }),
  );
  return QueryExecutionId;
}

async function executeAthenaSql({ database, sql, maxWaitMs, rowLimit }) {
  const QueryExecutionId = await startAthenaSqlExecution({ database, sql });

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
      await getAthenaClient().send(
        new StopQueryExecutionCommand({ QueryExecutionId }),
      );
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

async function buildComposeWithSheetGraphSql({ provenance, body, access, limit }) {
  const sheetGraph = body?.sheetGraph && typeof body.sheetGraph === "object" ? body.sheetGraph : {};
  const rootSheetId = String(body?.sheetId || "root");
  const rootEntry = {
    name: safeIdentifierForSheetGraph(sheetGraph[rootSheetId]?.name || "root_sheet") || "root_sheet",
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
    const cteName = safeIdentifierForSheetGraph(entry?.name || sheetId);
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
      const depName = safeIdentifierForSheetGraph(graph[depId]?.name || depId);
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
  return { database, sql };
}

async function runComposeWithSheetGraph({ provenance, body, access, limit, maxWaitMs }) {
  const { database, sql } = await buildComposeWithSheetGraphSql({ provenance, body, access, limit });
  return executeAthenaSql({ database, sql, maxWaitMs, rowLimit: limit });
}

/**
 * Start Athena for a rehydrate/replay (returns immediately — poll status separately).
 *
 * @param {object} body
 * @param {{ maxComposeRows: number; maxSelectRows: number; unlimitedComposeRows?: boolean }} access
 */
export async function startRehydrateSheetQuery(body, access) {
  const provenance = body.provenance && typeof body.provenance === "object" ? body.provenance : null;
  if (!provenance || provenance.kind !== "compose") {
    const err = new Error("Missing compose provenance");
    err.code = "BAD_REQUEST";
    throw err;
  }

  const limit = normalizeLimit(body, provenance, access);
  const hasServerDeps = Array.isArray(provenance.serverSheetJoins) && provenance.serverSheetJoins.length > 0;

  if (hasServerDeps) {
    const { database, sql } = await buildComposeWithSheetGraphSql({ provenance, body, access, limit });
    const queryExecutionId = await startAthenaSqlExecution({ database, sql });
    return { queryExecutionId, rowLimit: limit, sql, requestedLimit: limit };
  }

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
  const started = await startAthenaBoundedQuery({
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
    demo: validated.demo,
    composeSqlCap: validated.maxComposeRows,
    unlimitedComposeRows: access.unlimitedComposeRows,
  });
  return {
    queryExecutionId: started.queryExecutionId,
    rowLimit: started.rowLimit ?? limit,
    sql: started.sql,
    requestedLimit: limit,
  };
}

/**
 * @param {object} body - Same JSON body as POST /api/data-lake/rehydrate-sheet
 * @param {{ maxComposeRows: number; maxSelectRows: number }} access
 * @param {{ maxWaitMs?: number }} [opts]
 */
export async function runRehydrateSheetCore(body, access, opts = {}) {
  const provenance = body.provenance && typeof body.provenance === "object" ? body.provenance : null;
  if (!provenance || provenance.kind !== "compose") {
    const err = new Error("Missing compose provenance");
    err.code = "BAD_REQUEST";
    throw err;
  }

  const limit = normalizeLimit(body, provenance, access);
  const maxWaitMs =
    opts.maxWaitMs ??
    Math.min(Math.max(5000, parseInt(process.env.DATA_LAKE_ATHENA_MAX_WAIT_MS || "45000", 10) || 45000), 120000);

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
          unlimitedComposeRows: access.unlimitedComposeRows,
        });
      })();

  return finalizeRehydrateSheetResult(body, result, limit);
}
