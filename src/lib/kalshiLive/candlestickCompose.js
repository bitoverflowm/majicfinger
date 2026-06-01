import { KALSHI_LIVE_CANDLESTICK_API_FILTER_COLUMNS } from "@/lib/kalshiLive/candlesticksColumns";
import { parseKalshiLiveMarketTickersInput } from "@/lib/kalshiLive/candlesticksColumns";

/** @typedef {import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveWhereFilter} KalshiLiveWhereFilter */

const DEFAULT_PERIOD_INTERVAL = 60;
const DEFAULT_RANGE_SEC = 24 * 60 * 60;

/**
 * @param {KalshiLiveWhereFilter[]} whereFilters
 */
export function partitionCandlestickApiParams(whereFilters) {
  /** @type {Record<string, string | boolean | number>} */
  const api = {};
  /** @type {KalshiLiveWhereFilter[]} */
  const clientWhere = [];

  const now = Math.floor(Date.now() / 1000);

  for (const f of Array.isArray(whereFilters) ? whereFilters : []) {
    const col = f.column;
    if (col === "start_ts" && Number.isFinite(Number(f.value))) {
      api.start_ts = Math.floor(Number(f.value));
      continue;
    }
    if (col === "end_ts" && Number.isFinite(Number(f.value))) {
      api.end_ts = Math.floor(Number(f.value));
      continue;
    }
    if (col === "period_interval" && Number.isFinite(Number(f.value))) {
      const p = Math.floor(Number(f.value));
      if ([1, 60, 1440].includes(p)) api.period_interval = p;
      continue;
    }
    if (col === "include_latest_before_start") {
      const v = String(f.value ?? "").trim().toLowerCase();
      api.include_latest_before_start = v === "true" || v === "1" || f.value === true;
      continue;
    }
    if (!KALSHI_LIVE_CANDLESTICK_API_FILTER_COLUMNS.has(col)) {
      clientWhere.push(f);
    }
  }

  if (!Number.isFinite(Number(api.start_ts))) {
    api.start_ts = now - DEFAULT_RANGE_SEC;
  }
  if (!Number.isFinite(Number(api.end_ts))) {
    api.end_ts = now;
  }
  if (!Number.isFinite(Number(api.period_interval))) {
    api.period_interval = DEFAULT_PERIOD_INTERVAL;
  }

  if (api.start_ts > api.end_ts) {
    const tmp = api.start_ts;
    api.start_ts = api.end_ts;
    api.end_ts = tmp;
  }

  return { apiParams: api, clientWhere };
}

/**
 * @param {string} tickersRaw
 * @param {KalshiLiveWhereFilter[]} whereFilters
 * @returns {string | null}
 */
export function validateKalshiLiveCandlestickPull(tickersRaw, whereFilters) {
  const tickers = parseKalshiLiveMarketTickersInput(tickersRaw);
  if (!tickers.length) return "Enter at least one market ticker.";
  if (tickers.length > 100) return "Maximum 100 market tickers per pull.";

  const { apiParams } = partitionCandlestickApiParams(whereFilters);
  if (![1, 60, 1440].includes(Number(apiParams.period_interval))) {
    return "period_interval must be 1, 60, or 1440 (minutes).";
  }
  if (!Number.isFinite(Number(apiParams.start_ts)) || !Number.isFinite(Number(apiParams.end_ts))) {
    return "Add Where filters for start_ts and end_ts (timestamps), or use defaults from a time range.";
  }
  return null;
}

/**
 * @param {string[]} tickers
 * @param {Record<string, string | boolean | number>} apiParams
 */
export function summarizeKalshiLiveCandlestickRequest(tickers, apiParams, opts = {}) {
  const parts = ["GET /markets/candlesticks"];
  parts.push(`market_tickers=${tickers.join(",")}`);
  parts.push(`start_ts=${apiParams.start_ts}`);
  parts.push(`end_ts=${apiParams.end_ts}`);
  parts.push(`period_interval=${apiParams.period_interval}`);
  if (apiParams.include_latest_before_start) parts.push("include_latest_before_start=true");
  if (tickers.length === 1) parts.push("(single-ticker batch)");
  if (opts.limit != null) parts.push(`limit=${opts.limit}`);
  return parts.join(" · ");
}
