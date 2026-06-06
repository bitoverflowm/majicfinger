/**
 * Paginated Athena result rows (after query SUCCEEDED).
 * GET ?queryExecutionId=…&nextToken=…&limit=…
 */
import {
  ATHENA_RESULT_PAGE_ROW_CAP,
  fetchAthenaQueryResultsPage,
  getAthenaQueryState,
} from "@/lib/dataLake/runAthenaSelect";

const ID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed", code: "METHOD" });
  }

  const rawId = req.query.queryExecutionId;
  const qeid = String(Array.isArray(rawId) ? rawId[0] : rawId || "").trim();
  if (!qeid || !ID_RE.test(qeid)) {
    return res.status(400).json({
      error: "Missing or invalid queryExecutionId (UUID)",
      code: "BAD_REQUEST",
    });
  }

  const rawToken = req.query.nextToken;
  const nextToken = Array.isArray(rawToken) ? rawToken[0] : rawToken;
  const rawLim = req.query.limit;
  const limStr = Array.isArray(rawLim) ? rawLim[0] : rawLim;
  const limit = Math.min(
    ATHENA_RESULT_PAGE_ROW_CAP,
    Math.max(1, parseInt(String(limStr || ATHENA_RESULT_PAGE_ROW_CAP), 10) || ATHENA_RESULT_PAGE_ROW_CAP),
  );

  try {
    const { state, reason } = await getAthenaQueryState(qeid);
    if (state === "QUEUED" || state === "RUNNING") {
      return res.status(409).json({
        error: "Query still running",
        code: "NOT_READY",
        state,
        queryExecutionId: qeid,
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
      return res.status(409).json({
        error: `Unexpected Athena state: ${state}`,
        code: "NOT_READY",
        state,
        queryExecutionId: qeid,
      });
    }

    const page = await fetchAthenaQueryResultsPage(qeid, {
      nextToken: nextToken ? String(nextToken) : null,
      maxRows: limit,
    });

    return res.status(200).json({
      state: "SUCCEEDED",
      queryExecutionId: qeid,
      columns: page.columns,
      rows: page.rows,
      rowCount: page.rowCount,
      nextToken: page.nextToken,
    });
  } catch (e) {
    const msg = e?.message || String(e);
    if (/InvalidRequestException|not found|does not exist/i.test(msg)) {
      return res.status(404).json({ error: msg, code: "NOT_FOUND" });
    }
    return res.status(500).json({ error: msg, code: "INTERNAL" });
  }
}
