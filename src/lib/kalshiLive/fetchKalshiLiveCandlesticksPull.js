import {
  partitionCandlestickApiParams,
  summarizeKalshiLiveCandlestickRequest,
} from "@/lib/kalshiLive/candlestickCompose";
import { parseKalshiLiveMarketTickersInput } from "@/lib/kalshiLive/candlesticksColumns";
import {
  applyKalshiLiveClientSort,
  applyKalshiLiveClientWhere,
} from "@/lib/kalshiLive/kalshiLiveCompose";
import {
  flattenKalshiLiveCandlestickGroups,
  projectKalshiLiveCandlestickRows,
} from "@/lib/kalshiLive/normalizeCandlestickRow";

/**
 * @param {{
 *   marketTickers: string;
 *   whereFilters?: import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveWhereFilter[];
 *   sortClauses?: import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveSortClause[];
 *   limit?: number;
 *   selectedColumns?: string[];
 *   seriesTicker?: string;
 *   signal?: AbortSignal;
 * }} opts
 */
export async function fetchKalshiLiveCandlesticksPull(opts) {
  const tickers = parseKalshiLiveMarketTickersInput(opts.marketTickers);
  const whereFilters = Array.isArray(opts.whereFilters) ? opts.whereFilters : [];
  const sortClauses = Array.isArray(opts.sortClauses) ? opts.sortClauses : [];
  const { apiParams, clientWhere } = partitionCandlestickApiParams(whereFilters);

  if (opts.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const qs = new URLSearchParams({
    market_tickers: tickers.join(","),
    start_ts: String(apiParams.start_ts),
    end_ts: String(apiParams.end_ts),
    period_interval: String(apiParams.period_interval),
  });
  if (apiParams.include_latest_before_start) {
    qs.set("include_latest_before_start", "true");
  }
  const seriesTicker = String(opts.seriesTicker || "").trim();
  if (seriesTicker && tickers.length === 1) {
    qs.set("series_ticker", seriesTicker);
  }

  const res = await fetch(
    `/api/integrations/kalshi-live/markets/candlesticks?${qs.toString()}`,
    {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal: opts.signal,
    },
  );
  const body = await res.json().catch(() => ({}));
  if (opts.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
  if (!res.ok) {
    throw new Error(
      typeof body?.error === "string" ? body.error : res.statusText || "Candlesticks request failed",
    );
  }

  const flat = flattenKalshiLiveCandlestickGroups(body?.markets);
  const filtered = applyKalshiLiveClientWhere(flat, clientWhere);
  const sorted = applyKalshiLiveClientSort(filtered, sortClauses, "candlesticks");
  const maxTotal = Math.max(1, Math.min(10_000, Math.floor(Number(opts.limit) || 1000)));
  const sliced = sorted.slice(0, maxTotal);
  const rows = projectKalshiLiveCandlestickRows(sliced, opts.selectedColumns);

  return {
    raw: sliced,
    rows,
    querySummary: summarizeKalshiLiveCandlestickRequest(tickers, apiParams, { limit: maxTotal }),
  };
}
