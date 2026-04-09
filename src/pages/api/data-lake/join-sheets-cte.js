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
import { buildComposeAthenaSelectSql, COMPOSE_UNCONSTRAINED_ROW_CAP } from "../../../lib/dataLake/buildComposeAthenaSql";
import { getAthenaQueryState, fetchAthenaQueryResultRows } from "../../../lib/dataLake/runAthenaSelect";

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

function escapeSqlString(s) {
  return String(s).replace(/'/g, "''");
}

function escapeLike(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
}

/**
 * Build Athena WHERE clause from already-normalized filter predicates.
 * Matches the filter->SQL behavior used by `runAthenaSelect`.
 */
function buildComposeWhereSql({ filters, caseSensitive, baseAlias = null }) {
  if (!filters) return "";
  const andPreds = Array.isArray(filters.and) ? filters.and : [];
  const orPreds = Array.isArray(filters.or) ? filters.or : [];
  const mergeAndPreds = Array.isArray(filters.mergeAnd) ? filters.mergeAnd : [];
  const mergeOrBranchPreds = Array.isArray(filters.mergeOrBranch) ? filters.mergeOrBranch : [];

  const predicateToSql = (p) => {
    const colSql = baseAlias ? `${baseAlias}."${p.column}"` : `"${p.column}"`;

    if (p.op === "in" || p.op === "not_in") {
      const opSql = p.op === "in" ? "IN" : "NOT IN";
      if (p.kind === "number") {
        const values = Array.isArray(p.value) ? p.value : [];
        if (!values.length) return "TRUE";
        const list = values
          .map((v) => Number(v))
          .map((n) => (Number.isFinite(n) ? String(n) : "NULL"))
          .join(", ");
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

      // date IN/NOT IN not supported
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
      return `${colMaybeLower} ${opSql} ${litMaybeLower} ESCAPE '\\\\'`;
    }

    const litMaybeLower = caseSensitive ? `'${escapeSqlString(p.value)}'` : `LOWER('${escapeSqlString(p.value)}')`;
    const opSql = p.op === "eq" ? "=" : "!=";
    return `${colMaybeLower} ${opSql} ${litMaybeLower}`;
  };

  const andExpr = andPreds.length ? andPreds.map(predicateToSql).join(" AND ") : null;
  const orExpr = orPreds.length ? orPreds.map(predicateToSql).join(" OR ") : null;
  const baseExpr = andExpr && orExpr ? `(${andExpr}) AND (${orExpr})` : andExpr ? `(${andExpr})` : orExpr ? `(${orExpr})` : "TRUE";

  if (mergeAndPreds.length > 0 || mergeOrBranchPreds.length > 0) {
    const baseWithAnd =
      mergeAndPreds.length > 0
        ? `((${baseExpr}) AND (${mergeAndPreds.map(predicateToSql).join(" AND ")}))`
        : `(${baseExpr})`;
    if (mergeOrBranchPreds.length > 0) {
      return ` WHERE ${baseWithAnd} OR (${mergeOrBranchPreds.map(predicateToSql).join(" OR ")})`;
    }
    return ` WHERE ${baseWithAnd}`;
  }

  if (andPreds.length > 0 || orPreds.length > 0) {
    return ` WHERE ${baseExpr}`;
  }

  return "";
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
  const composeRowCap = demo ? ATHENA_DEMO_ROW_LIMIT : COMPOSE_UNCONSTRAINED_ROW_CAP;
  if (!joins.length) {
    return res.status(400).json({ error: "Missing joins", code: "BAD_REQUEST" });
  }

  const MAX_WAIT_MS = Math.min(
    Math.max(5000, parseInt(process.env.DATA_LAKE_ATHENA_MAX_WAIT_MS || "45000", 10) || 45000),
    120000,
  );

  try {
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

      const validated = validateAthenaLakeQueryBody({
        lake: prov.lake,
        table: prov.table,
        queryType: "compose",
        compose: sheetCompose,
        filters: prov.composeFilters && typeof prov.composeFilters === "object" ? prov.composeFilters : null,
        caseSensitive: true,
        demo,
      });

      const whereSql = buildComposeWhereSql({
        filters: validated.filters,
        caseSensitive: validated.caseSensitive,
        baseAlias: "t0",
      });

      const cteSql = buildComposeAthenaSelectSql({
        physicalTableName: validated.physical,
        limit: null,
        compose: validated.compose,
        lake: validated.lake,
        whereSql,
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

    const validatedMain = validateAthenaLakeQueryBody({
      lake,
      table,
      queryType: "compose",
      compose: mainCompose,
      filters: filtersIn,
      caseSensitive: true,
      demo,
    });

    const mainWhereSql = buildComposeWhereSql({
      filters: validatedMain.filters,
      caseSensitive: validatedMain.caseSensitive,
      baseAlias: "t0",
    });

    const mainSql = buildComposeAthenaSelectSql({
      physicalTableName: validatedMain.physical,
      limit: composeRowCap,
      compose: validatedMain.compose,
      lake: validatedMain.lake,
      whereSql: mainWhereSql,
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

