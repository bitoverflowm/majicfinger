import {
  normalizeKalshiLiveLeaderboardLimit,
  normalizeKalshiLiveLeaderboardMetric,
  normalizeKalshiLiveLeaderboardTimePeriod,
} from "@/lib/kalshiLive/leaderboardColumns";
import { kalshiLiveSocialUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";

function queryParam(req, name) {
  const raw = req.query[name];
  return String(Array.isArray(raw) ? raw[0] : raw || "").trim();
}

/**
 * Proxy GET /v1/social/leaderboard (elections social API host).
 * Undocumented public endpoint — metric_name oneof uses projected_pnl / projected_roi
 * (not bare pnl / roi).
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const metricName = normalizeKalshiLiveLeaderboardMetric(
    queryParam(req, "metric_name") || queryParam(req, "metric"),
  );
  const timePeriod = normalizeKalshiLiveLeaderboardTimePeriod(
    queryParam(req, "time_period"),
  );
  const category = queryParam(req, "category");
  const limit = normalizeKalshiLiveLeaderboardLimit(queryParam(req, "limit"));

  const qs = new URLSearchParams({
    metric_name: metricName,
    time_period: timePeriod,
    limit: String(limit),
  });
  if (category) qs.set("category", category);

  const url = `${kalshiLiveSocialUrl("social/leaderboard")}?${qs.toString()}`;

  try {
    const upstream = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const body = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const retryAfter = upstream.headers.get("retry-after");
      if (retryAfter) res.setHeader("Retry-After", retryAfter);
      const nested =
        body?.error && typeof body.error === "object" ? body.error.message : null;
      const details =
        body?.error && typeof body.error === "object" ? body.error.details : null;
      return res.status(upstream.status >= 400 ? upstream.status : 502).json({
        error:
          typeof nested === "string"
            ? nested
            : typeof body?.message === "string"
              ? body.message
              : typeof body?.error === "string"
                ? body.error
                : upstream.statusText || "Kalshi leaderboard request failed",
        details: typeof details === "string" ? details : undefined,
        metric_name: metricName,
        time_period: timePeriod,
        category: category || undefined,
        limit,
      });
    }

    const rankList = Array.isArray(body?.rank_list) ? body.rank_list : [];
    return res.status(200).json({
      rank_list: rankList,
      metric_name: metricName,
      time_period: timePeriod,
      category: category || "",
      limit,
    });
  } catch (e) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "Failed to reach Kalshi social leaderboard API",
    });
  }
}
