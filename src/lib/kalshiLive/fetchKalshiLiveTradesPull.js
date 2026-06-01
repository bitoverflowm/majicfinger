import {
  applyKalshiLiveClientSort,
  applyKalshiLiveClientWhere,
} from "@/lib/kalshiLive/kalshiLiveCompose";
import {
  normalizeKalshiLiveTrades,
  projectKalshiLiveTradeRows,
} from "@/lib/kalshiLive/normalizeTradeRow";
import {
  partitionTradesApiParams,
  summarizeKalshiLiveTradesRequest,
} from "@/lib/kalshiLive/tradeCompose";
import { parseKalshiLiveTradesTickerInput } from "@/lib/kalshiLive/tradesColumns";

/**
 * Paginated client fetch for Kalshi Live trades (via same-origin proxy).
 *
 * @param {{
 *   marketTicker: string;
 *   whereFilters?: import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveWhereFilter[];
 *   sortClauses?: import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveSortClause[];
 *   limit?: number;
 *   selectedColumns?: string[];
 *   signal?: AbortSignal;
 *   onPage?: (info: { page: number; rows: Record<string, unknown>[]; totalLoaded: number }) => void | Promise<void>;
 * }} opts
 */
export async function fetchKalshiLiveTradesPull(opts) {
  const ticker = parseKalshiLiveTradesTickerInput(opts.marketTicker);
  const whereFilters = Array.isArray(opts.whereFilters) ? opts.whereFilters : [];
  const sortClauses = Array.isArray(opts.sortClauses) ? opts.sortClauses : [];
  const { apiParams, clientWhere } = partitionTradesApiParams(whereFilters);
  const maxTotal = Math.max(1, Math.min(10_000, Math.floor(Number(opts.limit) || 100)));

  /** @type {Record<string, unknown>[]} */
  const all = [];
  let cursor = "";
  let page = 0;

  while (all.length < maxTotal) {
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const remaining = maxTotal - all.length;
    const pageLimit = Math.min(1000, remaining);

    const qs = new URLSearchParams({
      ticker,
      limit: String(pageLimit),
    });
    if (cursor) qs.set("cursor", cursor);
    if (Number.isFinite(Number(apiParams.min_ts))) {
      qs.set("min_ts", String(apiParams.min_ts));
    }
    if (Number.isFinite(Number(apiParams.max_ts))) {
      qs.set("max_ts", String(apiParams.max_ts));
    }

    const res = await fetch(
      `/api/integrations/kalshi-live/markets/trades?${qs.toString()}`,
      {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: opts.signal,
      },
    );
    const body = await res.json().catch(() => ({}));
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    if (!res.ok) {
      throw new Error(
        typeof body?.error === "string" ? body.error : res.statusText || "Trades request failed",
      );
    }

    const batch = normalizeKalshiLiveTrades(body?.trades);
    const slice = batch.slice(0, remaining);
    all.push(...slice);
    page += 1;
    cursor = String(body?.cursor || "").trim();

    await opts.onPage?.({ page, rows: slice, totalLoaded: all.length });

    if (all.length >= maxTotal) break;
    if (!cursor || batch.length === 0) break;
  }

  const filtered = applyKalshiLiveClientWhere(all, clientWhere);
  const sorted = applyKalshiLiveClientSort(filtered, sortClauses, "trades");
  const rows = projectKalshiLiveTradeRows(sorted, opts.selectedColumns);

  return {
    raw: sorted,
    rows,
    querySummary: summarizeKalshiLiveTradesRequest(ticker, apiParams, { limit: maxTotal }),
  };
}
