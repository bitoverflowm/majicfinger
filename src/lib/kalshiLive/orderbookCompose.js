import {
  KALSHI_LIVE_ORDERBOOK_API_FILTER_COLUMNS,
  parseKalshiLiveOrderbookTickerInput,
} from "@/lib/kalshiLive/orderbookColumns";

/** @typedef {import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveWhereFilter} KalshiLiveWhereFilter */

/**
 * @param {KalshiLiveWhereFilter[]} whereFilters
 */
export function partitionOrderbookApiParams(whereFilters) {
  /** @type {Record<string, number>} */
  const api = {};
  /** @type {KalshiLiveWhereFilter[]} */
  const clientWhere = [];

  for (const f of Array.isArray(whereFilters) ? whereFilters : []) {
    const col = f.column;
    if (col === "depth" && Number.isFinite(Number(f.value))) {
      const depth = Math.floor(Number(f.value));
      if (depth >= 0 && depth <= 100) api.depth = depth;
      continue;
    }
    if (!KALSHI_LIVE_ORDERBOOK_API_FILTER_COLUMNS.has(col)) {
      clientWhere.push(f);
    }
  }

  return { apiParams: api, clientWhere };
}

/**
 * @param {string} tickerRaw
 * @returns {string | null}
 */
export function validateKalshiLiveOrderbookPull(tickerRaw) {
  const ticker = parseKalshiLiveOrderbookTickerInput(tickerRaw);
  if (!ticker) return "Enter a market ticker.";
  const multi = String(tickerRaw || "")
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (multi.length > 1) {
    return "Orderbook pulls one market at a time — enter a single ticker.";
  }
  return null;
}

/**
 * @param {string} ticker
 * @param {Record<string, number>} apiParams
 */
export function summarizeKalshiLiveOrderbookRequest(ticker, apiParams) {
  const parts = [`GET /markets/${ticker}/orderbook`];
  if (Number.isFinite(Number(apiParams.depth))) parts.push(`depth=${apiParams.depth}`);
  return parts.join(" · ");
}
