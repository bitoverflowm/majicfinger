/**
 * Single poll: Athena execution state; when SUCCEEDED, returns result rows (capped).
 *
 * GET ?queryExecutionId=…&limit=…
 *   limit — row cap for GetQueryResults pagination (default 100), or "all" to paginate entire result
 */
import { ATHENA_STATUS_PAGE_FETCH_THRESHOLD } from "@/config/dataLakeParquetSamples";
import {
  getAthenaQueryState,
  fetchAthenaQueryResultRows,
  fetchAthenaQueryResultPage,
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
  const limNorm = String(limStr ?? "").trim().toLowerCase();
  const rowLimit =
    limNorm === "all" || limNorm === "full"
      ? null
      : Math.min(500000, Math.max(1, parseInt(String(limStr || "100"), 10) || 100));

  const rawRowsMode = req.query.rowsMode;
  const rowsMode = String(Array.isArray(rawRowsMode) ? rawRowsMode[0] : rawRowsMode || "")
    .trim()
    .toLowerCase();
  const paginated = rowsMode === "page";
  const rawPageToken = req.query.nextToken;
  const pageToken = String(Array.isArray(rawPageToken) ? rawPageToken[0] : rawPageToken || "").trim() || null;

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

    if (paginated) {
      const page = await fetchAthenaQueryResultPage(qeid, pageToken);
      return res.status(200).json({
        state: "SUCCEEDED",
        queryExecutionId: qeid,
        dataScannedBytes,
        columns: page.columns,
        rows: page.rows,
        rowCount: page.rows.length,
        nextToken: page.nextToken,
        isFirstPage: page.isFirstPage,
        rowsMode: "page",
      });
    }

    /** Large pulls: avoid materializing the full result in one response (client uses rowsMode=page). */
    const deferFullFetch = rowLimit == null || rowLimit > ATHENA_STATUS_PAGE_FETCH_THRESHOLD;
    if (deferFullFetch) {
      return res.status(200).json({
        state: "SUCCEEDED",
        queryExecutionId: qeid,
        dataScannedBytes,
        paginate: true,
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
