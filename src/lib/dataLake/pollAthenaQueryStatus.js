/**
 * Poll GET /api/data-lake/athena-query/status until SUCCEEDED (shared by compose pulls + replay).
 * Large results are downloaded in pages via /api/data-lake/athena-query/rows.
 */
import { sortRowsChronologicallyByDetectedBucketColumn } from "@/lib/dataLake/sortAthenaDateBuckets";

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
 * @param {string} queryExecutionId
 * @param {number | null} rowLimit — null fetches full result (`limit=all`)
 * @param {{ signal?: AbortSignal; pollIntervalMs?: number; maxWaitMs?: number; pageRowLimit?: number }} [opts]
 */
export async function pollAthenaQueryUntilDone(queryExecutionId, rowLimit, opts = {}) {
  const { signal, pollIntervalMs = 900, maxWaitMs = 600000, pageRowLimit = 4000 } = opts;
  const qeid = String(queryExecutionId || "").trim();
  if (!qeid) throw new Error("Missing queryExecutionId");

  const statusQ = new URLSearchParams({ queryExecutionId: qeid, includeRows: "0" });
  if (rowLimit == null) {
    statusQ.set("limit", "all");
  } else {
    statusQ.set("limit", String(Math.max(1, Math.floor(Number(rowLimit) || 1))));
  }

  const deadline = Date.now() + maxWaitMs;
  let dataScannedBytes = null;
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const stRes = await fetch(`/api/data-lake/athena-query/status?${statusQ.toString()}`, {
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

  const targetRows = rowLimit == null ? null : Math.max(1, Math.floor(Number(rowLimit) || 1));
  let columns = [];
  const allRows = [];
  let nextToken = null;

  do {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const rowsQ = new URLSearchParams({
      queryExecutionId: qeid,
      limit: String(Math.max(1, Math.floor(Number(pageRowLimit) || 4000))),
    });
    if (nextToken) rowsQ.set("nextToken", nextToken);

    const pageRes = await fetch(`/api/data-lake/athena-query/rows?${rowsQ.toString()}`, {
      method: "GET",
      credentials: "same-origin",
      signal,
    });

    let page = {};
    try {
      page = await pageRes.json();
    } catch (parseErr) {
      throw new Error(
        `Failed to read Athena rows JSON (${pageRes.status}): ${parseErr?.message || parseErr}`,
      );
    }

    if (pageRes.status === 409 && page.code === "NOT_READY") {
      await sleep(pollIntervalMs, signal);
      continue;
    }
    if (!pageRes.ok) {
      throw new Error(page.error || pageRes.statusText || `Athena rows ${pageRes.status}`);
    }

    if (Array.isArray(page.columns) && page.columns.length && !columns.length) {
      columns = page.columns;
    }
    const chunk = Array.isArray(page.rows) ? page.rows : [];
    for (const row of chunk) {
      if (targetRows != null && allRows.length >= targetRows) break;
      allRows.push(row);
    }
    nextToken = page.nextToken || null;
    if (targetRows != null && allRows.length >= targetRows) {
      nextToken = null;
    }
  } while (nextToken);

  const sorted = sortRowsChronologicallyByDetectedBucketColumn({
    columns,
    rows: allRows,
  });

  const rowCount = sorted.length;

  return {
    columns,
    rows: sorted,
    rowCount,
    dataScannedBytes,
    queryExecutionId: qeid,
    truncated: targetRows != null && rowCount >= targetRows,
  };
}
