/** Public Kalshi trade API v2 (unauthenticated routes). */
export const KALSHI_LIVE_API_BASE =
  (typeof process !== "undefined" && process.env.KALSHI_LIVE_API_URL?.trim()) ||
  "https://external-api.kalshi.com/trade-api/v2";

export function kalshiLiveUrl(path) {
  const base = String(KALSHI_LIVE_API_BASE).replace(/\/$/, "");
  const p = String(path || "").replace(/^\//, "");
  return `${base}/${p}`;
}
