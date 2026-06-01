import { KALSHI_LIVE_TRADES_API_FILTER_COLUMNS } from "@/lib/kalshiLive/tradesColumns";
import { parseKalshiLiveTradesTickerInput } from "@/lib/kalshiLive/tradesColumns";

/** @typedef {import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveWhereFilter} KalshiLiveWhereFilter */

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
 * @param {string} tickerRaw
 * @returns {string | null}
 */
export function validateKalshiLiveTradesPull(tickerRaw) {
  const ticker = parseKalshiLiveTradesTickerInput(tickerRaw);
  if (!ticker) return "Enter a market ticker.";
  const multi = String(tickerRaw || "")
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (multi.length > 1) {
    return "Trades pulls one market at a time — enter a single ticker.";
  }
  return null;
}

/**
 * @param {string} ticker
 * @param {Record<string, number>} apiParams
 * @param {{ limit?: number }} [opts]
 */
export function summarizeKalshiLiveTradesRequest(ticker, apiParams, opts = {}) {
  const parts = ["GET /markets/trades"];
  parts.push(`ticker=${ticker}`);
  if (Number.isFinite(Number(apiParams.min_ts))) parts.push(`min_ts=${apiParams.min_ts}`);
  if (Number.isFinite(Number(apiParams.max_ts))) parts.push(`max_ts=${apiParams.max_ts}`);
  if (opts.limit != null) parts.push(`limit=${opts.limit}`);
  return parts.join(" · ");
}
