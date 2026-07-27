/** @typedef {{ name: string; type: string; description: string; label?: string }} KalshiLiveEventForecastColumn */

/**
 * Forecast period_interval values (Kalshi: 0 = 5-second bars; otherwise minutes).
 * Shown in human-readable labels — users never need to know the raw codes.
 */
export const KALSHI_LIVE_EVENT_FORECAST_PERIOD_OPTIONS = [
  { value: 0, label: "5 seconds" },
  { value: 1, label: "1 minute" },
  { value: 60, label: "1 hour" },
  { value: 1440, label: "1 day" },
];

/** Default evenly spaced percentiles as display % (maps to API 0–9999 via ×100). */
export const KALSHI_LIVE_EVENT_FORECAST_DEFAULT_PERCENTILE_PCTS = [10, 25, 50, 75, 90];

/** Max percentiles per request (Kalshi API). */
export const KALSHI_LIVE_EVENT_FORECAST_MAX_PERCENTILES = 10;

/**
 * Preset percentile sets (display %). Max 10 values; API maps pct → round(pct×100).
 * @type {{ id: string; label: string; description: string; pcts: number[] }[]}
 */
export const KALSHI_LIVE_EVENT_FORECAST_PERCENTILE_PRESETS = [
  {
    id: "even5",
    label: "Even 5",
    description: "10 · 25 · 50 · 75 · 90",
    pcts: [10, 25, 50, 75, 90],
  },
  {
    id: "quartiles",
    label: "Quartiles",
    description: "0 · 25 · 50 · 75 · 99.99",
    pcts: [0, 25, 50, 75, 99.99],
  },
  {
    id: "median_band",
    label: "Median band",
    description: "10 · 50 · 90",
    pcts: [10, 50, 90],
  },
];

/**
 * Flattened forecast history rows (one row per percentile point per period).
 * Omits nested `percentile_points` JSON in favor of expanded columns.
 */
export const KALSHI_LIVE_EVENT_FORECAST_COLUMNS = [
  { name: "event_ticker", type: "string", description: "Event ticker this forecast is for" },
  {
    name: "end_period_ts",
    type: "timestamp",
    description: "Inclusive end of the forecast period (Unix seconds)",
  },
  {
    name: "period_interval",
    type: "int",
    description: "Length of the forecast period (0 = 5 seconds; otherwise minutes)",
  },
  {
    name: "percentile",
    type: "int",
    description: "API percentile (0–9999). Prefer percentile_pct for a human %.",
  },
  {
    name: "percentile_pct",
    type: "number",
    description: "Percentile as a percentage (0–99.99)",
    label: "percentile %",
  },
  {
    name: "raw_numerical_forecast",
    type: "number",
    description: "Raw numerical forecast value",
  },
  {
    name: "numerical_forecast",
    type: "number",
    description: "Processed numerical forecast value",
  },
  {
    name: "formatted_forecast",
    type: "string",
    description: "Human-readable formatted forecast value",
  },
];

/** @param {KalshiLiveEventForecastColumn | string} col */
export function getKalshiLiveEventForecastColumnLabel(col) {
  const name = typeof col === "string" ? col : col.name;
  const fromCol = typeof col === "object" && col.label ? col.label : null;
  return fromCol || name;
}

/**
 * Display % → API percentile (0–9999). 50 → 5000, 99.99 → 9999.
 * @param {number} pct
 * @returns {number}
 */
export function forecastPctToApiPercentile(pct) {
  const n = Number(pct);
  if (!Number.isFinite(n)) return NaN;
  return Math.min(9999, Math.max(0, Math.round(n * 100)));
}

/**
 * API percentile → display %.
 * @param {number} api
 * @returns {number}
 */
export function forecastApiPercentileToPct(api) {
  const n = Number(api);
  if (!Number.isFinite(n)) return NaN;
  return Math.min(99.99, Math.max(0, n / 100));
}

/**
 * @param {unknown} pcts
 * @returns {number[]} unique sorted API percentiles (max 10)
 */
export function normalizeForecastApiPercentiles(pcts) {
  const list = Array.isArray(pcts) ? pcts : [];
  /** @type {number[]} */
  const out = [];
  const seen = new Set();
  for (const raw of list) {
    const n = Math.floor(Number(raw));
    if (!Number.isFinite(n) || n < 0 || n > 9999) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
    if (out.length >= KALSHI_LIVE_EVENT_FORECAST_MAX_PERCENTILES) break;
  }
  out.sort((a, b) => a - b);
  return out;
}

/**
 * @param {unknown} displayPcts
 * @returns {number[]} unique sorted display % (max 10)
 */
export function normalizeForecastDisplayPcts(displayPcts) {
  const list = Array.isArray(displayPcts) ? displayPcts : [];
  /** @type {number[]} */
  const out = [];
  const seen = new Set();
  for (const raw of list) {
    const api = forecastPctToApiPercentile(raw);
    if (!Number.isFinite(api)) continue;
    if (seen.has(api)) continue;
    seen.add(api);
    out.push(forecastApiPercentileToPct(api));
    if (out.length >= KALSHI_LIVE_EVENT_FORECAST_MAX_PERCENTILES) break;
  }
  out.sort((a, b) => a - b);
  return out;
}

/**
 * Format a display % for chips (trim trailing zeros).
 * @param {number} pct
 */
export function formatForecastPercentilePct(pct) {
  const n = Number(pct);
  if (!Number.isFinite(n)) return "";
  if (Number.isInteger(n)) return `${n}%`;
  const fixed = n.toFixed(2).replace(/\.?0+$/, "");
  return `${fixed}%`;
}
