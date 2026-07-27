import {
  normalizeKalshiLiveLeaderboardLimit,
  normalizeKalshiLiveLeaderboardMetric,
  normalizeKalshiLiveLeaderboardTimePeriod,
} from "@/lib/kalshiLive/leaderboardColumns";
import {
  summarizeKalshiLiveLeaderboardRequest,
  validateKalshiLiveLeaderboardPull,
  resolveKalshiLiveLeaderboardCategory,
} from "@/lib/kalshiLive/leaderboardCompose";
import { projectKalshiLiveLeaderboardRows } from "@/lib/kalshiLive/normalizeLeaderboardRow";

/**
 * Pull Kalshi social leaderboard rankings.
 *
 * @param {{
 *   metricName?: string;
 *   timePeriod?: string;
 *   category?: string;
 *   categoryOther?: string;
 *   limit?: number;
 *   selectedColumns?: string[];
 *   signal?: AbortSignal;
 *   onProgress?: (info: { label: string; progress: number }) => void;
 * }} opts
 */
export async function fetchKalshiLiveLeaderboardPull(opts) {
  const metricName = normalizeKalshiLiveLeaderboardMetric(opts.metricName);
  const timePeriod = normalizeKalshiLiveLeaderboardTimePeriod(opts.timePeriod);
  const category = resolveKalshiLiveLeaderboardCategory(opts.category, opts.categoryOther);
  const limit = normalizeKalshiLiveLeaderboardLimit(opts.limit);

  const err = validateKalshiLiveLeaderboardPull({
    metricName,
    timePeriod,
    category: opts.category,
    categoryOther: opts.categoryOther,
    limit,
  });
  if (err) throw new Error(err);

  if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");

  opts.onProgress?.({ label: "Fetching Kalshi leaderboard…", progress: 20 });

  const qs = new URLSearchParams({
    metric_name: metricName,
    time_period: timePeriod,
    limit: String(limit),
  });
  if (category) qs.set("category", category);

  const res = await fetch(
    `/api/integrations/kalshi-live/social/leaderboard?${qs.toString()}`,
    {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal: opts.signal,
    },
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const nested =
      body?.error && typeof body.error === "object" ? body.error.message : null;
    const details = typeof body?.details === "string" ? body.details : "";
    const base =
      typeof body?.error === "string"
        ? body.error
        : typeof nested === "string"
          ? nested
          : typeof body?.message === "string"
            ? body.message
            : res.statusText || "Leaderboard request failed";
    throw new Error(details ? `${base} (${details})` : base);
  }

  const rankList = Array.isArray(body?.rank_list) ? body.rank_list : [];
  opts.onProgress?.({ label: "Projecting leaderboard rows…", progress: 80 });

  const ctx = { metricName, timePeriod, category };
  const rows = projectKalshiLiveLeaderboardRows(rankList, opts.selectedColumns, ctx);

  return {
    raw: rankList,
    rows,
    metricName,
    timePeriod,
    category,
    limit,
    querySummary: summarizeKalshiLiveLeaderboardRequest({
      metricName,
      timePeriod,
      category,
      limit,
      loadedRowCount: rows.length,
    }),
  };
}
