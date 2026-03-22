/**
 * Single poll: Athena execution state; when SUCCEEDED, returns result rows (capped).
 *
 * GET ?queryExecutionId=…&limit=…
 *   limit — row cap for GetQueryResults (should match start’s rowLimit; default 100, max 1000)
 */
import {
  getAthenaQueryState,
  fetchAthenaQueryResultRows,
} from "../../../../lib/dataLake/runAthenaSelect";

/** Athena returns UUID-style ids (36 chars with hyphens). */
const ID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed", code: "METHOD" });
  }

  const rawId = req.query.queryExecutionId;
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const qeid = String(id || "").trim();

  if (!qeid || !ID_RE.test(qeid)) {
    return res.status(400).json({
      error: "Missing or invalid queryExecutionId (UUID)",
      code: "BAD_REQUEST",
    });
  }

  const rawLim = req.query.limit;
  const limStr = Array.isArray(rawLim) ? rawLim[0] : rawLim;
  const rowLimit = Math.min(1000, Math.max(1, parseInt(String(limStr || "100"), 10) || 100));

  try {
    const { state, reason, dataScannedBytes } = await getAthenaQueryState(qeid);

    if (state === "QUEUED" || state === "RUNNING") {
      return res.status(200).json({
        state,
        queryExecutionId: qeid,
        dataScannedBytes,
      });
    }

    if (state === "FAILED" || state === "CANCELLED") {
      return res.status(502).json({
        error: reason || `Athena query ${state}`,
        code: "ATHENA_FAILED",
        state,
        queryExecutionId: qeid,
      });
    }

    if (state !== "SUCCEEDED") {
      return res.status(200).json({
        state,
        queryExecutionId: qeid,
        reason: reason || undefined,
        dataScannedBytes,
      });
    }

    const result = await fetchAthenaQueryResultRows(qeid, rowLimit);

    return res.status(200).json({
      state: "SUCCEEDED",
      queryExecutionId: qeid,
      dataScannedBytes,
      columns: result.columns,
      rows: result.rows,
      rowCount: result.rowCount,
      truncated: result.truncated,
    });
  } catch (e) {
    const msg = e?.message || String(e);
    if (/InvalidRequestException|not found|does not exist/i.test(msg)) {
      return res.status(404).json({ error: msg, code: "NOT_FOUND" });
    }
    return res.status(500).json({ error: msg, code: "INTERNAL" });
  }
}
