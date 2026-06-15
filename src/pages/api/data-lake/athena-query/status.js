/**
 * Athena execution state; when SUCCEEDED, returns result rows (paginated or bulk).
 *
 * GET ?queryExecutionId=…&limit=…&includeRows=0|1|page
 *   includeRows=0   — state only (fast poll while query runs)
 *   includeRows=1   — fetch all rows in one response (small pulls only; may hit 4MB API cap)
 *   includeRows=page  — one Athena page per request (use athenaPageToken to continue)
 *   athenaPageToken — continuation token from prior page response (includeRows=page only)
 *   limit           — row cap (default 100), or "all" for full result
 */
import {
  getAthenaQueryState,
  fetchAthenaQueryResultRows,
  fetchAthenaQueryResultNextPage,
} from "../../../../lib/dataLake/runAthenaSelect";

/** Athena returns UUID-style ids (36 chars with hyphens). */
const ID_RE = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;

/** Large joined pulls exceed the default 4MB Next.js API response cap when sent in one blob. */
export const config = {
  api: {
    responseLimit: false,
  },
};

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
  const limNorm = String(limStr ?? "").trim().toLowerCase();
  const rowLimit =
    limNorm === "all" || limNorm === "full"
      ? null
      : Math.min(500000, Math.max(1, parseInt(String(limStr || "100"), 10) || 100));

  const rawIncludeRows = req.query.includeRows;
  const includeRowsStr = String(
    Array.isArray(rawIncludeRows) ? rawIncludeRows[0] : rawIncludeRows ?? "1",
  ).trim();
  const includeRowsMode = includeRowsStr.toLowerCase();
  const includeRows =
    includeRowsMode !== "0" && includeRowsMode !== "false" && includeRowsMode !== "page";
  const includeRowsPage = includeRowsMode === "page";

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

    if (!includeRows && !includeRowsPage) {
      return res.status(200).json({
        state: "SUCCEEDED",
        queryExecutionId: qeid,
        dataScannedBytes,
      });
    }

    if (includeRowsPage) {
      const rawToken = req.query.athenaPageToken;
      const tokenRaw = Array.isArray(rawToken) ? rawToken[0] : rawToken;
      const athenaPageToken = tokenRaw ? String(tokenRaw).trim() : undefined;

      const page = await fetchAthenaQueryResultNextPage(qeid, athenaPageToken);

      return res.status(200).json({
        state: "SUCCEEDED",
        queryExecutionId: qeid,
        dataScannedBytes,
        columns: page.columns,
        rows: page.rows,
        pageRowCount: page.rows.length,
        athenaNextToken: page.athenaNextToken || null,
        hasMore: !!page.athenaNextToken,
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
