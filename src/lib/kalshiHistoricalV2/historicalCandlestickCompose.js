import {
  clampCandlestickWindowToKalshiCap,
  estimateKalshiCandlestickCount,
  formatKalshiCandlestickMaxRangeHint,
  KALSHI_CANDLESTICK_MAX_CANDLES,
  maxKalshiCandlestickRangeSec,
} from "@/lib/kalshiLive/candlestickCompose";
import {
  KALSHI_LIVE_CANDLESTICK_API_FILTER_COLUMNS,
  parseKalshiLiveMarketTickersInput,
} from "@/lib/kalshiLive/candlesticksColumns";

/** @typedef {import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveWhereFilter} KalshiLiveWhereFilter */

const DEFAULT_PERIOD_INTERVAL = 60;

export {
  KALSHI_CANDLESTICK_MAX_CANDLES,
  clampCandlestickWindowToKalshiCap,
  estimateKalshiCandlestickCount,
  formatKalshiCandlestickMaxRangeHint,
  maxKalshiCandlestickRangeSec,
};

/**
 * Partition Where filters into historical candlestick API params.
 * Does not invent start_ts/end_ts — those are required for historical pulls.
 *
 * @param {KalshiLiveWhereFilter[]} whereFilters
 */
export function partitionHistoricalCandlestickApiParams(whereFilters) {
  /** @type {Record<string, number>} */
  const api = {};
  /** @type {KalshiLiveWhereFilter[]} */
  const clientWhere = [];

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
    // include_latest_before_start is live-only — ignore for historical API.
    if (col === "include_latest_before_start") continue;
    if (!KALSHI_LIVE_CANDLESTICK_API_FILTER_COLUMNS.has(col)) {
      clientWhere.push(f);
    }
  }

  if (!Number.isFinite(Number(api.period_interval))) {
    api.period_interval = DEFAULT_PERIOD_INTERVAL;
  }

  if (
    Number.isFinite(Number(api.start_ts)) &&
    Number.isFinite(Number(api.end_ts)) &&
    api.start_ts > api.end_ts
  ) {
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
export function validateKalshiHistoricalV2CandlestickPull(tickersRaw, whereFilters) {
  const tickers = parseKalshiLiveMarketTickersInput(tickersRaw);
  if (!tickers.length) return "Enter at least one market ticker.";
  if (tickers.length > 100) return "Maximum 100 market tickers per pull.";

  const { apiParams } = partitionHistoricalCandlestickApiParams(whereFilters);
  if (![1, 60, 1440].includes(Number(apiParams.period_interval))) {
    return "Period interval must be 1 min, 1 hour, or 1 day.";
  }
  if (!Number.isFinite(Number(apiParams.start_ts)) || !Number.isFinite(Number(apiParams.end_ts))) {
    return "Select a start and end date (required for historical candlesticks).";
  }

  const count = estimateKalshiCandlestickCount(
    apiParams.start_ts,
    apiParams.end_ts,
    apiParams.period_interval,
  );
  if (Number.isFinite(count) && count > KALSHI_CANDLESTICK_MAX_CANDLES) {
    const period = Number(apiParams.period_interval);
    const maxSec = maxKalshiCandlestickRangeSec(period);
    const maxDays = (maxSec / 86400).toFixed(period === 1 ? 1 : 0);
    const periodLabel = period === 1 ? "1 min" : period === 60 ? "1 hour" : "1 day";
    return (
      `Date range is too wide for ${periodLabel} candles ` +
      `(~${count.toLocaleString()} candles; Kalshi max is ${KALSHI_CANDLESTICK_MAX_CANDLES.toLocaleString()}, ` +
      `about ${maxDays} days). Narrow the range or pick a coarser interval.`
    );
  }
  return null;
}

/**
 * @param {string[]} tickers
 * @param {Record<string, number>} apiParams
 * @param {{ limit?: number }} [opts]
 */
export function summarizeKalshiHistoricalV2CandlestickRequest(tickers, apiParams, opts = {}) {
  const parts = ["GET /historical/markets/{ticker}/candlesticks"];
  parts.push(
    tickers.length === 1 ? `ticker=${tickers[0]}` : `tickers=${tickers.join(",")}`,
  );
  parts.push(`start_ts=${apiParams.start_ts}`);
  parts.push(`end_ts=${apiParams.end_ts}`);
  parts.push(`period_interval=${apiParams.period_interval}`);
  if (opts.limit != null) parts.push(`limit=${opts.limit}`);
  return parts.join(" · ");
}
