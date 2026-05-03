/**
 * Browser → POST start → poll GET status until SUCCEEDED (serverless-friendly).
 * @param {{
 *   lake: "polymarket" | "kalshi";
 *   table: string;
 *   limit?: number;
 *   columns?: string[] | null;
 *   queryType?: "select" | "count" | "sum" | "compose";
 *   compose?: object | null;
 *   countAlias?: string | null;
 *   countDistinctColumn?: string | null;
 *   sumColumn?: string | null;
 *   sumAlias?: string | null;
 * }} opts
 * @param {{ signal?: AbortSignal; pollIntervalMs?: number; maxWaitMs?: number }} [pollOpts]
 * @returns {Promise<{ columns: string[]; rows: string[][]; rowCount: number; dataScannedBytes: number | null; queryExecutionId: string; sql?: string }>}
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

export async function fetchAthenaLakeSample(
  {
    lake,
    table,
    limit = 100,
    columns = null,
    queryType = "select",
    countAlias = null,
    countDistinctColumn = null,
    sumColumn = null,
    sumAlias = null,
    compose = null,
    filters = null,
    caseSensitive = false,
    demo = false,
  },
  pollOpts = {},
) {
  const { signal, pollIntervalMs = 900, maxWaitMs = 180000 } = pollOpts;

  const isCompose = queryType === "compose";
  const lim = isCompose ? null : Math.min(500000, Math.max(1, Number(limit) || 100));

  const startRes = await fetch("/api/data-lake/athena-query/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    signal,
    body: JSON.stringify({
      lake,
      table,
      ...(isCompose ? {} : { limit: lim }),
      columns: Array.isArray(columns) && columns.length ? columns : null,
      queryType,
      countAlias,
      countDistinctColumn,
      sumColumn,
      sumAlias,
      compose: isCompose && compose && typeof compose === "object" ? compose : undefined,
      filters,
      caseSensitive,
      demo: demo === true,
    }),
  });

  let startJson = {};
  try {
    startJson = await startRes.json();
  } catch {
    /* ignore */
  }

  if (!startRes.ok) {
    throw new Error(startJson.error || startRes.statusText || `Athena start ${startRes.status}`);
  }

  const queryExecutionId = startJson.queryExecutionId;
  /** null = paginate entire Athena result (compose queries; no SQL LIMIT). */
  const rowLimit = isCompose ? (startJson.rowLimit ?? null) : startJson.rowLimit != null ? startJson.rowLimit : lim;
  if (!queryExecutionId) {
    throw new Error("Athena start response missing queryExecutionId");
  }

  const deadline = Date.now() + maxWaitMs;
  const q = new URLSearchParams({ queryExecutionId });
  if (rowLimit == null) {
    q.set("limit", "all");
  } else {
    q.set("limit", String(rowLimit));
  }

  while (Date.now() < deadline) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const stRes = await fetch(`/api/data-lake/athena-query/status?${q.toString()}`, {
      method: "GET",
      credentials: "same-origin",
      signal,
    });

    let j = {};
    try {
      j = await stRes.json();
    } catch {
      /* ignore */
    }

    if (stRes.status === 502 && j.code === "ATHENA_FAILED") {
      throw new Error(j.error || "Athena query failed");
    }

    if (!stRes.ok && stRes.status !== 502) {
      throw new Error(j.error || stRes.statusText || `Athena status ${stRes.status}`);
    }

    if (j.state === "SUCCEEDED" && Array.isArray(j.columns)) {
      return {
        columns: j.columns || [],
        rows: j.rows || [],
        rowCount: j.rowCount ?? (j.rows?.length ?? 0),
        dataScannedBytes: j.dataScannedBytes ?? null,
        queryExecutionId,
        sql: startJson.sql || undefined,
      };
    }

    if (j.state === "FAILED" || j.state === "CANCELLED") {
      throw new Error(j.error || `Athena ${j.state}`);
    }

    await sleep(pollIntervalMs, signal);
  }

  throw new Error("Timed out waiting for Athena (increase maxWaitMs or check query in console)");
}
