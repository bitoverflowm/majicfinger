import { inferSeriesTickerFromEvent } from "@/lib/kalshiLive/eventCandlesticksCompose";
import { parseMarketTickerList } from "@/lib/kalshiLive/marketTickerSearch";
import {
  forecastPctToApiPercentile,
  KALSHI_LIVE_EVENT_FORECAST_DEFAULT_PERCENTILE_PCTS,
  normalizeForecastApiPercentiles,
  normalizeForecastDisplayPcts,
} from "@/lib/kalshiLive/eventForecastColumns";

/** Soft cap on forecast points per pull (mirrors candlestick UX safety). */
export const KALSHI_EVENT_FORECAST_MAX_POINTS = 5000;

const FORECAST_PERIODS = new Set([0, 1, 60, 1440]);
const DEFAULT_PERIOD = 60;
const DEFAULT_RANGE_SEC = 24 * 60 * 60;

/**
 * Period length in seconds. Kalshi uses 0 for 5-second bars.
 * @param {number} periodInterval
 */
export function forecastPeriodIntervalSeconds(periodInterval) {
  const p = Math.floor(Number(periodInterval));
  if (p === 0) return 5;
  if (p === 1 || p === 60 || p === 1440) return p * 60;
  return NaN;
}

/**
 * @param {number} startTs
 * @param {number} endTs
 * @param {number} periodInterval
 */
export function estimateKalshiEventForecastCount(startTs, endTs, periodInterval) {
  const start = Math.floor(Number(startTs));
  const end = Math.floor(Number(endTs));
  const periodSec = forecastPeriodIntervalSeconds(periodInterval);
  if (!Number.isFinite(start) || !Number.isFinite(end) || !Number.isFinite(periodSec)) {
    return NaN;
  }
  const spanSec = Math.max(0, end - start);
  return Math.ceil(spanSec / periodSec);
}

/**
 * @param {number} periodInterval
 */
export function maxKalshiEventForecastRangeSec(periodInterval) {
  const periodSec = forecastPeriodIntervalSeconds(periodInterval);
  if (!Number.isFinite(periodSec)) return NaN;
  return KALSHI_EVENT_FORECAST_MAX_POINTS * periodSec;
}

/**
 * @param {number} startTs
 * @param {number} endTs
 * @param {number} periodInterval
 */
export function clampEventForecastWindow(startTs, endTs, periodInterval) {
  let start = Math.floor(Number(startTs));
  let end = Math.floor(Number(endTs));
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return { start_ts: start, end_ts: end, clamped: false };
  }
  if (start > end) {
    const tmp = start;
    start = end;
    end = tmp;
  }
  const maxSpan = maxKalshiEventForecastRangeSec(periodInterval);
  if (!Number.isFinite(maxSpan)) {
    return { start_ts: start, end_ts: end, clamped: false };
  }
  const minStart = end - maxSpan;
  if (start < minStart) {
    return { start_ts: minStart, end_ts: end, clamped: true };
  }
  return { start_ts: start, end_ts: end, clamped: false };
}

/**
 * @param {number} periodInterval
 */
export function maxKalshiEventForecastInclusiveDays(periodInterval) {
  const maxSec = maxKalshiEventForecastRangeSec(periodInterval);
  if (!Number.isFinite(maxSec) || maxSec <= 0) return NaN;
  return Math.max(1, Math.floor((maxSec + 1) / 86400));
}

/**
 * @param {number} periodInterval
 */
export function formatKalshiEventForecastCalendarWindowMessage(periodInterval) {
  const p = Math.floor(Number(periodInterval));
  const maxSec = maxKalshiEventForecastRangeSec(p);
  if (!Number.isFinite(maxSec)) return "";
  if (p === 0) {
    const hours = maxSec / 3600;
    return `At 5-second intervals we keep the window under ~${hours.toFixed(1)} hours (~${KALSHI_EVENT_FORECAST_MAX_POINTS.toLocaleString()} points).`;
  }
  if (p === 1) {
    const days = maxSec / 86400;
    return `At 1-minute intervals we keep the window under ~${days.toFixed(1)} days.`;
  }
  if (p === 60) {
    const days = Math.floor(maxSec / 86400);
    return `At 1-hour intervals we keep the window under ~${days} days.`;
  }
  if (p === 1440) {
    const days = Math.floor(maxSec / 86400);
    return `At 1-day intervals we keep the window under ~${days} days.`;
  }
  return "";
}

/**
 * @param {string} raw
 */
export function parseKalshiLiveEventForecastTicker(raw) {
  return parseMarketTickerList(raw)[0] || "";
}

/**
 * Pull start_ts / end_ts / period_interval from shared Where filters.
 * @param {import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveWhereFilter[]} whereFilters
 */
export function partitionEventForecastApiParams(whereFilters) {
  const list = Array.isArray(whereFilters) ? whereFilters : [];
  /** @type {Record<string, number>} */
  const api = {};
  for (const f of list) {
    const col = String(f?.column || "");
    if (col === "start_ts" && Number.isFinite(Number(f.value))) {
      api.start_ts = Math.floor(Number(f.value));
    }
    if (col === "end_ts" && Number.isFinite(Number(f.value))) {
      api.end_ts = Math.floor(Number(f.value));
    }
    if (col === "period_interval" && Number.isFinite(Number(f.value))) {
      const p = Math.floor(Number(f.value));
      if (FORECAST_PERIODS.has(p)) api.period_interval = p;
    }
  }
  if (!Number.isFinite(Number(api.period_interval))) {
    api.period_interval = DEFAULT_PERIOD;
  }
  if (!Number.isFinite(Number(api.start_ts)) || !Number.isFinite(Number(api.end_ts))) {
    const now = Math.floor(Date.now() / 1000);
    if (!Number.isFinite(Number(api.end_ts))) api.end_ts = now;
    if (!Number.isFinite(Number(api.start_ts))) {
      api.start_ts = Number(api.end_ts) - DEFAULT_RANGE_SEC;
    }
  }
  const clamped = clampEventForecastWindow(api.start_ts, api.end_ts, api.period_interval);
  api.start_ts = clamped.start_ts;
  api.end_ts = clamped.end_ts;
  return { apiParams: api, clamped: clamped.clamped };
}

/**
 * @param {unknown} displayPcts
 * @returns {number[]}
 */
export function resolveForecastApiPercentilesFromDisplay(displayPcts) {
  const pcts = normalizeForecastDisplayPcts(
    Array.isArray(displayPcts) && displayPcts.length
      ? displayPcts
      : KALSHI_LIVE_EVENT_FORECAST_DEFAULT_PERCENTILE_PCTS,
  );
  return normalizeForecastApiPercentiles(pcts.map((p) => forecastPctToApiPercentile(p)));
}

/**
 * @param {string} eventTickerRaw
 * @param {string} seriesTickerRaw
 * @param {import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveWhereFilter[]} whereFilters
 * @param {unknown} displayPcts
 * @returns {string | null}
 */
export function validateKalshiLiveEventForecastPull(
  eventTickerRaw,
  seriesTickerRaw,
  whereFilters,
  displayPcts,
) {
  const eventTicker = parseKalshiLiveEventForecastTicker(eventTickerRaw);
  if (!eventTicker) return "Search for an event or enter an event ticker.";

  const seriesTicker =
    parseKalshiLiveEventForecastTicker(seriesTickerRaw) ||
    inferSeriesTickerFromEvent(eventTicker);
  if (!seriesTicker) return "Add the series ticker for this event.";

  const percentiles = resolveForecastApiPercentilesFromDisplay(displayPcts);
  if (!percentiles.length) {
    return "Add at least one percentile (as a percentage, e.g. 50 for the median).";
  }
  if (percentiles.length > 10) {
    return "At most 10 percentiles can be requested.";
  }

  const { apiParams } = partitionEventForecastApiParams(whereFilters);
  if (!FORECAST_PERIODS.has(Number(apiParams.period_interval))) {
    return "Pick a forecast interval (5 seconds, 1 minute, 1 hour, or 1 day).";
  }
  if (!Number.isFinite(Number(apiParams.start_ts)) || !Number.isFinite(Number(apiParams.end_ts))) {
    return "Pick a start and end date for the forecast range.";
  }
  return null;
}

/**
 * @param {string} eventTicker
 * @param {string} seriesTicker
 * @param {Record<string, number>} apiParams
 * @param {number[]} apiPercentiles
 * @param {{ loadedRowCount?: number }} [opts]
 */
export function summarizeKalshiLiveEventForecastRequest(
  eventTicker,
  seriesTicker,
  apiParams,
  apiPercentiles,
  opts = {},
) {
  const parts = [
    `GET /series/${seriesTicker}/events/${eventTicker}/forecast_percentile_history`,
  ];
  parts.push(`start_ts=${apiParams.start_ts}`);
  parts.push(`end_ts=${apiParams.end_ts}`);
  parts.push(`period_interval=${apiParams.period_interval}`);
  if (Array.isArray(apiPercentiles) && apiPercentiles.length) {
    parts.push(`percentiles=${apiPercentiles.join(",")}`);
  }
  if (typeof opts.loadedRowCount === "number") {
    parts.push(`rows=${opts.loadedRowCount}`);
  }
  if (typeof opts.adjustedEndTs === "number") {
    parts.push(`adjusted_end_ts=${opts.adjustedEndTs}`);
  }
  return parts.join(" · ");
}
