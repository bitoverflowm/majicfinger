/**
 * Poll GET /api/data-lake/athena-query/status until SUCCEEDED (shared by compose pulls + replay).
 * Status-only polls while Athena runs; paginated row download when complete (stays under API size caps).
 */

import { yieldToUi } from "@/lib/dataLake/largeAthenaPull";

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const t = setTimeout(resolve, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * @typedef {"polling" | "athena_succeeded" | "downloading" | "downloading_page" | "parsing_response" | "download_complete"} AthenaPollPhase
 */

/**
 * @param {string} queryExecutionId
 * @param {number | null} rowLimit — null fetches full result (`limit=all`)
 * @param {{
 *   signal?: AbortSignal;
 *   pollIntervalMs?: number;
 *   maxWaitMs?: number;
 *   onPhase?: (info: {
 *     phase: AthenaPollPhase;
 *     rowLimit?: number | null;
 *     dataScannedBytes?: number | null;
 *     rowCount?: number;
 *     processed?: number;
 *     total?: number | null;
 *     columns?: string[];
 *     accumulatedRows?: string[][];
 *   }) => void;
 * }} [opts]
 */
export async function pollAthenaQueryUntilDone(queryExecutionId, rowLimit, opts = {}) {
  const { signal, pollIntervalMs = 900, maxWaitMs = 600000, onPhase } = opts;
  const qeid = String(queryExecutionId || "").trim();
  if (!qeid) throw new Error("Missing queryExecutionId");

  const pollQ = new URLSearchParams({ queryExecutionId: qeid, includeRows: "0" });
  if (rowLimit == null) {
    pollQ.set("limit", "all");
  } else {
    pollQ.set("limit", String(Math.max(1, Math.floor(Number(rowLimit) || 1))));
  }

  onPhase?.({ phase: "polling", rowLimit: rowLimit ?? null });

  const deadline = Date.now() + maxWaitMs;
  let dataScannedBytes = null;
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const stRes = await fetch(`/api/data-lake/athena-query/status?${pollQ.toString()}`, {
      method: "GET",
      credentials: "same-origin",
      signal,
    });

    let j = {};
    try {
      j = await stRes.json();
    } catch (parseErr) {
      throw new Error(
        `Failed to read Athena status JSON (${stRes.status}): ${parseErr?.message || parseErr}`,
      );
    }

    if (stRes.status === 502 && j.code === "ATHENA_FAILED") {
      throw new Error(j.error || "Athena query failed");
    }
    if (!stRes.ok && stRes.status !== 502) {
      throw new Error(j.error || stRes.statusText || `Athena status ${stRes.status}`);
    }

    if (j.state === "SUCCEEDED") {
      dataScannedBytes = j.dataScannedBytes ?? dataScannedBytes;
      onPhase?.({
        phase: "athena_succeeded",
        rowLimit: rowLimit ?? null,
        dataScannedBytes,
      });
      await yieldToUi();
      break;
    }

    if (j.state === "FAILED" || j.state === "CANCELLED") {
      throw new Error(j.error || `Athena ${j.state}`);
    }

    if (j.dataScannedBytes != null) dataScannedBytes = j.dataScannedBytes;
    await sleep(pollIntervalMs, signal);
  }

  if (Date.now() >= deadline) {
    throw new Error("Timed out waiting for Athena");
  }

  onPhase?.({ phase: "downloading", rowLimit: rowLimit ?? null });
  await yieldToUi();

  const totalCap =
    rowLimit == null ? null : Math.max(1, Math.floor(Number(rowLimit) || 1));
  const allRows = [];
  let columns = [];
  let athenaPageToken = null;
  let truncated = false;

  while (true) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const pageQ = new URLSearchParams({
      queryExecutionId: qeid,
      includeRows: "page",
    });
    if (athenaPageToken) pageQ.set("athenaPageToken", athenaPageToken);

    const pageRes = await fetch(`/api/data-lake/athena-query/status?${pageQ.toString()}`, {
      method: "GET",
      credentials: "same-origin",
      signal,
    });

    let pageJson = {};
    try {
      pageJson = await pageRes.json();
    } catch (parseErr) {
      throw new Error(
        `Failed to read Athena page JSON (${pageRes.status}): ${parseErr?.message || parseErr}`,
      );
    }

    if (pageRes.status === 502 && pageJson.code === "ATHENA_FAILED") {
      throw new Error(pageJson.error || "Athena query failed");
    }
    if (!pageRes.ok) {
      throw new Error(pageJson.error || pageRes.statusText || `Athena page ${pageRes.status}`);
    }

    if (!columns.length && Array.isArray(pageJson.columns) && pageJson.columns.length) {
      columns = pageJson.columns;
    }

    const chunk = Array.isArray(pageJson.rows) ? pageJson.rows : [];
    if (totalCap != null) {
      const remaining = totalCap - allRows.length;
      if (remaining <= 0) {
        truncated = true;
        break;
      }
      if (chunk.length > remaining) {
        allRows.push(...chunk.slice(0, remaining));
        truncated = true;
        break;
      }
    }
    allRows.push(...chunk);

    const processed = allRows.length;
    onPhase?.({
      phase: "downloading_page",
      rowLimit: rowLimit ?? null,
      processed,
      total: totalCap,
      columns,
      accumulatedRows: allRows,
    });
    await yieldToUi();

    if (!pageJson.hasMore || !pageJson.athenaNextToken) break;
    if (totalCap != null && allRows.length >= totalCap) {
      truncated = true;
      break;
    }

    athenaPageToken = pageJson.athenaNextToken;
  }

  onPhase?.({
    phase: "download_complete",
    rowLimit: rowLimit ?? null,
    rowCount: allRows.length,
  });
  await yieldToUi();

  return {
    columns,
    rows: allRows,
    rowCount: allRows.length,
    dataScannedBytes,
    queryExecutionId: qeid,
    truncated,
  };
}
