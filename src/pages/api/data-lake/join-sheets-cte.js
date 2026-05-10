/**
 * Join active-sheet compose results to one or more named sheet CTEs (server-side, full dataset).
 *
 * This endpoint is intentionally *not* generic SQL execution:
 * it rebuilds Athena SQL from validated compose specs + validated join keys.
 *
 * POST JSON body:
 * {
 *   lake: "polymarket" | "kalshi",
 *   table: "markets" | "trades" | "blocks",
 *   compose: object,           // compose spec for the *main* query
 *   filters?: object | null,  // compose WHERE filters (same shape as /athena-query compose)
 *   joins: Array<{
 *     targetSheetId: string,  // key into sheetGraph
 *     joinType?: "left"|"inner",
 *     leftColumn: string,     // column from the main base table
 *     rightColumn: string     // column from the target sheet CTE output
 *   }>,
 *   limit?: number,            // optional SQL LIMIT on the main compose SELECT (clamped to tier cap server-side)
 *   sheetGraph: {
 *     [sheetId: string]: {
 *       name: string,          // CTE name to use in SQL
 *       provenance: {
 *         kind: "compose" | "compose_browser_join",
 *         lake: string,
 *         table: string,
 *         composeSpec: object,
 *         composeFilters: object | null,
 *         serverSheetJoins?: Array<{ targetSheetId: string, joinType?: "left"|"inner", leftColumn: string, rightColumn: string }>
 *       }
 *     }
 *   }
 * }
 */
import AWS from "aws-sdk";
import { ATHENA_DEMO_ROW_LIMIT } from "../../../config/dataLakeParquetSamples";
import { validateAthenaLakeQueryBody, AthenaLakeRequestError } from "../../../lib/dataLake/validateAthenaLakeRequest";
import { buildComposeAthenaSelectSql } from "../../../lib/dataLake/buildComposeAthenaSql";
import {
  buildComposeFiltersWhereSql,
  collectKalshiMarketsMaterializedVirtuals,
} from "../../../lib/dataLake/composeWherePredicateSql";
import { getAthenaQueryState, fetchAthenaQueryResultRows } from "../../../lib/dataLake/runAthenaSelect";
import { getAthenaAccessFromRequest } from "../../../lib/athenaAccess";

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

function safeIdentifier(s) {
  const t = String(s || "").trim();
  return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(t) ? t : "";
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

  const result = await fetchAthenaQueryResultRows(QueryExecutionId, null);
  return { ...result, queryExecutionId: QueryExecutionId, dataScannedBytes };
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

  const lake = body.lake;
  const table = body.table;
  const composeIn = body.compose && typeof body.compose === "object" ? body.compose : null;
  const filtersIn = body.filters && typeof body.filters === "object" ? body.filters : null;

  if (!lake || !table || !composeIn) {
    return res.status(400).json({ error: "Missing lake/table/compose", code: "BAD_REQUEST" });
  }

  const joins = Array.isArray(body.joins) ? body.joins : [];
  const sheetGraph = body.sheetGraph && typeof body.sheetGraph === "object" ? body.sheetGraph : {};
  const demo = body.demo === true;
  if (!joins.length) {
    return res.status(400).json({ error: "Missing joins", code: "BAD_REQUEST" });
  }

  const MAX_WAIT_MS = Math.min(
    Math.max(5000, parseInt(process.env.DATA_LAKE_ATHENA_MAX_WAIT_MS || "45000", 10) || 45000),
    120000,
  );

  try {
    const access = await getAthenaAccessFromRequest(req);
    const composeRowCap = demo ? ATHENA_DEMO_ROW_LIMIT : access.maxComposeRows;

    const sheetIds = Array.from(new Set(joins.map((j) => j?.targetSheetId).filter(Boolean)));
    for (const id of sheetIds) {
      if (!sheetGraph[id]) {
        return res.status(400).json({ error: `Unknown sheetGraph id: ${id}`, code: "BAD_REQUEST" });
      }
    }

    const SAFE_ALIAS = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    const cteSqlById = new Map();
    const cteDefsInOrder = [];
    const visiting = new Set();

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
      if (!prov || typeof prov !== "object") {
        const err = new Error(`Missing provenance for sheet ${sheetId}`);
        err.code = "BAD_REQUEST";
        throw err;
      }

      if (prov.kind !== "compose") {
        const err = new Error(`Sheet ${sheetId} provenance kind is not CTE-rebuildable (${prov.kind})`);
        err.code = "BAD_REQUEST";
        throw err;
      }

      // Build dependency CTEs first.
      const deps = Array.isArray(prov.serverSheetJoins) ? prov.serverSheetJoins : [];
      const depCteJoins = [];
      for (const d of deps) {
        const depId = d?.targetSheetId;
        if (!depId || !sheetGraph[depId]) {
          const err = new Error(`Missing sheetGraph provenance for dependency ${depId} (from ${sheetId})`);
          err.code = "BAD_REQUEST";
          throw err;
        }
        await buildSheetCte(depId);
        const depName = safeIdentifier(sheetGraph[depId]?.name);
        if (!depName) {
          const err = new Error(`Invalid dependency CTE name for ${depId}`);
          err.code = "BAD_REQUEST";
          throw err;
        }
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
          demo,
        },
        access,
      );

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

    for (const id of sheetIds) {
      await buildSheetCte(id);
    }

    const cteDefsSql = cteDefsInOrder.map((id) => `${safeIdentifier(sheetGraph[id]?.name)} AS (${cteSqlById.get(id).cteSql})`);

    const mainCteJoins = joins.map((j) => {
      const depId = j?.targetSheetId;
      const depName = safeIdentifier(sheetGraph[depId]?.name);
      return {
        joinType: String(j?.joinType || "left").toLowerCase().trim() === "inner" ? "inner" : "left",
        cteName: depName,
        on: { leftColumn: String(j?.leftColumn || "").trim(), rightColumn: String(j?.rightColumn || "").trim() },
      };
    });

    const mainCompose = { ...(composeIn || {}), ...(mainCteJoins.length ? { cteJoins: mainCteJoins } : {}) };

    const rawMainLim = body.limit;
    const userMainLim =
      rawMainLim != null && rawMainLim !== "" && Number.isFinite(Number(rawMainLim))
        ? Math.max(1, Math.floor(Number(rawMainLim)))
        : null;
    const mainSqlLimit = userMainLim != null ? Math.min(composeRowCap, userMainLim) : composeRowCap;

    const validatedMain = validateAthenaLakeQueryBody(
      {
        lake,
        table,
        queryType: "compose",
        compose: mainCompose,
        filters: filtersIn,
        caseSensitive: true,
        demo,
        ...(userMainLim != null ? { limit: userMainLim } : {}),
      },
      access,
    );

    const mainKalshiMat = collectKalshiMarketsMaterializedVirtuals({
      compose: validatedMain.compose,
      filters: validatedMain.filters,
      lake: validatedMain.lake,
      table: validatedMain.table,
    });
    const mainWhereSql = buildComposeFiltersWhereSql({
      filters: validatedMain.filters,
      caseSensitive: validatedMain.caseSensitive,
      baseAlias: "t0",
      lake: validatedMain.lake,
      table: validatedMain.table,
      materializedVirtualColumns: mainKalshiMat,
    });

    const mainSql = buildComposeAthenaSelectSql({
      physicalTableName: validatedMain.physical,
      limit: mainSqlLimit,
      compose: validatedMain.compose,
      lake: validatedMain.lake,
      table: validatedMain.table,
      whereSql: mainWhereSql,
      kalshiMaterializedVirtuals: mainKalshiMat,
    });

    const fullSql = cteDefsSql.length ? `WITH ${cteDefsSql.join(", ")} ${mainSql}` : mainSql;

    const { columns, rows, rowCount, queryExecutionId, dataScannedBytes } = await executeAthenaSql({
      database: validatedMain.database,
      sql: fullSql,
      maxWaitMs: MAX_WAIT_MS,
    });

    return res.status(200).json({
      columns,
      rows,
      rowCount,
      queryExecutionId,
      dataScannedBytes,
      lake: validatedMain.lake,
      table: validatedMain.table,
    });
  } catch (e) {
    if (e instanceof AthenaLakeRequestError) {
      return res.status(e.statusCode).json({ error: e.message, code: e.code });
    }
    const code = e?.code || "INTERNAL";
    if (code === "CONFIG") {
      return res.status(503).json({ error: e.message, code: "CONFIG" });
    }
    if (code === "BAD_REQUEST") {
      return res.status(400).json({ error: e.message, code: "BAD_REQUEST" });
    }
    if (code === "TIMEOUT") {
      return res.status(408).json({ error: e.message, code: "TIMEOUT", queryExecutionId: e.queryExecutionId });
    }
    if (code === "ATHENA_FAILED") {
      return res.status(502).json({ error: e.message, code: "ATHENA_FAILED", queryExecutionId: e.queryExecutionId });
    }
    return res.status(500).json({ error: e?.message || "Internal error", code: code || "INTERNAL" });
  }
}

