/**
 * Poll GET /api/data-lake/athena-query/status until SUCCEEDED (shared by compose pulls + replay).
 * Status-only polls while Athena runs; one bulk row download when complete (server paginates AWS internally).
 */

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
 * @param {{ signal?: AbortSignal; pollIntervalMs?: number; maxWaitMs?: number }} [opts]
 */
export async function pollAthenaQueryUntilDone(queryExecutionId, rowLimit, opts = {}) {
  const { signal, pollIntervalMs = 900, maxWaitMs = 600000 } = opts;
  const qeid = String(queryExecutionId || "").trim();
  if (!qeid) throw new Error("Missing queryExecutionId");

  const pollQ = new URLSearchParams({ queryExecutionId: qeid, includeRows: "0" });
  if (rowLimit == null) {
    pollQ.set("limit", "all");
  } else {
    pollQ.set("limit", String(Math.max(1, Math.floor(Number(rowLimit) || 1))));
  }

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

  const fetchQ = new URLSearchParams({ queryExecutionId: qeid, includeRows: "1" });
  if (rowLimit == null) {
    fetchQ.set("limit", "all");
  } else {
    fetchQ.set("limit", String(Math.max(1, Math.floor(Number(rowLimit) || 1))));
  }

  const fetchRes = await fetch(`/api/data-lake/athena-query/status?${fetchQ.toString()}`, {
    method: "GET",
    credentials: "same-origin",
    signal,
  });

  let result = {};
  try {
    result = await fetchRes.json();
  } catch (parseErr) {
    const hint = fetchRes.status === 200 ? " Response may be too large for the browser to parse." : "";
    throw new Error(
      `Failed to read Athena result JSON (${fetchRes.status}): ${parseErr?.message || parseErr}${hint}`,
    );
  }

  if (fetchRes.status === 502 && result.code === "ATHENA_FAILED") {
    throw new Error(result.error || "Athena query failed");
  }
  if (!fetchRes.ok) {
    throw new Error(result.error || fetchRes.statusText || `Athena result ${fetchRes.status}`);
  }

  const rows = Array.isArray(result.rows) ? result.rows : [];
  const rowCount = result.rowCount ?? rows.length;
  if (rowCount > 0 && rows.length === 0) {
    throw new Error(
      "Athena reported rows but the download was empty (response may be truncated).",
    );
  }

  return {
    columns: result.columns || [],
    rows,
    rowCount,
    dataScannedBytes: result.dataScannedBytes ?? dataScannedBytes,
    queryExecutionId: qeid,
    truncated: !!result.truncated,
  };
}
