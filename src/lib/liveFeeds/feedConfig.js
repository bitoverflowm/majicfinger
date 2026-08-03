import {
  getLiveFeedEndpointDef,
  isLiveFeedAllowed,
  pollIntervalMsForPeriod,
} from "@/lib/liveFeeds/registry";
import { partitionCandlestickApiParams } from "@/lib/kalshiLive/candlestickCompose";

/**
 * @typedef {object} LiveFeedSheetsMap
 * @property {string} marketsMetadataSheetId
 * @property {Record<string, string>} marketSheetIdsByTicker
 */

/**
 * @typedef {object} LiveFeedConfig
 * @property {string} id
 * @property {"rest_poll"} transport
 * @property {string} integration
 * @property {string} endpoint
 * @property {"ephemeral" | "persisted" | "paused"} status
 * @property {number} pollIntervalMs
 * @property {number} periodInterval
 * @property {{ eventTicker: string; seriesTicker: string; periodInterval: number }} params
 * @property {LiveFeedSheetsMap} sheets
 * @property {string} merge
 * @property {number | null} [lastPolledAt]
 * @property {number | null} [lastSuccessAt]
 * @property {string | null} [lastError]
 * @property {boolean} [isRunning]
 * @property {boolean} [isPaused]
 */

/**
 * @returns {string}
 */
export function genLiveFeedId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `lf_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  }
  return `lf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * @param {Partial<LiveFeedConfig> & {
 *   integration: string;
 *   endpoint: string;
 *   params: { eventTicker: string; seriesTicker: string; periodInterval?: number };
 *   sheets: LiveFeedSheetsMap;
 * }} input
 * @returns {LiveFeedConfig | null}
 */
export function createLiveFeedConfig(input) {
  const integration = String(input.integration || "").trim();
  const endpoint = String(input.endpoint || "").trim();
  if (!isLiveFeedAllowed(integration, endpoint)) return null;

  const def = getLiveFeedEndpointDef(integration, endpoint);
  if (!def) return null;

  const eventTicker = String(input.params?.eventTicker || "").trim().toUpperCase();
  const seriesTicker = String(input.params?.seriesTicker || "").trim().toUpperCase();
  if (!eventTicker || !seriesTicker) return null;

  let periodInterval = Math.floor(Number(input.params?.periodInterval ?? input.periodInterval ?? def.defaultPeriodInterval));
  if (!def.allowedPeriodIntervals.includes(periodInterval)) {
    periodInterval = def.defaultPeriodInterval;
  }

  let pollIntervalMs = Math.floor(Number(input.pollIntervalMs));
  if (!Number.isFinite(pollIntervalMs) || pollIntervalMs < def.minPollIntervalMs) {
    pollIntervalMs = Math.max(def.minPollIntervalMs, pollIntervalMsForPeriod(periodInterval));
  }

  const sanitizedSheets = sanitizeLiveFeedSheetsMap(input.sheets);
  if (!sanitizedSheets) return null;

  return {
    id: String(input.id || "").trim() || genLiveFeedId(),
    transport: "rest_poll",
    integration,
    endpoint,
    status: input.status === "persisted" || input.status === "paused" ? input.status : "ephemeral",
    pollIntervalMs,
    periodInterval,
    params: {
      eventTicker,
      seriesTicker,
      periodInterval,
    },
    sheets: sanitizedSheets,
    merge: def.merge,
    lastPolledAt: input.lastPolledAt ?? null,
    lastSuccessAt: input.lastSuccessAt ?? null,
    lastError: input.lastError ?? null,
    isRunning: !!input.isRunning,
    isPaused: !!input.isPaused,
  };
}

/**
 * Drop ticker→sheet mappings that collide with the markets metadata sheet.
 * Candle upserts on the meta sheet wipe yes_sub_title rows (no end_period_ts)
 * and leave a tab still named "… · markets" filled with OHLC.
 *
 * @param {LiveFeedSheetsMap | null | undefined} sheets
 * @returns {LiveFeedSheetsMap | null}
 */
export function sanitizeLiveFeedSheetsMap(sheets) {
  const metaId = String(sheets?.marketsMetadataSheetId || "").trim();
  const byTicker =
    sheets?.marketSheetIdsByTicker && typeof sheets.marketSheetIdsByTicker === "object"
      ? sheets.marketSheetIdsByTicker
      : {};
  /** @type {Record<string, string>} */
  const marketSheetIdsByTicker = {};
  for (const [ticker, sheetId] of Object.entries(byTicker)) {
    const t = String(ticker || "").trim().toUpperCase();
    const sid = String(sheetId || "").trim();
    if (!t || !sid) continue;
    if (metaId && sid === metaId) continue;
    marketSheetIdsByTicker[t] = sid;
  }
  if (!metaId || Object.keys(marketSheetIdsByTicker).length === 0) return null;
  return {
    marketsMetadataSheetId: metaId,
    marketSheetIdsByTicker,
  };
}

/**
 * Prefer a fresh provenance-derived sheet map over a frozen LiveFeed.config map.
 * Stale maps after re-pull/delete are the main way candles get written onto markets.
 *
 * @param {Record<string, object>} dataSheets
 * @param {Pick<LiveFeedConfig, "params" | "sheets"> | null | undefined} feed
 * @returns {LiveFeedSheetsMap | null}
 */
export function resolveEventCandlesticksSheetsMap(dataSheets, feed) {
  const discovered = discoverEventCandlesticksFeedGroup(dataSheets, {
    eventTicker: feed?.params?.eventTicker,
  });
  return sanitizeLiveFeedSheetsMap(discovered?.sheets || feed?.sheets || null);
}

/**
 * Discover an event-candlesticks sheet group from workbook provenance.
 * @param {Record<string, object>} dataSheets
 * @param {{ eventTicker?: string }} [opts]
 * @returns {{ eventTicker: string; seriesTicker: string; periodInterval: number; sheets: LiveFeedSheetsMap } | null}
 */
export function discoverEventCandlesticksFeedGroup(dataSheets, opts = {}) {
  const wantEvent = String(opts.eventTicker || "").trim().toUpperCase();
  /** @type {string | null} */
  let eventTicker = null;
  /** @type {string | null} */
  let seriesTicker = null;
  /** @type {string | null} */
  let metaSheetId = null;
  /** @type {Record<string, string>} */
  const marketSheetIdsByTicker = {};
  let periodInterval = 1;

  for (const [sheetId, sheet] of Object.entries(dataSheets || {})) {
    const prov = sheet?.provenance;
    if (!prov || typeof prov !== "object") continue;
    if (String(prov.source || "") !== "kalshi-live") continue;
    if (String(prov.endpoint || "") !== "event_candlesticks") continue;

    const et = String(prov.eventTicker || "").trim().toUpperCase();
    if (!et) continue;
    if (wantEvent && et !== wantEvent) continue;

    if (!eventTicker) eventTicker = et;
    if (eventTicker !== et) continue;

    const st = String(prov.seriesTicker || "").trim().toUpperCase();
    if (st) seriesTicker = st;

    const kind = String(prov.sheetKind || "");
    if (kind === "markets_metadata") {
      metaSheetId = sheetId;
    } else if (kind === "market_candlesticks") {
      const mt = String(prov.marketTicker || sheet?.name || "").trim().toUpperCase();
      if (mt) marketSheetIdsByTicker[mt] = sheetId;
    }

    const filters = Array.isArray(prov.whereFilters) ? prov.whereFilters : [];
    const { apiParams } = partitionCandlestickApiParams(filters);
    const fromApi = Math.floor(Number(apiParams.period_interval));
    if ([1, 60, 1440].includes(fromApi)) periodInterval = fromApi;
  }

  if (!eventTicker || !seriesTicker || !metaSheetId || Object.keys(marketSheetIdsByTicker).length === 0) {
    return null;
  }

  const sheets = sanitizeLiveFeedSheetsMap({
    marketsMetadataSheetId: metaSheetId,
    marketSheetIdsByTicker,
  });
  if (!sheets) return null;

  return {
    eventTicker,
    seriesTicker,
    periodInterval,
    sheets,
  };
}

/**
 * Collect all sheet ids owned by a feed.
 * @param {LiveFeedConfig} feed
 * @returns {string[]}
 */
export function liveFeedSheetIds(feed) {
  const ids = [];
  const meta = feed?.sheets?.marketsMetadataSheetId;
  if (meta) ids.push(meta);
  for (const sid of Object.values(feed?.sheets?.marketSheetIdsByTicker || {})) {
    if (sid && !ids.includes(sid)) ids.push(sid);
  }
  return ids;
}

/**
 * Stamp liveFeed onto each sheet in the group (for persist).
 * @param {Record<string, object>} dataSheets
 * @param {LiveFeedConfig} feed
 * @returns {Record<string, object>}
 */
export function stampLiveFeedOntoSheets(dataSheets, feed) {
  const next = { ...(dataSheets || {}) };
  const persistable = {
    id: feed.id,
    transport: feed.transport,
    integration: feed.integration,
    endpoint: feed.endpoint,
    status: feed.status,
    pollIntervalMs: feed.pollIntervalMs,
    periodInterval: feed.periodInterval,
    params: feed.params,
    sheets: feed.sheets,
    merge: feed.merge,
    lastPolledAt: feed.lastPolledAt ?? null,
    lastSuccessAt: feed.lastSuccessAt ?? null,
    lastError: feed.lastError ?? null,
  };
  for (const sheetId of liveFeedSheetIds(feed)) {
    const sheet = next[sheetId];
    if (!sheet || typeof sheet !== "object") continue;
    next[sheetId] = {
      ...sheet,
      liveFeed: persistable,
      saveMeta: {
        ...(sheet.saveMeta && typeof sheet.saveMeta === "object" ? sheet.saveMeta : {}),
        liveFeed: persistable,
      },
      provenance:
        sheet.provenance && typeof sheet.provenance === "object"
          ? { ...sheet.provenance, liveFeed: persistable }
          : sheet.provenance,
    };
  }
  return next;
}

/**
 * Read persisted feeds from data_sheets (meta sheet owns canonical config).
 * @param {Record<string, object>} dataSheets
 * @returns {LiveFeedConfig[]}
 */
export function extractPersistedLiveFeedsFromSheets(dataSheets) {
  /** @type {Map<string, LiveFeedConfig>} */
  const byId = new Map();
  for (const sheet of Object.values(dataSheets || {})) {
    const raw =
      sheet?.liveFeed ||
      sheet?.saveMeta?.liveFeed ||
      sheet?.provenance?.liveFeed ||
      null;
    if (!raw || typeof raw !== "object") continue;
    if (String(raw.status || "") !== "persisted" && String(raw.status || "") !== "paused") continue;
    const cfg = createLiveFeedConfig(/** @type {any} */ (raw));
    if (!cfg) continue;
    if (!byId.has(cfg.id)) byId.set(cfg.id, cfg);
  }
  return [...byId.values()];
}
