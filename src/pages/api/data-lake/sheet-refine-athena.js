/**
 * Run a bounded SELECT over the *full* Athena dataset by wrapping an existing sheet's
 * provenance as a CTE (no LIMIT on the CTE), then applying an outer SELECT + optional
 * numeric WHERE + LIMIT 100 on the final result.
 *
 * POST JSON:
 * {
 *   sheetGraph: { [sheetId]: { name: string, provenance: { kind: "compose", ... } } },
 *   rootSheetId: string,
 *   selectColumns: string[],
 *   refineFilters?: { and: Array<{ column: string, op: string, value: number }> }
 * }
 */
import AWS from "aws-sdk";
import { validateAthenaLakeQueryBody, AthenaLakeRequestError } from "../../../lib/dataLake/validateAthenaLakeRequest";
import { buildComposeAthenaSelectSql } from "../../../lib/dataLake/buildComposeAthenaSql";
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

function safeColumnName(s) {
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

function buildComposeWhereSql({ filters, caseSensitive, baseAlias = null }) {
  if (!filters) return "";
  const andPreds = Array.isArray(filters.and) ? filters.and : [];
  const orPreds = Array.isArray(filters.or) ? filters.or : [];
  const mergeAndPreds = Array.isArray(filters.mergeAnd) ? filters.mergeAnd : [];
  const mergeOrBranchPreds = Array.isArray(filters.mergeOrBranch) ? filters.mergeOrBranch : [];

  const escapeSqlString = (s) => String(s).replace(/'/g, "''");
  const escapeLike = (s) => String(s).replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");

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

function buildRefineOuterWhereSql(baseAlias, refineFilters) {
  const andPreds = Array.isArray(refineFilters?.and) ? refineFilters.and : [];
  if (!andPreds.length) return "";
  const parts = [];
  for (const p of andPreds) {
    const col = safeColumnName(p.column);
    if (!col) continue;
    const v = Number(p.value);
    if (!Number.isFinite(v)) continue;
    const csql = `${baseAlias}."${col}"`;
    const cast = `CAST(${csql} AS DOUBLE)`;
    const op = String(p.op || "eq").toLowerCase();
    if (op === "gte" || op === "ge") parts.push(`${cast} >= ${v}`);
    else if (op === "lte" || op === "le") parts.push(`${cast} <= ${v}`);
    else if (op === "gt") parts.push(`${cast} > ${v}`);
    else if (op === "lt") parts.push(`${cast} < ${v}`);
    else if (op === "eq") parts.push(`${cast} = ${v}`);
    else if (op === "neq" || op === "ne") parts.push(`${cast} <> ${v}`);
  }
  return parts.length ? ` WHERE ${parts.join(" AND ")}` : "";
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

  const sheetGraph = body.sheetGraph && typeof body.sheetGraph === "object" ? body.sheetGraph : null;
  const rootSheetId = String(body.rootSheetId || "").trim();
  const selectColumnsIn = Array.isArray(body.selectColumns) ? body.selectColumns : [];
  const refineFilters = body.refineFilters && typeof body.refineFilters === "object" ? body.refineFilters : { and: [] };

  if (!sheetGraph || !rootSheetId || !sheetGraph[rootSheetId]) {
    return res.status(400).json({ error: "Missing sheetGraph/rootSheetId", code: "BAD_REQUEST" });
  }

  const selectColumns = selectColumnsIn.map((c) => safeColumnName(String(c))).filter(Boolean);
  if (!selectColumns.length) {
    return res.status(400).json({ error: "selectColumns required", code: "BAD_REQUEST" });
  }

  const MAX_WAIT_MS = Math.min(
    Math.max(5000, parseInt(process.env.DATA_LAKE_ATHENA_MAX_WAIT_MS || "45000", 10) || 45000),
    120000,
  );

  try {
    const access = await getAthenaAccessFromRequest(req);
    const outerLimit = Math.max(1, Math.floor(access.maxSelectRows));

    const SAFE_ALIAS = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
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
        },
        access,
      );

      if (sheetId === rootSheetId) {
        rootDatabase = validated.database;
      }

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

    await buildSheetCte(rootSheetId);

    const rootEntry = sheetGraph[rootSheetId];
    const rootCteName = safeIdentifier(rootEntry?.name);
    if (!rootCteName) {
      return res.status(400).json({ error: "Invalid root CTE name", code: "BAD_REQUEST" });
    }

    const cteDefsSql = cteDefsInOrder.map((id) => `${safeIdentifier(sheetGraph[id]?.name)} AS (${cteSqlById.get(id).cteSql})`);

    const selectList = selectColumns.map((c) => `"${c}"`).join(", ");
    const outerWhere = buildRefineOuterWhereSql(rootCteName, refineFilters);
    const fullSql = `WITH ${cteDefsSql.join(", ")} SELECT ${selectList} FROM ${rootCteName}${outerWhere} LIMIT ${outerLimit}`;

    if (!String(rootDatabase || "").trim()) {
      return res.status(400).json({ error: "Could not resolve Athena database for root sheet", code: "BAD_REQUEST" });
    }

    const { columns, rows, rowCount, queryExecutionId, dataScannedBytes } = await executeAthenaSql({
      database: rootDatabase,
      sql: fullSql,
      maxWaitMs: MAX_WAIT_MS,
    });

    return res.status(200).json({
      columns,
      rows,
      rowCount,
      queryExecutionId,
      dataScannedBytes,
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
