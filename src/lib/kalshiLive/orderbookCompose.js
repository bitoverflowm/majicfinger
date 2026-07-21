import {
  KALSHI_LIVE_ORDERBOOK_API_FILTER_COLUMNS,
  parseKalshiLiveOrderbookTickersInput,
} from "@/lib/kalshiLive/orderbookColumns";

/** @typedef {import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveWhereFilter} KalshiLiveWhereFilter */

const MAX_ORDERBOOK_TICKERS = 100;

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
 * @param {string} tickersRaw
 * @returns {string | null}
 */
export function validateKalshiLiveOrderbookPull(tickersRaw) {
  const tickers = parseKalshiLiveOrderbookTickersInput(tickersRaw);
  if (!tickers.length) return "Enter at least one market ticker.";
  if (tickers.length > MAX_ORDERBOOK_TICKERS) {
    return `Maximum ${MAX_ORDERBOOK_TICKERS} market tickers per pull.`;
  }
  return null;
}

/**
 * @param {string | string[]} tickers
 * @param {Record<string, number>} apiParams
 */
export function summarizeKalshiLiveOrderbookRequest(tickers, apiParams) {
  const list = Array.isArray(tickers) ? tickers : [tickers].filter(Boolean);
  const parts =
    list.length === 1
      ? [`GET /markets/${list[0]}/orderbook`]
      : [`GET /markets/{ticker}/orderbook`, `tickers=${list.join(",")}`];
  if (Number.isFinite(Number(apiParams.depth))) parts.push(`depth=${apiParams.depth}`);
  return parts.join(" · ");
}
