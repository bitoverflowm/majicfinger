/** Included workspace storage for Elite + Lifetime (display + quota enforcement hooks). */
export const ELITE_WORKSPACE_CAP_BYTES = 10 * 1024 * 1024 * 1024;

/** Planning assumption for “~rows” copy (tabular JSON ≈ 0.5–2 KB/row). */
export const WORKSPACE_ASSUMED_BYTES_PER_ROW = 1024;

/**
 * @param {object | null | undefined} userLike - merged `/api/user` payload
 * @returns {boolean}
 */
export function userGetsWorkspaceQuotaMeter(userLike) {
  if (!userLike || typeof userLike !== "object") return false;
  if (userLike.lifetimeMember) return true;
  return String(userLike.subscriptionTier || "").toLowerCase() === "elite";
}

/**
 * Circle fill color for usage % (no text label — color only).
 * Bands: comfortable under 75%, getting full 75–89%, near limit 90%+.
 * @param {number} pct 0–100
 * @returns {string} CSS color
 */
export function workspaceUsageIndicatorColor(pct) {
  const p = Math.max(0, Math.min(100, Number(pct) || 0));
  if (p >= 90) return "rgb(239 68 68)"; // red
  if (p >= 75) return "rgb(245 158 11)"; // amber
  return "rgb(16 185 129)"; // emerald
}
