import { ATHENA_STATUS_PAGE_FETCH_THRESHOLD, ATHENA_SUBSCRIBER_QUERY_ROW_LIMIT } from "@/config/dataLakeParquetSamples";

/**
 * Browser → POST start → poll GET status until SUCCEEDED (serverless-friendly).
 * For `queryType: "compose"`, omit `limit` to use the server tier cap; pass a positive integer to add SQL LIMIT.
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
 * @param {{ signal?: AbortSignal; pollIntervalMs?: number; maxWaitMs?: number; onProgress?: (info: { phase: string; fraction?: number; rowsDownloaded?: number }) => void }} [pollOpts]
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
    limit,
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
  const { signal, pollIntervalMs = 900, maxWaitMs = 180000, onProgress } = pollOpts;

  const isCompose = queryType === "compose";
  let lim;
  if (isCompose) {
    if (limit != null && limit !== "" && Number.isFinite(Number(limit))) {
      lim = Math.min(500000, Math.max(1, Math.floor(Number(limit))));
    }
  } else {
    lim = Math.min(500000, Math.max(1, Number(limit ?? 100) || 100));
  }

  const startRes = await fetch("/api/data-lake/athena-query/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    signal,
    body: JSON.stringify({
      lake,
      table,
      ...(isCompose ? (lim != null ? { limit: lim } : {}) : { limit: lim }),
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
  const usePaginatedDownload =
    rowLimit == null || Number(rowLimit) > ATHENA_STATUS_PAGE_FETCH_THRESHOLD;

  const pollParams = () => {
    const q = new URLSearchParams({ queryExecutionId });
    if (rowLimit == null) {
      q.set("limit", "all");
    } else {
      q.set("limit", String(rowLimit));
    }
    return q;
  };

  while (Date.now() < deadline) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const stRes = await fetch(`/api/data-lake/athena-query/status?${pollParams().toString()}`, {
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

    if (j.state === "SUCCEEDED") {
      if (usePaginatedDownload || j.paginate === true) {
        return await fetchAthenaResultPaginated({
          queryExecutionId,
          rowLimit,
          signal,
          deadline,
          onProgress,
          sql: startJson.sql || undefined,
          initialDataScannedBytes: j.dataScannedBytes ?? null,
        });
      }
      if (Array.isArray(j.columns)) {
        onProgress?.({ phase: "download", fraction: 1, rowsDownloaded: j.rows?.length ?? 0 });
        return {
          columns: j.columns || [],
          rows: j.rows || [],
          rowCount: j.rowCount ?? (j.rows?.length ?? 0),
          dataScannedBytes: j.dataScannedBytes ?? null,
          queryExecutionId,
          sql: startJson.sql || undefined,
        };
      }
    }

    if (j.state === "FAILED" || j.state === "CANCELLED") {
      throw new Error(j.error || `Athena ${j.state}`);
    }

    onProgress?.({ phase: "athena", fraction: 0.05 });
    await sleep(pollIntervalMs, signal);
  }

  throw new Error("Timed out waiting for Athena (increase maxWaitMs or check query in console)");
}

/**
 * Download Athena results in 1k-row pages (smaller JSON payloads, real progress).
 */
async function fetchAthenaResultPaginated({
  queryExecutionId,
  rowLimit,
  signal,
  deadline,
  onProgress,
  sql,
  initialDataScannedBytes,
}) {
  const cap =
    rowLimit == null
      ? ATHENA_SUBSCRIBER_QUERY_ROW_LIMIT
      : Math.min(ATHENA_SUBSCRIBER_QUERY_ROW_LIMIT, Math.max(1, Number(rowLimit)));

  /** @type {string[]} */
  let columns = [];
  /** @type {string[][]} */
  const allRows = [];
  let nextToken = null;
  let dataScannedBytes = initialDataScannedBytes ?? null;

  while (Date.now() < deadline) {
    if (signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    const q = new URLSearchParams({
      queryExecutionId,
      rowsMode: "page",
      limit: "all",
    });
    if (nextToken) q.set("nextToken", nextToken);

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

    if (!stRes.ok) {
      throw new Error(j.error || stRes.statusText || `Athena page ${stRes.status}`);
    }

    if (j.state !== "SUCCEEDED") {
      throw new Error(j.error || `Athena page unexpected state: ${j.state}`);
    }

    if (j.isFirstPage && Array.isArray(j.columns) && j.columns.length) {
      columns = j.columns;
    }
    const pageRows = Array.isArray(j.rows) ? j.rows : [];
    for (const row of pageRows) {
      if (allRows.length >= cap) break;
      allRows.push(row);
    }

    dataScannedBytes = j.dataScannedBytes ?? dataScannedBytes;
    nextToken = j.nextToken || null;

    onProgress?.({
      phase: "download",
      rowsDownloaded: allRows.length,
      fraction: nextToken ? Math.min(0.85, 0.15 + (allRows.length / cap) * 0.7) : 0.9,
    });

    if (allRows.length >= cap || !nextToken) break;
  }

  if (!columns.length && allRows.length === 0) {
    throw new Error("Athena returned no rows.");
  }

  return {
    columns,
    rows: allRows,
    rowCount: allRows.length,
    dataScannedBytes,
    queryExecutionId,
    sql,
    truncated: allRows.length >= cap,
  };
}
