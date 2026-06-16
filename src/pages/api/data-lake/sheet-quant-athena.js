/**
 * POST /api/data-lake/sheet-quant-athena
 * Run quant operations (relative position snapshots) on Athena via sheet CTE + trades join.
 */
import { getAthenaAccessFromRequest } from "@/lib/athenaAccess";
import { AthenaLakeRequestError, runSheetQuantAthena } from "@/lib/dataLake/sheetQuantAthenaCore";

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
  const join = body.join && typeof body.join === "object" ? body.join : null;
  const quant = body.quant && typeof body.quant === "object" ? body.quant : null;

  if (!sheetGraph || !rootSheetId || !sheetGraph[rootSheetId]) {
    return res.status(400).json({ error: "Missing sheetGraph/rootSheetId", code: "BAD_REQUEST" });
  }
  if (!join || !quant) {
    return res.status(400).json({ error: "Missing join or quant config", code: "BAD_REQUEST" });
  }

  const MAX_WAIT_MS = Math.min(
    Math.max(5000, parseInt(process.env.DATA_LAKE_ATHENA_MAX_WAIT_MS || "45000", 10) || 45000),
    120000,
  );

  try {
    const access = await getAthenaAccessFromRequest(req);
    const result = await runSheetQuantAthena({
      access,
      sheetGraph,
      rootSheetId,
      join,
      quant,
      maxWaitMs: MAX_WAIT_MS,
    });

    return res.status(200).json({
      columns: result.columns,
      rows: result.rows,
      rowCount: result.rowCount,
      queryExecutionId: result.queryExecutionId,
      dataScannedBytes: result.dataScannedBytes,
    });
  } catch (e) {
    if (e instanceof AthenaLakeRequestError) {
      return res.status(e.statusCode).json({ error: e.message, code: e.code });
    }
    const code = e?.code || "INTERNAL";
    if (code === "CONFIG") return res.status(503).json({ error: e.message, code: "CONFIG" });
    if (code === "BAD_REQUEST") return res.status(400).json({ error: e.message, code: "BAD_REQUEST" });
    if (code === "TIMEOUT") {
      return res.status(408).json({ error: e.message, code: "TIMEOUT", queryExecutionId: e.queryExecutionId });
    }
    if (code === "ATHENA_FAILED") {
      return res.status(502).json({ error: e.message, code: "ATHENA_FAILED", queryExecutionId: e.queryExecutionId });
    }
    return res.status(500).json({ error: e?.message || "Internal error", code: code || "INTERNAL" });
  }
}
