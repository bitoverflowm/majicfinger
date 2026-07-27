import { KALSHI_LIVE_HOLDER_PROFILE_COLUMNS } from "@/lib/kalshiLive/holderProfileColumns";

/**
 * Flatten GET /v1/social/profile payload into one sheet row.
 *
 * @param {{
 *   social_profile?: Record<string, unknown>;
 *   inner_circle?: Record<string, unknown>;
 * } | Record<string, unknown> | null | undefined} payload
 */
export function normalizeKalshiLiveHolderProfileRow(payload) {
  const root = payload && typeof payload === "object" ? payload : {};
  const profile =
    root.social_profile && typeof root.social_profile === "object"
      ? /** @type {Record<string, unknown>} */ (root.social_profile)
      : root;
  const inner =
    root.inner_circle && typeof root.inner_circle === "object"
      ? /** @type {Record<string, unknown>} */ (root.inner_circle)
      : {};

  const topCats = Array.isArray(profile.top_categories)
    ? profile.top_categories.map((c) => String(c ?? "").trim()).filter(Boolean)
    : [];

  const asInt = (v) => {
    const n = Math.floor(Number(v));
    return Number.isFinite(n) ? n : null;
  };

  return {
    nickname: profile.nickname == null ? "" : String(profile.nickname),
    social_id: profile.social_id == null ? "" : String(profile.social_id),
    follower_count: asInt(profile.follower_count),
    following_count: asInt(profile.following_count),
    posts_count: asInt(profile.posts_count),
    profile_image_path:
      profile.profile_image_path == null ? "" : String(profile.profile_image_path),
    description: profile.description == null ? "" : String(profile.description),
    pending_profile_image_path:
      profile.pending_profile_image_path == null
        ? ""
        : String(profile.pending_profile_image_path),
    blocked: Boolean(profile.blocked),
    joined_at: profile.joined_at == null ? "" : String(profile.joined_at),
    profile_view_count: asInt(profile.profile_view_count),
    top_categories: topCats.join(", "),
    inner_circle_enabled: Boolean(inner.enabled),
    inner_circle_viewer_status:
      inner.viewer_status == null ? "" : String(inner.viewer_status),
  };
}

/**
 * @param {unknown} payload
 * @param {string[]} [selectedColumns]
 */
export function projectKalshiLiveHolderProfileRows(payload, selectedColumns) {
  const cols =
    Array.isArray(selectedColumns) && selectedColumns.length
      ? selectedColumns
      : KALSHI_LIVE_HOLDER_PROFILE_COLUMNS.map((c) => c.name);

  const full = normalizeKalshiLiveHolderProfileRow(
    /** @type {Record<string, unknown>} */ (payload && typeof payload === "object" ? payload : {}),
  );

  /** @type {Record<string, unknown>} */
  const out = {};
  for (const name of cols) {
    out[name] = full[name] ?? null;
  }
  return [out];
}
