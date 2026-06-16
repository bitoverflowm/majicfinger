/**
 * Shared Athena execution for sheet-quant-athena (mirrors sheet-refine-athena CTE builder).
 */
import {
  StartQueryExecutionCommand,
  StopQueryExecutionCommand,
  getAthenaClient,
} from "@/lib/awsClients";
import { validateAthenaLakeQueryBody, AthenaLakeRequestError } from "./validateAthenaLakeRequest";
import { buildComposeAthenaSelectSql } from "./buildComposeAthenaSql";
import {
  buildComposeFiltersWhereSql,
  collectKalshiMarketsMaterializedVirtuals,
} from "./composeWherePredicateSql";
import { getAthenaQueryState, fetchAthenaQueryResultRows } from "./runAthenaSelect";
import { buildRelativePositionSnapshotAthenaSql } from "./buildQuantAthenaSql";

const SAFE_ALIAS = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

function safeIdentifier(s) {
  const t = String(s || "").trim();
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(t) ? t : "";
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

async function executeAthenaSql({ database, sql, maxWaitMs }) {
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
      await athena.send(new StopQueryExecutionCommand({ QueryExecutionId }));
    } catch {
      /* ignore */
    }
    const err = new Error("Athena query timed out");
    err.code = "TIMEOUT";
    err.queryExecutionId = QueryExecutionId;
    throw err;
  }

  const result = await fetchAthenaQueryResultRows(QueryExecutionId, null);
  return { ...result, queryExecutionId: QueryExecutionId, dataScannedBytes };
}

async function buildSheetCteBundle(sheetGraph, rootSheetId, access) {
  const cteSqlById = new Map();
  const cteDefsInOrder = [];
  const visiting = new Set();
  let rootDatabase = "";

  const buildSheetCte = async (sheetId) => {
    if (cteSqlById.has(sheetId)) return;
    if (visiting.has(sheetId)) {
      const err = new Error("Cycle detected in sheet CTE dependencies");
      err.code = "BAD_REQUEST";
      throw err;
    }
    visiting.add(sheetId);

    const entry = sheetGraph[sheetId];
    const cteName = safeIdentifier(entry?.name);
    if (!cteName || !SAFE_ALIAS.test(cteName)) {
      const err = new Error(`Invalid CTE name for sheet ${sheetId}`);
      err.code = "BAD_REQUEST";
      throw err;
    }

    const prov = entry?.provenance;
    if (!prov || prov.kind !== "compose") {
      const err = new Error(`Sheet ${sheetId} is not Athena-rebuildable (needs compose provenance)`);
      err.code = "BAD_REQUEST";
      throw err;
    }

    const deps = Array.isArray(prov.serverSheetJoins) ? prov.serverSheetJoins : [];
    const depCteJoins = [];
    for (const d of deps) {
      const depId = d?.targetSheetId;
      if (!depId || !sheetGraph[depId]) {
        const err = new Error(`Missing dependency ${depId}`);
        err.code = "BAD_REQUEST";
        throw err;
      }
      await buildSheetCte(depId);
      const depName = safeIdentifier(sheetGraph[depId]?.name);
      depCteJoins.push({
        joinType: String(d?.joinType || "left").toLowerCase().trim() === "inner" ? "inner" : "left",
        cteName: depName,
        on: { leftColumn: String(d?.leftColumn || "").trim(), rightColumn: String(d?.rightColumn || "").trim() },
      });
    }

    const sheetCompose = {
      ...(prov.composeSpec || {}),
      ...(depCteJoins.length ? { cteJoins: depCteJoins } : {}),
    };

    const validated = validateAthenaLakeQueryBody(
      {
        lake: prov.lake,
        table: prov.table,
        queryType: "compose",
        compose: sheetCompose,
        filters: prov.composeFilters && typeof prov.composeFilters === "object" ? prov.composeFilters : null,
        caseSensitive: true,
      },
      access,
    );

    if (sheetId === rootSheetId) rootDatabase = validated.database;

    const kalshiMat = collectKalshiMarketsMaterializedVirtuals({
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
      materializedVirtualColumns: kalshiMat,
    });

    const cteSql = buildComposeAthenaSelectSql({
      physicalTableName: validated.physical,
      limit: null,
      compose: validated.compose,
      lake: validated.lake,
      table: validated.table,
      whereSql,
      kalshiMaterializedVirtuals: kalshiMat,
    });

    cteSqlById.set(sheetId, { cteName, cteSql });
    cteDefsInOrder.push(sheetId);
    visiting.delete(sheetId);
  };

  await buildSheetCte(rootSheetId);
  const rootCteName = safeIdentifier(sheetGraph[rootSheetId]?.name);
  const cteDefsSql = cteDefsInOrder.map(
    (id) => `${safeIdentifier(sheetGraph[id]?.name)} AS (${cteSqlById.get(id).cteSql})`,
  );

  return { cteDefsSql, rootCteName, rootDatabase };
}

/**
 * @param {object} params
 * @param {object} params.access - from getAthenaAccessFromRequest
 * @param {object} params.sheetGraph
 * @param {string} params.rootSheetId
 * @param {object} params.join
 * @param {object} params.quant
 * @param {number} params.maxWaitMs
 */
export async function runSheetQuantAthena({
  access,
  sheetGraph,
  rootSheetId,
  join,
  quant,
  maxWaitMs = 45000,
}) {
  const { cteDefsSql, rootCteName, rootDatabase } = await buildSheetCteBundle(sheetGraph, rootSheetId, access);
  const rowLimit = Math.max(1, Math.floor(access.maxSelectRows || 50000));

  const quantSql = buildRelativePositionSnapshotAthenaSql({
    baseCteName: rootCteName,
    join,
    quant,
    limit: rowLimit,
  });

  const fullSql = `WITH ${[...cteDefsSql, quantSql].join(", ")}`;

  if (!String(rootDatabase || "").trim()) {
    const err = new Error("Could not resolve Athena database");
    err.code = "BAD_REQUEST";
    throw err;
  }

  return executeAthenaSql({ database: rootDatabase, sql: fullSql, maxWaitMs });
}

export { AthenaLakeRequestError };
