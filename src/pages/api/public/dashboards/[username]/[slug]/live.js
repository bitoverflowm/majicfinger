import { resolvePublicDashboardLiveConfig } from "@/lib/liveFeeds/publicLiveConfig";
import {
  getCachedPublicEventCandlesticks,
  publicLiveCacheControl,
  publicLiveLookbackPeriods,
} from "@/lib/liveFeeds/publicLiveKalshiCache";
import { fetchKalshiLiveTradesIncrementalServer } from "@/lib/liveFeeds/fetchTradesIncrementalServer";
import { resolveDashboardByUsernameSlug } from "@/lib/server/resolveDashboardByUsernameSlug";

/**
 * GET /api/public/dashboards/[username]/[slug]/live
 *
 * On-demand Kalshi live for a published live dashboard
 * (event candlesticks or market trades).
 * Shared short-TTL cache so many visitors → one upstream pull (candles).
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
        message: "No Kalshi live source on this dashboard",
      });
    }

    /** @type {Record<string, { ticker: string; sheetId: string; rows: Record<string, unknown>[] }>} */
    const charts = {};

    if (liveConfig.kind === "trades") {
      const tickers = [
        ...new Set(
          Object.values(liveConfig.chartMap || {}).map((r) =>
            String(r?.ticker || "").trim().toUpperCase(),
          ),
        ),
      ].filter(Boolean);
      const tick = await fetchKalshiLiveTradesIncrementalServer({
        marketTickers: tickers.length ? tickers : liveConfig.marketTickers || [],
        lookbackSec: liveConfig.lookbackSec,
        forceLookback: true,
      });
      /** @type {Record<string, Record<string, unknown>[]>} */
      const rowsByTicker = {};
      for (const m of tick.byMarket || []) {
        const t = String(m.ticker || "").trim().toUpperCase();
        if (t) rowsByTicker[t] = Array.isArray(m.rows) ? m.rows : [];
      }
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
          kind: "trades",
          overlayKind: "sheet_rows",
          periodInterval: 1,
          pollIntervalMs: liveConfig.pollIntervalMs,
          lookbackSec: liveConfig.lookbackSec,
          charts,
          fetchedAt: Date.now(),
          cacheHit: false,
        },
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
        kind: "event_candlesticks",
        overlayKind: "candlestick_ohlc",
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
