import { resolveChartByUsernameSlug } from "@/lib/server/resolveChartByUsernameSlug";
import {
  fetchPublicChartLiveTick,
  sanitizeChartLivePublish,
} from "@/lib/liveFeeds/publicChartLivePublish";
import { publicLiveCacheControl } from "@/lib/liveFeeds/publicLiveKalshiCache";

/**
 * GET /api/public/charts/[username]/[slug]/live
 *
 * On-demand Kalshi live tick for a published live chart embed.
 * Response is scoped to chart-referenced sheets/tickers only.
 */
export default async function handler(req, res) {
  const { username, slug } = req.query;

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const resolved = await resolveChartByUsernameSlug(username, slug, {
      req,
      select:
        "user_id data_set_id live_backed live_publish is_public public_slug chart_properties",
    });
    if (!resolved) {
      return res.status(404).json({ success: false, message: "Chart not found" });
    }

    const { chart, isPublic } = resolved;
    if (!chart.live_backed) {
      return res.status(400).json({
        success: false,
        message: "This chart is not published as a live embed",
      });
    }

    const livePublish = sanitizeChartLivePublish(chart.live_publish);
    if (!livePublish) {
      return res.status(400).json({
        success: false,
        message: "Live publish config missing or invalid",
      });
    }

    const tick = await fetchPublicChartLiveTick(livePublish);

    res.setHeader("Cache-Control", isPublic ? publicLiveCacheControl() : "private, no-store");
    return res.status(200).json({
      success: true,
      data: {
        overlayKind: tick.overlayKind,
        pollIntervalMs: tick.pollIntervalMs,
        sheets: tick.sheets,
        params: tick.params,
        fetchedAt: tick.fetchedAt,
        lookbackPeriods: tick.lookbackPeriods,
        cacheHit: !!tick.cacheHit,
      },
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e instanceof Error ? e.message : "Live fetch failed",
    });
  }
}
