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
];

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
