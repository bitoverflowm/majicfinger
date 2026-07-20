import { KALSHI_LIVE_TRADES_API_FILTER_COLUMNS } from "@/lib/kalshiLive/tradesColumns";
import { parseKalshiLiveTradesTickersInput } from "@/lib/kalshiLive/tradesColumns";

/** @typedef {import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveWhereFilter} KalshiLiveWhereFilter */

const MAX_TRADES_TICKERS = 100;

/** Default row cap per market in Refine (paginated via cursor up to this many). */
export const KALSHI_LIVE_TRADES_DEFAULT_LIMIT = 1000;

/** Max rows per market across cursor pages. */
export const KALSHI_LIVE_TRADES_ROW_LIMIT_MAX = 10_000;

/** Max `limit` query param per Kalshi trades page. */
export const KALSHI_LIVE_TRADES_PAGE_LIMIT_MAX = 1000;

/**
 * @param {KalshiLiveWhereFilter[]} whereFilters
 */
export function partitionTradesApiParams(whereFilters) {
  /** @type {Record<string, number>} */
  const api = {};
  /** @type {KalshiLiveWhereFilter[]} */
  const clientWhere = [];

  for (const f of Array.isArray(whereFilters) ? whereFilters : []) {
    const col = f.column;
    if (col === "min_ts" && Number.isFinite(Number(f.value))) {
      api.min_ts = Math.floor(Number(f.value));
      continue;
    }
    if (col === "max_ts" && Number.isFinite(Number(f.value))) {
      api.max_ts = Math.floor(Number(f.value));
      continue;
    }
    if (!KALSHI_LIVE_TRADES_API_FILTER_COLUMNS.has(col)) {
      clientWhere.push(f);
    }
  }

  if (
    Number.isFinite(Number(api.min_ts)) &&
    Number.isFinite(Number(api.max_ts)) &&
    api.min_ts > api.max_ts
  ) {
    const tmp = api.min_ts;
    api.min_ts = api.max_ts;
    api.max_ts = tmp;
  }

  return { apiParams: api, clientWhere };
}

/**
 * @param {string} tickersRaw
 * @param {KalshiLiveWhereFilter[]} [whereFilters]
 * @returns {string | null}
 */
export function validateKalshiLiveTradesPull(tickersRaw, whereFilters) {
  const tickers = parseKalshiLiveTradesTickersInput(tickersRaw);
  if (!tickers.length) return "Enter at least one market ticker.";
  if (tickers.length > MAX_TRADES_TICKERS) {
    return `Maximum ${MAX_TRADES_TICKERS} market tickers per pull.`;
  }

  const { apiParams } = partitionTradesApiParams(whereFilters || []);
  if (!Number.isFinite(Number(apiParams.min_ts)) || !Number.isFinite(Number(apiParams.max_ts))) {
    return "Set a start and end date in Common queries.";
  }
  return null;
}

/**
 * @param {string | string[]} tickers
 * @param {Record<string, number>} apiParams
 * @param {{ limit?: number }} [opts]
 */
export function summarizeKalshiLiveTradesRequest(tickers, apiParams, opts = {}) {
  const list = Array.isArray(tickers) ? tickers : [tickers].filter(Boolean);
  const parts = ["GET /markets/trades"];
  parts.push(list.length === 1 ? `ticker=${list[0]}` : `tickers=${list.join(",")}`);
  if (Number.isFinite(Number(apiParams.min_ts))) parts.push(`min_ts=${apiParams.min_ts}`);
  if (Number.isFinite(Number(apiParams.max_ts))) parts.push(`max_ts=${apiParams.max_ts}`);
  if (opts.limit != null) parts.push(`limit=${opts.limit}`);
  return parts.join(" · ");
}
