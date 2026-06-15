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
 * @param {{ signal?: AbortSignal; pollIntervalMs?: number; maxWaitMs?: number }} [pollOpts]
 * @returns {Promise<{ columns: string[]; rows: string[][]; rowCount: number; dataScannedBytes: number | null; queryExecutionId: string; sql?: string }>}
 */
import { pollAthenaQueryUntilDone } from "@/lib/dataLake/pollAthenaQueryStatus";

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
  const { signal, pollIntervalMs = 900, maxWaitMs = 180000 } = pollOpts;

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

  const result = await pollAthenaQueryUntilDone(queryExecutionId, rowLimit, {
    signal,
    pollIntervalMs,
    maxWaitMs,
  });

  return {
    ...result,
    sql: startJson.sql || undefined,
    primaryJoinExpanded: startJson.primaryJoinExpanded === true,
    expandedJoinRowCap: startJson.expandedJoinRowCap ?? null,
  };
}
