import {
  KALSHI_LIVE_LEADERBOARD_DEFAULT_METRIC,
  KALSHI_LIVE_LEADERBOARD_DEFAULT_TIME_PERIOD,
  KALSHI_LIVE_LEADERBOARD_LIMIT_MAX,
  normalizeKalshiLiveLeaderboardLimit,
  normalizeKalshiLiveLeaderboardMetric,
  normalizeKalshiLiveLeaderboardTimePeriod,
} from "@/lib/kalshiLive/leaderboardColumns";
import { KALSHI_LIVE_CATEGORY_OTHER } from "@/lib/kalshiLive/kalshiLiveCategories";

/**
 * Resolve optional category for the API (Other → custom text).
 * @param {unknown} category
 * @param {unknown} categoryOther
 */
export function resolveKalshiLiveLeaderboardCategory(category, categoryOther) {
  const cat = String(category || "").trim();
  if (!cat || cat === "__any__") return "";
  if (cat === KALSHI_LIVE_CATEGORY_OTHER) {
    return String(categoryOther || "").trim();
  }
  return cat;
}

/**
 * @param {{
 *   metricName?: string;
 *   timePeriod?: string;
 *   category?: string;
 *   categoryOther?: string;
 *   limit?: number;
 * }} params
 * @returns {string | null}
 */
export function validateKalshiLiveLeaderboardPull(params = {}) {
  const metric = normalizeKalshiLiveLeaderboardMetric(params.metricName);
  if (!metric) return "Pick a rank order (PnL, volume, ROI, or number of markets traded).";

  const timePeriod = normalizeKalshiLiveLeaderboardTimePeriod(params.timePeriod);
  if (!timePeriod) return "Pick a time period.";

  if (String(params.category || "").trim() === KALSHI_LIVE_CATEGORY_OTHER) {
    const other = String(params.categoryOther || "").trim();
    if (!other) return "Enter a custom category, or choose Any / a listed category.";
  }

  const limit = normalizeKalshiLiveLeaderboardLimit(params.limit);
  if (limit < 1 || limit > KALSHI_LIVE_LEADERBOARD_LIMIT_MAX) {
    return `Limit must be between 1 and ${KALSHI_LIVE_LEADERBOARD_LIMIT_MAX}.`;
  }
  return null;
}

/**
 * @param {{
 *   metricName: string;
 *   timePeriod: string;
 *   category?: string;
 *   limit: number;
 *   loadedRowCount?: number;
 * }} opts
 */
export function summarizeKalshiLiveLeaderboardRequest(opts) {
  const metric = normalizeKalshiLiveLeaderboardMetric(opts.metricName);
  const timePeriod = normalizeKalshiLiveLeaderboardTimePeriod(opts.timePeriod);
  const limit = normalizeKalshiLiveLeaderboardLimit(opts.limit);
  const category = String(opts.category || "").trim();
  const parts = ["GET /v1/social/leaderboard"];
  parts.push(`metric_name=${metric}`);
  parts.push(`time_period=${timePeriod}`);
  parts.push(`limit=${limit}`);
  if (category) parts.push(`category=${category}`);
  if (typeof opts.loadedRowCount === "number") parts.push(`rows=${opts.loadedRowCount}`);
  return parts.join(" · ");
}

export {
  KALSHI_LIVE_LEADERBOARD_DEFAULT_METRIC,
  KALSHI_LIVE_LEADERBOARD_DEFAULT_TIME_PERIOD,
};
