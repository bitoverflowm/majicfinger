/** @typedef {{ name: string; type: string; description: string; label?: string }} KalshiLiveLeaderboardColumn */

/** API metric_name values that Kalshi accepts (oneof). */
export const KALSHI_LIVE_LEADERBOARD_METRIC_OPTIONS = [
  { value: "projected_pnl", label: "PnL", description: "Rank by projected profit and loss" },
  { value: "volume", label: "Volume", description: "Rank by traded volume" },
  { value: "dollars_traded", label: "Dollars traded", description: "Rank by dollar volume traded" },
  { value: "projected_roi", label: "ROI", description: "Rank by projected return on investment" },
  {
    value: "num_markets_traded",
    label: "Number of markets traded",
    description: "Rank by how many markets the user has traded",
  },
  {
    value: "open_interest",
    label: "Open interest",
    description: "Rank by open interest",
  },
];

export const KALSHI_LIVE_LEADERBOARD_DEFAULT_METRIC = "projected_pnl";

export const KALSHI_LIVE_LEADERBOARD_TIME_PERIOD_OPTIONS = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "all_time", label: "All time" },
];

export const KALSHI_LIVE_LEADERBOARD_DEFAULT_TIME_PERIOD = "weekly";

/** Kalshi rejects limit > 100 on this social endpoint. */
export const KALSHI_LIVE_LEADERBOARD_LIMIT_DEFAULT = 25;
export const KALSHI_LIVE_LEADERBOARD_LIMIT_MAX = 100;

/**
 * Columns discovered from GET /v1/social/leaderboard `rank_list` items,
 * plus request-context fields we attach for the sheet.
 */
export const KALSHI_LIVE_LEADERBOARD_COLUMNS = [
  { name: "rank", type: "int", description: "Leaderboard rank (1 = top)" },
  { name: "nickname", type: "string", description: "Public display name" },
  { name: "social_id", type: "string", description: "Social profile id when present" },
  {
    name: "profile_image_path",
    type: "string",
    description: "Profile image path / key",
    label: "profile image",
  },
  { name: "value", type: "number", description: "Metric value used for ranking" },
  { name: "is_anonymous", type: "boolean", description: "Whether the profile is anonymous" },
  {
    name: "metric_name",
    type: "string",
    description: "Rank-order metric requested (API metric_name)",
    label: "rank order",
  },
  {
    name: "time_period",
    type: "string",
    description: "Time period filter applied to the leaderboard",
  },
  {
    name: "category",
    type: "string",
    description: "Optional category filter applied to the leaderboard",
  },
];

/** @param {KalshiLiveLeaderboardColumn | string} col */
export function getKalshiLiveLeaderboardColumnLabel(col) {
  const name = typeof col === "string" ? col : col.name;
  const fromCol = typeof col === "object" && col.label ? col.label : null;
  return fromCol || name;
}

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeKalshiLiveLeaderboardMetric(raw) {
  const v = String(raw || "").trim();
  const hit = KALSHI_LIVE_LEADERBOARD_METRIC_OPTIONS.find((o) => o.value === v);
  return hit ? hit.value : KALSHI_LIVE_LEADERBOARD_DEFAULT_METRIC;
}

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeKalshiLiveLeaderboardTimePeriod(raw) {
  const v = String(raw || "").trim();
  const hit = KALSHI_LIVE_LEADERBOARD_TIME_PERIOD_OPTIONS.find((o) => o.value === v);
  return hit ? hit.value : KALSHI_LIVE_LEADERBOARD_DEFAULT_TIME_PERIOD;
}

/**
 * @param {unknown} raw
 * @returns {number}
 */
export function normalizeKalshiLiveLeaderboardLimit(raw) {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n) || n < 1) return KALSHI_LIVE_LEADERBOARD_LIMIT_DEFAULT;
  return Math.min(KALSHI_LIVE_LEADERBOARD_LIMIT_MAX, n);
}
