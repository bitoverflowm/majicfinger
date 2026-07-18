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
 * Fetch candlesticks one market at a time via the single-market Kalshi path
 * (avoids batch 10k cap across all tickers).
 *
 * @param {{
 *   marketTickers: string;
 *   whereFilters?: import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveWhereFilter[];
 *   sortClauses?: import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveSortClause[];
 *   limit?: number;
 *   selectedColumns?: string[];
 *   seriesTicker?: string;
 *   signal?: AbortSignal;
 *   onTickerProgress?: (info: { ticker: string; index: number; total: number }) => void;
 * }} opts
 * @returns {Promise<{
 *   byTicker: { ticker: string; raw: Record<string, unknown>[]; rows: Record<string, unknown>[] }[];
 *   raw: Record<string, unknown>[];
 *   rows: Record<string, unknown>[];
 *   querySummary: string;
 * }>}
 */
export async function fetchKalshiLiveCandlesticksPull(opts) {
  const tickers = parseKalshiLiveMarketTickersInput(opts.marketTickers);
  const whereFilters = Array.isArray(opts.whereFilters) ? opts.whereFilters : [];
  const sortClauses = Array.isArray(opts.sortClauses) ? opts.sortClauses : [];
  const { apiParams, clientWhere } = partitionCandlestickApiParams(whereFilters);
  const maxPerTicker = Math.max(1, Math.min(10_000, Math.floor(Number(opts.limit) || 1000)));

  if (opts.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  /** @type {{ ticker: string; raw: Record<string, unknown>[]; rows: Record<string, unknown>[] }[]} */
  const byTicker = [];

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    if (opts.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }
    opts.onTickerProgress?.({ ticker, index: i, total: tickers.length });

    const qs = new URLSearchParams({
      market_tickers: ticker,
      start_ts: String(apiParams.start_ts),
      end_ts: String(apiParams.end_ts),
      period_interval: String(apiParams.period_interval),
      per_ticker: "1",
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
        typeof body?.error === "string"
          ? `${ticker}: ${body.error}`
          : `${ticker}: ${res.statusText || "Candlesticks request failed"}`,
      );
    }

    const flat = flattenKalshiLiveCandlestickGroups(body?.markets);
    const filtered = applyKalshiLiveClientWhere(flat, clientWhere);
    const sorted = applyKalshiLiveClientSort(filtered, sortClauses, "candlesticks");
    const sliced = sorted.slice(0, maxPerTicker);
    const rows = projectKalshiLiveCandlestickRows(sliced, opts.selectedColumns);
    byTicker.push({ ticker, raw: sliced, rows });
  }

  const raw = byTicker.flatMap((g) => g.raw);
  const rows = byTicker.flatMap((g) => g.rows);

  return {
    byTicker,
    raw,
    rows,
    querySummary: summarizeKalshiLiveCandlestickRequest(tickers, apiParams, {
      limit: maxPerTicker,
    }),
  };
}
