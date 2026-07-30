import { parseKalshiLiveTradesTickersInput } from "@/lib/kalshiLive/tradesColumns";
import { partitionTradesApiParams } from "@/lib/kalshiLive/tradeCompose";

/** API page size for GET /historical/trades (Kalshi max). */
export const KALSHI_HISTORICAL_V2_TRADES_PAGE_LIMIT_MAX = 1000;

/**
 * Hard cap when the user submits no ticker and no date range —
 * otherwise an unscoped walk would pull the entire historical trade archive.
 */
export const KALSHI_HISTORICAL_V2_TRADES_UNSCOPED_MAX = 1000;

/** Default refine row limit when the pull is scoped (ticker and/or date range). */
export const KALSHI_HISTORICAL_V2_TRADES_DEFAULT_LIMIT = 100_000;

/** Max refine row limit (per market when tickers are set; overall when unscoped). */
export const KALSHI_HISTORICAL_V2_TRADES_ROW_LIMIT_MAX = 1_000_000;

const MAX_TRADES_TICKERS = 100;

/**
 * @param {string} tickersRaw
 * @param {import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveWhereFilter[]} [whereFilters]
 * @returns {boolean}
 */
export function isKalshiHistoricalV2TradesPullScoped(tickersRaw, whereFilters) {
  const tickers = parseKalshiLiveTradesTickersInput(tickersRaw);
  if (tickers.length) return true;
  const { apiParams } = partitionTradesApiParams(whereFilters || []);
  return (
    Number.isFinite(Number(apiParams.min_ts)) || Number.isFinite(Number(apiParams.max_ts))
  );
}

/**
 * @param {string} tickersRaw
 * @param {import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveWhereFilter[]} [whereFilters]
 * @returns {string | null}
 */
export function validateKalshiHistoricalV2TradesPull(tickersRaw, whereFilters) {
  const tickers = parseKalshiLiveTradesTickersInput(tickersRaw);
  if (tickers.length > MAX_TRADES_TICKERS) {
    return `Maximum ${MAX_TRADES_TICKERS} market tickers per pull.`;
  }

  const { apiParams } = partitionTradesApiParams(whereFilters || []);
  if (
    Number.isFinite(Number(apiParams.min_ts)) &&
    Number.isFinite(Number(apiParams.max_ts)) &&
    apiParams.min_ts > apiParams.max_ts
  ) {
    return "Date range is invalid (start is after end).";
  }
  return null;
}

/**
 * Effective row cap for a historical trades pull.
 * Unscoped (no ticker, no dates) is hard-capped at 1000 regardless of refine limit.
 *
 * @param {{
 *   tickersRaw?: string;
 *   whereFilters?: import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveWhereFilter[];
 *   limit?: number;
 * }} opts
 */
export function resolveKalshiHistoricalV2TradesRowCap(opts) {
  const scoped = isKalshiHistoricalV2TradesPullScoped(opts.tickersRaw, opts.whereFilters);
  if (!scoped) return KALSHI_HISTORICAL_V2_TRADES_UNSCOPED_MAX;
  const n = Math.floor(Number(opts.limit));
  if (!Number.isFinite(n) || n < 1) return KALSHI_HISTORICAL_V2_TRADES_DEFAULT_LIMIT;
  return Math.min(KALSHI_HISTORICAL_V2_TRADES_ROW_LIMIT_MAX, n);
}

/**
 * @param {{
 *   tickers?: string[];
 *   apiParams?: Record<string, number>;
 *   includeBlockTrades?: boolean;
 *   limit?: number;
 *   unscoped?: boolean;
 * }} opts
 */
export function summarizeKalshiHistoricalV2TradesRequest(opts = {}) {
  const parts = ["GET /historical/trades"];
  const tickers = Array.isArray(opts.tickers) ? opts.tickers : [];
  if (tickers.length === 1) parts.push(`ticker=${tickers[0]}`);
  else if (tickers.length > 1) parts.push(`tickers=${tickers.join(",")}`);
  else parts.push("ticker=all");

  const api = opts.apiParams || {};
  if (Number.isFinite(Number(api.min_ts))) parts.push(`min_ts=${api.min_ts}`);
  if (Number.isFinite(Number(api.max_ts))) parts.push(`max_ts=${api.max_ts}`);
  if (opts.includeBlockTrades === false) parts.push("is_block_trade=false");
  if (opts.unscoped) parts.push("unscoped_cap=1000");
  if (opts.limit != null) parts.push(`limit=${opts.limit}`);
  return parts.join(" · ");
}
