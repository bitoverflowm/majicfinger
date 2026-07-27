import { KALSHI_LIVE_LEADERBOARD_COLUMNS } from "@/lib/kalshiLive/leaderboardColumns";

/**
 * @param {Record<string, unknown>} row
 * @param {{ metricName?: string; timePeriod?: string; category?: string }} ctx
 */
export function normalizeKalshiLiveLeaderboardRow(row, ctx = {}) {
  const r = row && typeof row === "object" ? row : {};
  const rank = Math.floor(Number(r.rank));
  const valueRaw = r.value;
  return {
    rank: Number.isFinite(rank) ? rank : null,
    nickname: r.nickname == null ? "" : String(r.nickname),
    social_id: r.social_id == null ? "" : String(r.social_id),
    profile_image_path: r.profile_image_path == null ? "" : String(r.profile_image_path),
    value:
      valueRaw == null || valueRaw === ""
        ? null
        : Number.isFinite(Number(valueRaw))
          ? Number(valueRaw)
          : null,
    is_anonymous: Boolean(r.is_anonymous),
    metric_name: String(ctx.metricName || "").trim() || null,
    time_period: String(ctx.timePeriod || "").trim() || null,
    category: String(ctx.category || "").trim() || null,
  };
}

/**
 * @param {unknown[]} rankList
 * @param {string[]} [selectedColumns]
 * @param {{ metricName?: string; timePeriod?: string; category?: string }} [ctx]
 */
export function projectKalshiLiveLeaderboardRows(rankList, selectedColumns, ctx = {}) {
  const list = Array.isArray(rankList) ? rankList : [];
  const cols =
    Array.isArray(selectedColumns) && selectedColumns.length
      ? selectedColumns
      : KALSHI_LIVE_LEADERBOARD_COLUMNS.map((c) => c.name);

  return list.map((raw) => {
    const full = normalizeKalshiLiveLeaderboardRow(
      /** @type {Record<string, unknown>} */ (raw && typeof raw === "object" ? raw : {}),
      ctx,
    );
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const name of cols) {
      out[name] = full[name] ?? null;
    }
    return out;
  });
}
