/** @typedef {{ name: string; type: string; description: string; label?: string }} KalshiLiveHolderProfileColumn */

/**
 * Columns from GET /v1/social/profile `social_profile` + flattened `inner_circle`.
 */
export const KALSHI_LIVE_HOLDER_PROFILE_COLUMNS = [
  { name: "nickname", type: "string", description: "Public display name" },
  { name: "social_id", type: "string", description: "Social profile id" },
  { name: "follower_count", type: "int", description: "Number of followers" },
  { name: "following_count", type: "int", description: "Number of accounts followed" },
  { name: "posts_count", type: "int", description: "Number of posts" },
  {
    name: "profile_image_path",
    type: "string",
    description: "Profile image path / key",
    label: "profile image",
  },
  { name: "description", type: "string", description: "Profile bio / description" },
  {
    name: "pending_profile_image_path",
    type: "string",
    description: "Pending profile image path when set",
    label: "pending profile image",
  },
  { name: "blocked", type: "boolean", description: "Whether the profile is blocked for the viewer" },
  { name: "joined_at", type: "string", description: "Join date (YYYY-MM-DD when present)" },
  {
    name: "profile_view_count",
    type: "int",
    description: "Profile view count",
    label: "profile views",
  },
  {
    name: "top_categories",
    type: "string",
    description: "Top trading categories (comma-separated)",
  },
  {
    name: "inner_circle_enabled",
    type: "boolean",
    description: "Whether inner circle is enabled on this profile",
    label: "inner circle enabled",
  },
  {
    name: "inner_circle_viewer_status",
    type: "string",
    description: "Viewer relationship to the profile's inner circle",
    label: "inner circle status",
  },
  { name: "pnl", type: "number", description: "Shared profit and loss, in dollars", label: "pnl" },
  { name: "dollars_traded", type: "number", description: "Shared dollar volume traded", label: "dollars traded" },
  { name: "volume", type: "number", description: "Contracts traded" },
  { name: "open_interest", type: "number", description: "Contracts currently held", label: "open interest" },
  { name: "num_markets_traded", type: "int", description: "Number of markets traded", label: "markets traded" },
  { name: "metrics_period", type: "string", description: "Period the metrics cover (all_time / yearly)", label: "metrics period" },
  {
    name: "positions_visibility",
    type: "string",
    description: "Whether this trader shares their positions (visible / hidden)",
    label: "positions visibility",
  },
];

/** Kalshi metrics report pnl and dollars traded in ten-thousandths of a dollar. */
export const KALSHI_LIVE_METRIC_DOLLAR_SCALE = 10000;

/** Periods the profile metrics endpoint answers. Shorter periods come back as zeros. */
export const KALSHI_LIVE_PROFILE_METRIC_PERIODS = ["all_time", "yearly"];

/**
 * @param {Record<string, unknown> | null | undefined} payload GET /social/profile/metrics
 * @param {string} [period]
 */
export function kalshiLiveProfileMetricFields(payload, period = "all_time") {
  const metrics = payload?.metrics && typeof payload.metrics === "object" ? payload.metrics : {};
  const num = (v) => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const dollars = (v) => {
    const n = num(v);
    return n == null ? null : Math.round((n / KALSHI_LIVE_METRIC_DOLLAR_SCALE) * 100) / 100;
  };
  const markets = num(metrics.num_markets_traded);
  return {
    pnl: dollars(metrics.pnl),
    dollars_traded: dollars(metrics.dollars_traded),
    volume: num(metrics.volume_fp) ?? num(metrics.volume),
    open_interest: num(metrics.open_interest_fp) ?? num(metrics.open_interest),
    num_markets_traded: markets == null ? null : Math.floor(markets),
    metrics_period: payload ? String(period || "all_time") : "",
  };
}

/** @param {KalshiLiveHolderProfileColumn | string} col */
export function getKalshiLiveHolderProfileColumnLabel(col) {
  const name = typeof col === "string" ? col : col.name;
  const fromCol = typeof col === "object" && col.label ? col.label : null;
  return fromCol || name;
}

/**
 * @param {unknown} raw
 * @returns {string}
 */
export function normalizeKalshiLiveHolderProfileNickname(raw) {
  return String(raw || "").trim();
}
