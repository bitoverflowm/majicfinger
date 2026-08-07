/**
 * Public chart live publish — server tick/seed + re-exports.
 * Client eligibility: chartLivePublishConfig.js
 * Client overlay: applyLiveOverlay.js
 */

import {
  getCachedPublicEventCandlesticks,
  publicLiveLookbackPeriods,
  publicLivePollIntervalMs,
  publicLiveSeedRowCap,
} from "@/lib/liveFeeds/publicLiveKalshiCache";
import { fetchKalshiLiveMarketCandlesticksIncrementalServer } from "@/lib/liveFeeds/fetchMarketCandlesticksIncrementalServer";
import { structureOnlyLiveChartPayload } from "@/lib/server/publicDashboardHydration";
import {
  buildChartLivePublishConfig,
  chartReferencedSheetIds,
  liveBackedChartFields,
  readChartBuilderSnapshot,
  resolveChartLiveEligibility,
  sanitizeChartLivePublish,
} from "@/lib/liveFeeds/chartLivePublishConfig";
import { applyLiveOverlay } from "@/lib/liveFeeds/applyLiveOverlay";

export {
  buildChartLivePublishConfig,
  chartReferencedSheetIds,
  liveBackedChartFields,
  readChartBuilderSnapshot,
  resolveChartLiveEligibility,
  sanitizeChartLivePublish,
  applyLiveOverlay,
};

/**
 * Cap seed rows for live_backed public chart payloads.
 * @param {{ chart?: object; rows?: unknown[]; dataSheets?: Record<string, object> }} payload
 * @param {import("./chartLivePublishConfig").ChartLivePublishConfig | null | undefined} livePublish
 */
export function seedPublicChartLivePayload(payload, livePublish) {
  const cfg = sanitizeChartLivePublish(livePublish);
  const period = Math.floor(Number(cfg?.params?.periodInterval)) || 1;
  const seedRowCap = publicLiveSeedRowCap(period);
  return structureOnlyLiveChartPayload(payload, { seedRowCap });
}

/**
 * Fetch a public live tick for a stored live_publish config.
 * @param {import("./chartLivePublishConfig").ChartLivePublishConfig | null | undefined} livePublish
 * @returns {Promise<{
 *   overlayKind: string;
 *   pollIntervalMs: number;
 *   sheets: Record<string, Record<string, unknown>[]>;
 *   params: Record<string, unknown>;
 *   fetchedAt: number;
 *   lookbackPeriods: number;
 *   cacheHit?: boolean;
 * }>}
 */
export async function fetchPublicChartLiveTick(livePublish) {
  const cfg = sanitizeChartLivePublish(livePublish);
  if (!cfg) throw new Error("Invalid live_publish config");

  const periodInterval = Math.floor(Number(cfg.params.periodInterval)) || 1;
  const lookbackPeriods = publicLiveLookbackPeriods(periodInterval);
  const sheetIdByTicker =
    cfg.params.sheetIdByTicker && typeof cfg.params.sheetIdByTicker === "object"
      ? cfg.params.sheetIdByTicker
      : {};
  const marketTickers = Array.isArray(cfg.params.marketTickers) ? cfg.params.marketTickers : [];

  /** @type {Record<string, Record<string, unknown>[]>} */
  const sheets = {};
  let cacheHit = false;
  let fetchedAt = Date.now();

  if (cfg.endpoint === "event_candlesticks") {
    const eventTicker = String(cfg.params.eventTicker || "").trim().toUpperCase();
    const seriesTicker = String(cfg.params.seriesTicker || "").trim().toUpperCase();
    const tick = await getCachedPublicEventCandlesticks({
      eventTicker,
      seriesTicker,
      periodInterval,
      lookbackPeriods,
    });
    cacheHit = !!tick.cacheHit;
    fetchedAt = tick.fetchedAt || Date.now();
    /** @type {Record<string, Record<string, unknown>[]>} */
    const rowsByTicker = {};
    for (const m of tick.byMarket || []) {
      const t = String(m.ticker || "").trim().toUpperCase();
      if (t) rowsByTicker[t] = Array.isArray(m.rows) ? m.rows : [];
    }
    for (const ticker of marketTickers) {
      const sheetId = String(sheetIdByTicker[ticker] || "").trim();
      if (!sheetId) continue;
      sheets[sheetId] = rowsByTicker[ticker] || [];
    }
  } else if (cfg.endpoint === "candlesticks") {
    const tick = await fetchKalshiLiveMarketCandlesticksIncrementalServer({
      marketTickers,
      periodInterval,
      lookbackPeriods,
    });
    fetchedAt = Date.now();
    for (const m of tick.byMarket || []) {
      const ticker = String(m.ticker || "").trim().toUpperCase();
      const sheetId = String(sheetIdByTicker[ticker] || "").trim();
      if (!sheetId) continue;
      sheets[sheetId] = Array.isArray(m.rows) ? m.rows : [];
    }
  } else {
    throw new Error(`No public live adapter for ${cfg.integration}:${cfg.endpoint}`);
  }

  return {
    overlayKind: cfg.overlayKind,
    pollIntervalMs: cfg.pollIntervalMs || publicLivePollIntervalMs(periodInterval),
    sheets,
    params: {
      periodInterval,
      marketTickers,
      lookbackPeriods,
    },
    fetchedAt,
    lookbackPeriods,
    cacheHit,
  };
}
