import {
  forecastApiPercentileToPct,
  KALSHI_LIVE_EVENT_FORECAST_COLUMNS,
} from "@/lib/kalshiLive/eventForecastColumns";

/**
 * Flatten one forecast history point into sheet rows (1 row per percentile point).
 * @param {Record<string, unknown>} point
 * @returns {Record<string, unknown>[]}
 */
export function expandKalshiLiveEventForecastPoint(point) {
  if (!point || typeof point !== "object") return [];
  const eventTicker = String(point.event_ticker || "").trim();
  const endPeriodTs = Math.floor(Number(point.end_period_ts));
  const periodInterval = Math.floor(Number(point.period_interval));
  const points = Array.isArray(point.percentile_points) ? point.percentile_points : [];

  return points.map((pp) => {
    const row = pp && typeof pp === "object" ? pp : {};
    const percentile = Math.floor(Number(row.percentile));
    return {
      event_ticker: eventTicker,
      end_period_ts: Number.isFinite(endPeriodTs) ? endPeriodTs : null,
      period_interval: Number.isFinite(periodInterval) ? periodInterval : null,
      percentile: Number.isFinite(percentile) ? percentile : null,
      percentile_pct: Number.isFinite(percentile) ? forecastApiPercentileToPct(percentile) : null,
      raw_numerical_forecast:
        row.raw_numerical_forecast == null || row.raw_numerical_forecast === ""
          ? null
          : Number(row.raw_numerical_forecast),
      numerical_forecast:
        row.numerical_forecast == null || row.numerical_forecast === ""
          ? null
          : Number(row.numerical_forecast),
      formatted_forecast:
        row.formatted_forecast == null ? "" : String(row.formatted_forecast),
    };
  });
}

/**
 * @param {unknown[]} history
 * @param {string[]} [selectedColumns]
 * @returns {Record<string, unknown>[]}
 */
export function projectKalshiLiveEventForecastRows(history, selectedColumns) {
  const list = Array.isArray(history) ? history : [];
  /** @type {Record<string, unknown>[]} */
  const expanded = [];
  for (const point of list) {
    expanded.push(
      ...expandKalshiLiveEventForecastPoint(
        /** @type {Record<string, unknown>} */ (point && typeof point === "object" ? point : {}),
      ),
    );
  }

  const cols =
    Array.isArray(selectedColumns) && selectedColumns.length
      ? selectedColumns
      : KALSHI_LIVE_EVENT_FORECAST_COLUMNS.map((c) => c.name);

  return expanded.map((row) => {
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const name of cols) {
      out[name] = row[name] ?? null;
    }
    return out;
  });
}
