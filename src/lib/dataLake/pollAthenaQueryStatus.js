/**
 * Poll GET /api/data-lake/athena-query/status until SUCCEEDED (shared by compose pulls + replay).
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
  const { signal, pollIntervalMs = 900, maxWaitMs = 180000 } = opts;
  const qeid = String(queryExecutionId || "").trim();
  if (!qeid) throw new Error("Missing queryExecutionId");

  const q = new URLSearchParams({ queryExecutionId: qeid });
  if (rowLimit == null) {
    q.set("limit", "all");
  } else {
    q.set("limit", String(Math.max(1, Math.floor(Number(rowLimit) || 1))));
  }

  const deadline = Date.now() + maxWaitMs;
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const stRes = await fetch(`/api/data-lake/athena-query/status?${q.toString()}`, {
      method: "GET",
      credentials: "same-origin",
      signal,
    });

    let j = {};
    try {
      j = await stRes.json();
    } catch (parseErr) {
      const hint = stRes.status === 200 ? " Response may be too large for the browser to parse." : "";
      throw new Error(
        `Failed to read Athena status JSON (${stRes.status}): ${parseErr?.message || parseErr}${hint}`,
      );
    }

    if (stRes.status === 502 && j.code === "ATHENA_FAILED") {
      throw new Error(j.error || "Athena query failed");
    }
    if (!stRes.ok && stRes.status !== 502) {
      throw new Error(j.error || stRes.statusText || `Athena status ${stRes.status}`);
    }

    if (j.state === "SUCCEEDED" && Array.isArray(j.columns)) {
      const rows = j.rows || [];
      const rowCount = j.rowCount ?? rows.length;
      if (rowCount > 0 && rows.length === 0) {
        throw new Error(
          "Athena reported rows but the download was empty (response may be truncated).",
        );
      }
      return {
        columns: j.columns || [],
        rows,
        rowCount,
        dataScannedBytes: j.dataScannedBytes ?? null,
        queryExecutionId: qeid,
        truncated: !!j.truncated,
      };
    }

    if (j.state === "FAILED" || j.state === "CANCELLED") {
      throw new Error(j.error || `Athena ${j.state}`);
    }

    await sleep(pollIntervalMs, signal);
  }

  throw new Error("Timed out waiting for Athena");
}
