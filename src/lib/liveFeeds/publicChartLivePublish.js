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
import { fetchKalshiLiveTradesIncrementalServer } from "@/lib/liveFeeds/fetchTradesIncrementalServer";
import { fetchKalshiLiveOrderbookIncrementalServer } from "@/lib/liveFeeds/fetchOrderbookIncrementalServer";
import { getLiveFeedEndpointDef } from "@/lib/liveFeeds/registry";
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
  if (cfg?.endpoint === "trades") {
    const lookbackSec =
      getLiveFeedEndpointDef("kalshi-live", "trades")?.lookbackPeriods || 3_600;
    // Cap seed rows so embeds paint quickly; first /live tick backfills the window.
    const seedRowCap = Math.min(2_000, Math.max(200, Math.floor(lookbackSec / 2)));
    return structureOnlyLiveChartPayload(payload, { seedRowCap });
  }
  if (cfg?.endpoint === "orderbook") {
    const softCap =
      getLiveFeedEndpointDef("kalshi-live", "orderbook")?.softRowCapPerSheet || 500;
    return structureOnlyLiveChartPayload(payload, { seedRowCap: softCap });
  }
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
  } else if (cfg.endpoint === "trades") {
    const lookbackSec =
      Math.floor(Number(cfg.params.lookbackSec)) ||
      getLiveFeedEndpointDef("kalshi-live", "trades")?.lookbackPeriods ||
      3_600;
    const tick = await fetchKalshiLiveTradesIncrementalServer({
      marketTickers,
      lookbackSec,
      forceLookback: true,
    });
    fetchedAt = Date.now();
    for (const m of tick.byMarket || []) {
      const ticker = String(m.ticker || "").trim().toUpperCase();
      const sheetId = String(sheetIdByTicker[ticker] || "").trim();
      if (!sheetId) continue;
      sheets[sheetId] = Array.isArray(m.rows) ? m.rows : [];
    }
    return {
      overlayKind: cfg.overlayKind,
      pollIntervalMs: Math.max(15_000, cfg.pollIntervalMs || 60_000),
      sheets,
      params: {
        periodInterval: 1,
        marketTickers,
        lookbackSec,
      },
      fetchedAt,
      lookbackPeriods: lookbackSec,
      cacheHit: false,
    };
  } else if (cfg.endpoint === "orderbook") {
    const depthRaw = Math.floor(Number(cfg.params.depth));
    const depth =
      Number.isFinite(depthRaw) && depthRaw >= 0 && depthRaw <= 100 ? depthRaw : null;
    const tick = await fetchKalshiLiveOrderbookIncrementalServer({
      marketTickers,
      depth,
    });
    fetchedAt = Date.now();
    for (const m of tick.byMarket || []) {
      const ticker = String(m.ticker || "").trim().toUpperCase();
      const sheetId = String(sheetIdByTicker[ticker] || "").trim();
      if (!sheetId) continue;
      sheets[sheetId] = Array.isArray(m.rows) ? m.rows : [];
    }
    return {
      overlayKind: cfg.overlayKind,
      pollIntervalMs: Math.max(15_000, cfg.pollIntervalMs || 60_000),
      sheets,
      params: {
        periodInterval: 1,
        marketTickers,
        ...(depth != null ? { depth } : {}),
      },
      fetchedAt,
      lookbackPeriods: 0,
      cacheHit: false,
    };
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
