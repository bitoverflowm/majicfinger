import { resolvePublicDashboardLiveConfig } from "@/lib/liveFeeds/publicLiveConfig";
import {
  getCachedPublicEventCandlesticks,
  publicLiveCacheControl,
  publicLiveLookbackPeriods,
} from "@/lib/liveFeeds/publicLiveKalshiCache";
import { resolveDashboardByUsernameSlug } from "@/lib/server/resolveDashboardByUsernameSlug";

/**
 * GET /api/public/dashboards/[username]/[slug]/live
 *
 * On-demand Kalshi event candlesticks for a published live dashboard
 * (public world, or private published for the owner).
 * Shared short-TTL cache so many visitors → one upstream pull.
 */
export default async function handler(req, res) {
  const { username, slug } = req.query;

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const resolved = await resolveDashboardByUsernameSlug(username, slug, {
      req,
      select: "user_id layout data_set_id live_backed is_public public_slug",
    });
    if (!resolved) {
      return res.status(404).json({ success: false, message: "Dashboard not found" });
    }

    const { dash, isPublic } = resolved;
    const liveConfig = await resolvePublicDashboardLiveConfig(dash);
    if (!liveConfig) {
      return res.status(400).json({
        success: false,
        message: "No Kalshi event-candlesticks live source on this dashboard",
      });
    }

    const lookbackPeriods = publicLiveLookbackPeriods(liveConfig.periodInterval);
    const tick = await getCachedPublicEventCandlesticks({
      eventTicker: liveConfig.eventTicker,
      seriesTicker: liveConfig.seriesTicker,
      periodInterval: liveConfig.periodInterval,
      lookbackPeriods,
    });

    /** @type {Record<string, Record<string, unknown>[]>} */
    const rowsByTicker = {};
    for (const m of tick.byMarket) {
      const t = String(m.ticker || "").trim().toUpperCase();
      if (t) rowsByTicker[t] = Array.isArray(m.rows) ? m.rows : [];
    }

    /** @type {Record<string, { ticker: string; sheetId: string; rows: Record<string, unknown>[] }>} */
    const charts = {};
    for (const [chartId, ref] of Object.entries(liveConfig.chartMap)) {
      charts[chartId] = {
        ticker: ref.ticker,
        sheetId: ref.sheetId,
        rows: rowsByTicker[ref.ticker] || [],
      };
    }

    res.setHeader("Cache-Control", isPublic ? publicLiveCacheControl() : "private, no-store");
    return res.status(200).json({
      success: true,
      data: {
        eventTicker: liveConfig.eventTicker,
        seriesTicker: liveConfig.seriesTicker,
        periodInterval: liveConfig.periodInterval,
        pollIntervalMs: liveConfig.pollIntervalMs,
        lookbackPeriods,
        metaRows: tick.metaRows,
        charts,
        fetchedAt: tick.fetchedAt,
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
