/**
 * Chart live publish contracts — client-safe (eligibility + config).
 * Server tick/seed live in publicChartLivePublish.js (Kalshi cache).
 */

import {
  discoverEventCandlesticksFeedGroup,
  discoverMarketCandlesticksFeedGroup,
  discoverTradesFeedGroup,
} from "@/lib/liveFeeds/feedConfig";
import {
  clampLiveFeedPollIntervalMs,
  clampLiveFeedPollIntervalMsForEndpoint,
  liveFeedRegistryKey,
  pollIntervalMsForPeriod,
} from "@/lib/liveFeeds/registry";
import {
  collectChartSnapshotColumnsBySheetId,
  primarySheetIdForChartSnapshot,
} from "@/lib/chartSnapshotDataDeps";
import { sanitizeProjectLiveFeedSource } from "@/lib/liveFeeds/sanitizeProjectLiveFeedSource";

/** Match publicLivePollIntervalMs without importing the server cache module. */
const PUBLIC_LIVE_MIN_POLL_MS = 15_000;

/**
 * @typedef {{
 *   integration: string;
 *   endpoint: string;
 *   pollIntervalMs: number;
 *   overlayKind: "candlestick_ohlc" | "sheet_rows";
 *   params: Record<string, unknown>;
 * }} ChartLivePublishConfig
 */

function defaultPublicPollIntervalMs(periodInterval) {
  return Math.max(PUBLIC_LIVE_MIN_POLL_MS, pollIntervalMsForPeriod(periodInterval));
}

/**
 * @param {object | null | undefined} chartOrSnapshot
 * @returns {Record<string, unknown> | null}
 */
export function readChartBuilderSnapshot(chartOrSnapshot) {
  if (!chartOrSnapshot || typeof chartOrSnapshot !== "object") return null;
  if (chartOrSnapshot.v === 1) return chartOrSnapshot;
  const direct = chartOrSnapshot.rechartsBuilder;
  if (direct && typeof direct === "object" && direct.v === 1) return direct;
  const cp0 = Array.isArray(chartOrSnapshot.chart_properties)
    ? chartOrSnapshot.chart_properties[0]
    : null;
  const nested = cp0?.rechartsBuilder;
  if (nested && typeof nested === "object" && nested.v === 1) return nested;
  return null;
}

/**
 * Sheet ids the chart actually reads (any chart type).
 * Never expands to the whole workbook — empty candle sheet ("use active") resolves to primary only.
 * @param {Record<string, object>} dataSheets
 * @param {Record<string, unknown> | null} snapshot
 * @returns {string[]}
 */
export function chartReferencedSheetIds(dataSheets, snapshot) {
  const sheets = dataSheets && typeof dataSheets === "object" ? dataSheets : {};
  if (!snapshot) {
    const primary = primarySheetIdForChartSnapshot(sheets, null);
    return primary && sheets[primary] ? [primary] : [];
  }
  const defaultId = primarySheetIdForChartSnapshot(sheets, snapshot);
  const colsBySheet = collectChartSnapshotColumnsBySheetId(snapshot, defaultId, sheets);
  const ids = [...colsBySheet.keys()].filter((id) => sheets[id]);
  if (ids.length) return ids;
  // Candlestick with candlestickSheetId "" (active sheet) / charts with no axis keys.
  if (defaultId && sheets[defaultId]) return [defaultId];
  return [];
}

/**
 * Ensure candlestick snapshots persist an explicit sheet id (not "") for public embeds.
 * Prefer the editor's active data sheet when the chart uses "active sheet" mode.
 * @param {Record<string, unknown> | null | undefined} snapshot
 * @param {Record<string, object> | null | undefined} dataSheets
 * @param {{ preferredSheetId?: string | null }} [opts]
 */
export function stampChartSnapshotForLivePublish(snapshot, dataSheets, opts = {}) {
  if (!snapshot || typeof snapshot !== "object") return snapshot || null;
  const next = { ...snapshot };
  if (String(next.selChartType || "") !== "candlestick") return next;
  if (String(next.candlestickSheetId || "").trim()) return next;
  const sheets = dataSheets && typeof dataSheets === "object" ? dataSheets : {};
  const preferred = String(opts.preferredSheetId || "").trim();
  if (preferred && sheets[preferred]) {
    next.candlestickSheetId = preferred;
    return next;
  }
  const primary = primarySheetIdForChartSnapshot(sheets, next);
  if (primary && sheets[primary]) {
    next.candlestickSheetId = primary;
  }
  return next;
}

/**
 * @param {string} overlayKind
 * @param {Record<string, unknown> | null} snapshot
 */
function resolveOverlayKind(overlayKind, snapshot) {
  if (overlayKind === "candlestick_ohlc" || overlayKind === "sheet_rows") return overlayKind;
  if (String(snapshot?.selChartType || "") === "candlestick") return "candlestick_ohlc";
  return "sheet_rows";
}

/**
 * Invert marketSheetIdsByTicker → sheetId → ticker.
 * @param {Record<string, string>} marketSheetIdsByTicker
 */
function tickerBySheetIdMap(marketSheetIdsByTicker) {
  /** @type {Map<string, string>} */
  const map = new Map();
  for (const [ticker, sheetId] of Object.entries(marketSheetIdsByTicker || {})) {
    map.set(String(sheetId), String(ticker).toUpperCase());
  }
  return map;
}

/**
 * @param {ChartLivePublishConfig | null | undefined} raw
 * @returns {ChartLivePublishConfig | null}
 */
export function sanitizeChartLivePublish(raw) {
  if (!raw || typeof raw !== "object") return null;
  const integration = String(raw.integration || "").trim();
  const endpoint = String(raw.endpoint || "").trim();
  if (!integration || !endpoint) return null;
  const key = liveFeedRegistryKey(integration, endpoint);
  const allowed =
    key === "kalshi-live:event_candlesticks" ||
    key === "kalshi-live:candlesticks" ||
    key === "kalshi-live:trades";
  if (!allowed) return null;
  const params = raw.params && typeof raw.params === "object" ? { ...raw.params } : {};
  const periodInterval = Math.floor(Number(params.periodInterval)) || 1;
  const pollFrom = Math.floor(Number(raw.pollIntervalMs));
  let pollIntervalMs;
  if (endpoint === "trades") {
    // Public embeds still floor at 15s even if editor tested at 1s.
    const clamped = clampLiveFeedPollIntervalMsForEndpoint(
      Number.isFinite(pollFrom) && pollFrom > 0 ? pollFrom : 60_000,
      "kalshi-live",
      "trades",
    );
    pollIntervalMs = Math.max(PUBLIC_LIVE_MIN_POLL_MS, clamped);
  } else {
    pollIntervalMs =
      Number.isFinite(pollFrom) && pollFrom > 0
        ? clampLiveFeedPollIntervalMs(pollFrom, periodInterval)
        : defaultPublicPollIntervalMs(periodInterval);
  }
  const overlayKind =
    endpoint === "trades"
      ? "sheet_rows"
      : raw.overlayKind === "candlestick_ohlc" || raw.overlayKind === "sheet_rows"
        ? raw.overlayKind
        : "sheet_rows";
  return {
    integration,
    endpoint,
    pollIntervalMs,
    overlayKind,
    params: {
      ...params,
      periodInterval: endpoint === "trades" ? 1 : periodInterval,
      marketTickers: Array.isArray(params.marketTickers)
        ? [
            ...new Set(
              params.marketTickers
                .map((t) => String(t || "").trim().toUpperCase())
                .filter(Boolean),
            ),
          ]
        : [],
      sheetIds: Array.isArray(params.sheetIds)
        ? [...new Set(params.sheetIds.map((s) => String(s || "").trim()).filter(Boolean))]
        : [],
    },
  };
}

/**
 * Mongo $set / $unset helpers for Chart live fields.
 * @param {boolean} liveBacked
 * @param {ChartLivePublishConfig | null} [livePublish]
 */
export function liveBackedChartFields(liveBacked, livePublish = null) {
  const on = !!liveBacked;
  if (!on) {
    return {
      $set: { live_backed: false },
      $unset: { live_publish: "", live_backed_at: "" },
    };
  }
  const cfg = sanitizeChartLivePublish(livePublish);
  return {
    $set: {
      live_backed: true,
      live_backed_at: new Date(),
      ...(cfg ? { live_publish: cfg } : {}),
    },
    $unset: cfg ? {} : { live_publish: "" },
  };
}

/**
 * Build live publish config from chart snapshot + workbook sheets.
 * Chart-type agnostic: any chart that references a live-feed sheet qualifies.
 *
 * @param {{
 *   chart?: object | null;
 *   snapshot?: Record<string, unknown> | null;
 *   dataSheets?: Record<string, object> | null;
 *   liveFeedSource?: unknown;
 * }} opts
 * @returns {ChartLivePublishConfig | null}
 */
export function buildChartLivePublishConfig(opts = {}) {
  const stamped = stampChartSnapshotForLivePublish(
    readChartBuilderSnapshot(opts.snapshot) || readChartBuilderSnapshot(opts.chart),
    opts.dataSheets,
    { preferredSheetId: opts.preferredSheetId },
  );
  const snapshot = stamped;
  const dataSheets = opts.dataSheets && typeof opts.dataSheets === "object" ? opts.dataSheets : {};
  const sheetIds = chartReferencedSheetIds(dataSheets, snapshot);
  if (!sheetIds.length) return null;

  const liveSource = sanitizeProjectLiveFeedSource(opts.liveFeedSource);

  const eventGroup = discoverEventCandlesticksFeedGroup(dataSheets);
  if (eventGroup) {
    const bySheet = tickerBySheetIdMap(eventGroup.sheets.marketSheetIdsByTicker);
    /** @type {string[]} */
    const marketTickers = [];
    /** @type {string[]} */
    const scopedSheetIds = [];
    for (const sid of sheetIds) {
      const ticker = bySheet.get(sid);
      if (!ticker) continue;
      marketTickers.push(ticker);
      scopedSheetIds.push(sid);
    }
    if (marketTickers.length) {
      const periodInterval = eventGroup.periodInterval;
      const pollFromSource =
        liveSource?.endpoint === "event_candlesticks" ? liveSource.pollIntervalMs : null;
      const pollIntervalMs = Number.isFinite(Number(pollFromSource)) && Number(pollFromSource) > 0
        ? clampLiveFeedPollIntervalMs(pollFromSource, periodInterval)
        : defaultPublicPollIntervalMs(periodInterval);
      return {
        integration: "kalshi-live",
        endpoint: "event_candlesticks",
        pollIntervalMs,
        overlayKind: resolveOverlayKind(null, snapshot),
        params: {
          eventTicker: eventGroup.eventTicker,
          seriesTicker: eventGroup.seriesTicker,
          periodInterval,
          marketTickers: [...new Set(marketTickers)],
          sheetIds: scopedSheetIds,
          marketsMetadataSheetId: eventGroup.sheets.marketsMetadataSheetId,
          sheetIdByTicker: Object.fromEntries(
            scopedSheetIds.map((sid) => [bySheet.get(sid), sid]).filter(([t]) => t),
          ),
        },
      };
    }
  }

  const marketGroup = discoverMarketCandlesticksFeedGroup(dataSheets);
  if (marketGroup) {
    const bySheet = tickerBySheetIdMap(marketGroup.sheets.marketSheetIdsByTicker);
    /** @type {string[]} */
    const marketTickers = [];
    /** @type {string[]} */
    const scopedSheetIds = [];
    for (const sid of sheetIds) {
      const ticker = bySheet.get(sid);
      if (!ticker) continue;
      marketTickers.push(ticker);
      scopedSheetIds.push(sid);
    }
    if (marketTickers.length) {
      const periodInterval = marketGroup.periodInterval;
      const pollFromSource =
        liveSource?.endpoint === "candlesticks" ? liveSource.pollIntervalMs : null;
      const pollIntervalMs = Number.isFinite(Number(pollFromSource)) && Number(pollFromSource) > 0
        ? clampLiveFeedPollIntervalMs(pollFromSource, periodInterval)
        : defaultPublicPollIntervalMs(periodInterval);
      return {
        integration: "kalshi-live",
        endpoint: "candlesticks",
        pollIntervalMs,
        overlayKind: resolveOverlayKind(null, snapshot),
        params: {
          periodInterval,
          marketTickers: [...new Set(marketTickers)],
          sheetIds: scopedSheetIds,
          marketsMetadataSheetId: marketGroup.sheets.marketsMetadataSheetId || null,
          sheetIdByTicker: Object.fromEntries(
            scopedSheetIds.map((sid) => [bySheet.get(sid), sid]).filter(([t]) => t),
          ),
        },
      };
    }
  }

  const tradesGroup = discoverTradesFeedGroup(dataSheets);
  if (tradesGroup) {
    const bySheet = tickerBySheetIdMap(tradesGroup.sheets.marketSheetIdsByTicker);
    /** @type {string[]} */
    const marketTickers = [];
    /** @type {string[]} */
    const scopedSheetIds = [];
    for (const sid of sheetIds) {
      const ticker = bySheet.get(sid);
      if (!ticker) continue;
      marketTickers.push(ticker);
      scopedSheetIds.push(sid);
    }
    if (marketTickers.length) {
      const pollFromSource =
        liveSource?.endpoint === "trades" ? liveSource.pollIntervalMs : null;
      const clamped = clampLiveFeedPollIntervalMsForEndpoint(
        Number.isFinite(Number(pollFromSource)) && Number(pollFromSource) > 0
          ? pollFromSource
          : 60_000,
        "kalshi-live",
        "trades",
      );
      const pollIntervalMs = Math.max(PUBLIC_LIVE_MIN_POLL_MS, clamped);
      return {
        integration: "kalshi-live",
        endpoint: "trades",
        pollIntervalMs,
        overlayKind: "sheet_rows",
        params: {
          periodInterval: 1,
          marketTickers: [...new Set(marketTickers)],
          sheetIds: scopedSheetIds,
          sheetIdByTicker: Object.fromEntries(
            scopedSheetIds.map((sid) => [bySheet.get(sid), sid]).filter(([t]) => t),
          ),
        },
      };
    }
  }

  return null;
}

/**
 * @param {{
 *   chart?: object | null;
 *   snapshot?: Record<string, unknown> | null;
 *   dataSheets?: Record<string, object> | null;
 *   liveFeedSource?: unknown;
 * }} opts
 */
export function resolveChartLiveEligibility(opts = {}) {
  const config = buildChartLivePublishConfig(opts);
  if (!config) {
    return { eligible: false, reason: "no_live_feed", config: null };
  }
  return { eligible: true, reason: "ok", config };
}
