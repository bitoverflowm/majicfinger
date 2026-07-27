/** Public Kalshi trade API v2 (unauthenticated routes). */
export const KALSHI_LIVE_API_BASE =
  (typeof process !== "undefined" && process.env.KALSHI_LIVE_API_URL?.trim()) ||
  "https://external-api.kalshi.com/trade-api/v2";

/**
 * Social / undocumented v1 host (leaderboard, etc.).
 * Elections shared API serves GET /v1/social/leaderboard.
 */
export const KALSHI_LIVE_SOCIAL_API_BASE =
  (typeof process !== "undefined" && process.env.KALSHI_LIVE_SOCIAL_API_URL?.trim()) ||
  "https://api.elections.kalshi.com/v1";

export function kalshiLiveUrl(path) {
  const base = String(KALSHI_LIVE_API_BASE).replace(/\/$/, "");
  const p = String(path || "").replace(/^\//, "");
  return `${base}/${p}`;
}

/** @param {string} path e.g. social/leaderboard */
export function kalshiLiveSocialUrl(path) {
  const base = String(KALSHI_LIVE_SOCIAL_API_BASE).replace(/\/$/, "");
  const p = String(path || "").replace(/^\//, "");
  return `${base}/${p}`;
}
