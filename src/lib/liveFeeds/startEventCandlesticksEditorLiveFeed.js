import { toast } from "sonner";
import {
  createLiveFeedConfig,
  discoverEventCandlesticksFeedGroup,
  discoverMarketCandlesticksFeedGroup,
  discoverOrderbookFeedGroup,
  discoverTradesFeedGroup,
} from "@/lib/liveFeeds/feedConfig";
import { evaluateTrackedMarketsClosure } from "@/lib/liveFeeds/marketClosure";
import {
  describeCandlePeriod,
  LIVE_FEED_POLL_FREQUENCY_OPTIONS,
  clampLiveFeedPollIntervalMs,
  clampLiveFeedPollIntervalMsForEndpoint,
  pollIntervalMsForPeriod,
} from "@/lib/liveFeeds/registry";

/**
 * True when a dashboard draft/list row has a non-empty publish slug.
 * @param {{ public_slug?: unknown } | null | undefined} dash
 */
export function dashboardHasPublishedSlug(dash) {
  return !!String(dash?.public_slug || "").trim();
}

/**
 * Whether any dashboard linked to this project is published (private or public).
 * @param {unknown[]} dashboards
 * @param {string | null | undefined} dataSetId
 */
export function projectHasPublishedLiveDashboard(dashboards, dataSetId) {
  const ds = String(dataSetId || "").trim();
  if (!ds || !Array.isArray(dashboards)) return false;
  return dashboards.some((d) => {
    if (!dashboardHasPublishedSlug(d)) return false;
    return String(d?.data_set_id || "").trim() === ds;
  });
}

/**
 * Fetch the signed-in user's dashboards and detect a published one for this project.
 * @param {{ userId: string; dataSetId: string }} opts
 * @returns {Promise<boolean>}
 */
export async function fetchProjectHasPublishedDashboard({ userId, dataSetId }) {
  const uid = String(userId || "").trim();
  const ds = String(dataSetId || "").trim();
  if (!uid || !ds) return false;
  try {
    const res = await fetch(`/api/chart-dashboards?uid=${encodeURIComponent(uid)}`, {
      credentials: "include",
    });
    const j = await res.json().catch(() => ({}));
    if (!j?.success || !Array.isArray(j.data)) return false;
    return projectHasPublishedLiveDashboard(j.data, ds);
  } catch {
    return false;
  }
}

/**
 * @param {number} period
 * @param {number} pollMs
 * @param {string} [reason]
 */
function toastLiveFeedStarted(period, pollMs, reason) {
  const candleLabel = describeCandlePeriod(period);
  const freq =
    LIVE_FEED_POLL_FREQUENCY_OPTIONS.find((o) => o.valueMs === pollMs)?.label ||
    `every ${Math.round(pollMs / 60_000)}m`;
  const prefix =
    reason === "published_dashboard" || reason === "published_project"
      ? "Live feed resumed"
      : "Live feed started";
  toast.success(`${prefix} · ${candleLabel} candles · ${freq.toLowerCase()}`);
}

/**
 * Start (or no-op) the editor ephemeral Kalshi event-candlesticks live feed.
 * Idempotent when a matching feed is already running.
 *
 * @param {{
 *   dataSheets?: Record<string, unknown> | null;
 *   liveFeedActions?: { start?: (cfg: object) => string | null } | null;
 *   liveFeedState?: { feedsById?: Record<string, { isRunning?: boolean; params?: { eventTicker?: string } }> } | null;
 *   pollIntervalMs?: number | null;
 *   toastOnStart?: boolean;
 *   reason?: "published_project" | "published_dashboard" | "manual";
 * }} opts
 * @returns {{ started: boolean; feedId?: string | null; skipped?: string }}
 */
export function startEventCandlesticksEditorLiveFeed(opts = {}) {
  const dataSheets = opts.dataSheets && typeof opts.dataSheets === "object" ? opts.dataSheets : {};
  const liveFeedActions = opts.liveFeedActions;
  const liveFeedState = opts.liveFeedState;
  const group = discoverEventCandlesticksFeedGroup(dataSheets);
  if (!group?.eventTicker) {
    return { started: false, skipped: "no_group" };
  }
  if (typeof liveFeedActions?.start !== "function") {
    return { started: false, skipped: "no_actions" };
  }

  const eventTicker = String(group.eventTicker || "").toUpperCase();
  const existing = Object.values(liveFeedState?.feedsById || {}).find(
    (f) =>
      f?.isRunning &&
      f?.endpoint === "event_candlesticks" &&
      String(f?.params?.eventTicker || "").toUpperCase() === eventTicker,
  );
  if (existing) {
    return { started: false, feedId: null, skipped: "already_running" };
  }

  const metaId = group.sheets?.marketsMetadataSheetId;
  const metaSheet = metaId ? dataSheets?.[metaId] : null;
  const ended = metaSheet?.liveFeedEnded;
  if (ended?.reason === "markets_closed") {
    return { started: false, skipped: "markets_closed" };
  }
  const tracked = Object.keys(group.sheets?.marketSheetIdsByTicker || {});
  const closure = evaluateTrackedMarketsClosure(metaSheet?.data, tracked);
  if (closure?.allClosed) {
    return { started: false, skipped: "markets_closed" };
  }

  const period = Math.floor(Number(group.periodInterval)) || 1;
  const defaultPollMs = pollIntervalMsForPeriod(period);
  const pollMs = clampLiveFeedPollIntervalMs(
    Math.floor(Number(opts.pollIntervalMs)) || defaultPollMs,
    period,
  );
  const cfg = createLiveFeedConfig({
    integration: "kalshi-live",
    endpoint: "event_candlesticks",
    status: "ephemeral",
    periodInterval: period,
    pollIntervalMs: pollMs,
    params: {
      eventTicker: group.eventTicker,
      seriesTicker: group.seriesTicker,
      periodInterval: period,
    },
    sheets: group.sheets,
  });
  if (!cfg) {
    return { started: false, skipped: "invalid_config" };
  }

  const feedId = liveFeedActions.start(cfg);
  if (!feedId) {
    return { started: false, skipped: "start_failed" };
  }

  if (opts.toastOnStart !== false) {
    toastLiveFeedStarted(period, pollMs, opts.reason);
  }

  return { started: true, feedId };
}

/**
 * Start editor ephemeral live feed for Market Candlesticks.
 *
 * @param {{
 *   dataSheets?: Record<string, unknown> | null;
 *   liveFeedActions?: { start?: (cfg: object) => string | null } | null;
 *   liveFeedState?: { feedsById?: Record<string, { isRunning?: boolean; endpoint?: string; params?: { marketTickers?: string[] } }> } | null;
 *   marketTickers?: string[] | null;
 *   pollIntervalMs?: number | null;
 *   toastOnStart?: boolean;
 *   reason?: "published_project" | "published_dashboard" | "manual";
 * }} opts
 * @returns {{ started: boolean; feedId?: string | null; skipped?: string }}
 */
export function startMarketCandlesticksEditorLiveFeed(opts = {}) {
  const dataSheets = opts.dataSheets && typeof opts.dataSheets === "object" ? opts.dataSheets : {};
  const liveFeedActions = opts.liveFeedActions;
  const liveFeedState = opts.liveFeedState;
  const wantTickers = Array.isArray(opts.marketTickers)
    ? [
        ...new Set(
          opts.marketTickers.map((t) => String(t || "").trim().toUpperCase()).filter(Boolean),
        ),
      ]
    : [];

  const group = discoverMarketCandlesticksFeedGroup(dataSheets, {
    marketTickers: wantTickers.length ? wantTickers : undefined,
  });
  if (!group?.marketTickers?.length) {
    return { started: false, skipped: "no_group" };
  }
  if (typeof liveFeedActions?.start !== "function") {
    return { started: false, skipped: "no_actions" };
  }

  /** @type {Record<string, string>} */
  const sheetMap = { ...(group.sheets.marketSheetIdsByTicker || {}) };
  const trackTickers = wantTickers.length
    ? wantTickers.filter((t) => sheetMap[t])
    : Object.keys(sheetMap);
  if (!trackTickers.length) {
    return { started: false, skipped: "no_tickers" };
  }

  const existing = Object.values(liveFeedState?.feedsById || {}).find((f) => {
    if (!f?.isRunning || f?.endpoint !== "candlesticks") return false;
    const running = new Set(
      (Array.isArray(f?.params?.marketTickers) ? f.params.marketTickers : []).map((t) =>
        String(t || "").trim().toUpperCase(),
      ),
    );
    return trackTickers.some((t) => running.has(t));
  });
  if (existing) {
    return { started: false, feedId: null, skipped: "already_running" };
  }

  for (const t of trackTickers) {
    const sid = sheetMap[t];
    const sheet = sid ? dataSheets?.[sid] : null;
    if (sheet?.liveFeedEnded?.reason === "markets_closed") {
      return { started: false, skipped: "markets_closed" };
    }
  }

  /** @type {Record<string, string>} */
  const trackedSheets = {};
  for (const t of trackTickers) {
    if (sheetMap[t]) trackedSheets[t] = sheetMap[t];
  }

  const period = Math.floor(Number(group.periodInterval)) || 1;
  const defaultPollMs = pollIntervalMsForPeriod(period);
  const pollMs = clampLiveFeedPollIntervalMs(
    Math.floor(Number(opts.pollIntervalMs)) || defaultPollMs,
    period,
  );
  const cfg = createLiveFeedConfig({
    integration: "kalshi-live",
    endpoint: "candlesticks",
    status: "ephemeral",
    periodInterval: period,
    pollIntervalMs: pollMs,
    params: {
      marketTickers: trackTickers,
      periodInterval: period,
    },
    sheets: {
      ...(group.sheets.marketsMetadataSheetId
        ? { marketsMetadataSheetId: group.sheets.marketsMetadataSheetId }
        : {}),
      marketSheetIdsByTicker: trackedSheets,
    },
  });
  if (!cfg) {
    return { started: false, skipped: "invalid_config" };
  }

  const feedId = liveFeedActions.start(cfg);
  if (!feedId) {
    return { started: false, skipped: "start_failed" };
  }

  if (opts.toastOnStart !== false) {
    toastLiveFeedStarted(period, pollMs, opts.reason);
  }

  return { started: true, feedId };
}

/**
 * Start editor ephemeral live feed for Market Trades.
 *
 * @param {{
 *   dataSheets?: Record<string, unknown> | null;
 *   liveFeedActions?: { start?: (cfg: object) => string | null } | null;
 *   liveFeedState?: { feedsById?: Record<string, { isRunning?: boolean; endpoint?: string; params?: { marketTickers?: string[] } }> } | null;
 *   marketTickers?: string[] | null;
 *   pollIntervalMs?: number | null;
 *   toastOnStart?: boolean;
 *   reason?: "published_project" | "published_dashboard" | "manual";
 * }} opts
 * @returns {{ started: boolean; feedId?: string | null; skipped?: string }}
 */
export function startTradesEditorLiveFeed(opts = {}) {
  const dataSheets = opts.dataSheets && typeof opts.dataSheets === "object" ? opts.dataSheets : {};
  const liveFeedActions = opts.liveFeedActions;
  const liveFeedState = opts.liveFeedState;
  const wantTickers = Array.isArray(opts.marketTickers)
    ? [
        ...new Set(
          opts.marketTickers.map((t) => String(t || "").trim().toUpperCase()).filter(Boolean),
        ),
      ]
    : [];

  const group = discoverTradesFeedGroup(dataSheets, {
    marketTickers: wantTickers.length ? wantTickers : undefined,
  });
  if (!group?.marketTickers?.length) {
    return { started: false, skipped: "no_group" };
  }
  if (typeof liveFeedActions?.start !== "function") {
    return { started: false, skipped: "no_actions" };
  }

  /** @type {Record<string, string>} */
  const sheetMap = { ...(group.sheets.marketSheetIdsByTicker || {}) };
  const trackTickers = wantTickers.length
    ? wantTickers.filter((t) => sheetMap[t])
    : Object.keys(sheetMap);
  if (!trackTickers.length) {
    return { started: false, skipped: "no_tickers" };
  }

  const existing = Object.values(liveFeedState?.feedsById || {}).find((f) => {
    if (!f?.isRunning || f?.endpoint !== "trades") return false;
    const running = new Set(
      (Array.isArray(f?.params?.marketTickers) ? f.params.marketTickers : []).map((t) =>
        String(t || "").trim().toUpperCase(),
      ),
    );
    return trackTickers.some((t) => running.has(t));
  });
  if (existing) {
    return { started: false, feedId: null, skipped: "already_running" };
  }

  for (const t of trackTickers) {
    const sid = sheetMap[t];
    const sheet = sid ? dataSheets?.[sid] : null;
    if (sheet?.liveFeedEnded?.reason === "markets_closed") {
      return { started: false, skipped: "markets_closed" };
    }
  }

  /** @type {Record<string, string>} */
  const trackedSheets = {};
  for (const t of trackTickers) {
    if (sheetMap[t]) trackedSheets[t] = sheetMap[t];
  }

  const pollMs = clampLiveFeedPollIntervalMsForEndpoint(
    Math.floor(Number(opts.pollIntervalMs)) || 60_000,
    "kalshi-live",
    "trades",
  );
  const cfg = createLiveFeedConfig({
    integration: "kalshi-live",
    endpoint: "trades",
    status: "ephemeral",
    pollIntervalMs: pollMs,
    params: {
      marketTickers: trackTickers,
    },
    sheets: {
      marketSheetIdsByTicker: trackedSheets,
    },
  });
  if (!cfg) {
    return { started: false, skipped: "invalid_config" };
  }

  const feedId = liveFeedActions.start(cfg);
  if (!feedId) {
    return { started: false, skipped: "start_failed" };
  }

  if (opts.toastOnStart !== false) {
    const freq =
      LIVE_FEED_POLL_FREQUENCY_OPTIONS.find((o) => o.valueMs === pollMs)?.label ||
      `every ${Math.round(pollMs / 1000)}s`;
    const prefix =
      opts.reason === "published_dashboard" || opts.reason === "published_project"
        ? "Live feed resumed"
        : "Live feed started";
    toast.success(`${prefix} · market trades · ${freq.toLowerCase()}`);
  }

  return { started: true, feedId };
}

/**
 * Start editor ephemeral live feed for Market Orderbook.
 *
 * @param {{
 *   dataSheets?: Record<string, unknown> | null;
 *   liveFeedActions?: { start?: (cfg: object) => string | null } | null;
 *   liveFeedState?: { feedsById?: Record<string, { isRunning?: boolean; endpoint?: string; params?: { marketTickers?: string[] } }> } | null;
 *   marketTickers?: string[] | null;
 *   pollIntervalMs?: number | null;
 *   depth?: number | null;
 *   toastOnStart?: boolean;
 *   reason?: "published_project" | "published_dashboard" | "manual";
 * }} opts
 * @returns {{ started: boolean; feedId?: string | null; skipped?: string }}
 */
export function startOrderbookEditorLiveFeed(opts = {}) {
  const dataSheets = opts.dataSheets && typeof opts.dataSheets === "object" ? opts.dataSheets : {};
  const liveFeedActions = opts.liveFeedActions;
  const liveFeedState = opts.liveFeedState;
  const wantTickers = Array.isArray(opts.marketTickers)
    ? [
        ...new Set(
          opts.marketTickers.map((t) => String(t || "").trim().toUpperCase()).filter(Boolean),
        ),
      ]
    : [];

  const group = discoverOrderbookFeedGroup(dataSheets, {
    marketTickers: wantTickers.length ? wantTickers : undefined,
  });
  if (!group?.marketTickers?.length) {
    return { started: false, skipped: "no_group" };
  }
  if (typeof liveFeedActions?.start !== "function") {
    return { started: false, skipped: "no_actions" };
  }

  /** @type {Record<string, string>} */
  const sheetMap = { ...(group.sheets.marketSheetIdsByTicker || {}) };
  const trackTickers = wantTickers.length
    ? wantTickers.filter((t) => sheetMap[t])
    : Object.keys(sheetMap);
  if (!trackTickers.length) {
    return { started: false, skipped: "no_tickers" };
  }

  const existing = Object.values(liveFeedState?.feedsById || {}).find((f) => {
    if (!f?.isRunning || f?.endpoint !== "orderbook") return false;
    const running = new Set(
      (Array.isArray(f?.params?.marketTickers) ? f.params.marketTickers : []).map((t) =>
        String(t || "").trim().toUpperCase(),
      ),
    );
    return trackTickers.some((t) => running.has(t));
  });
  if (existing) {
    return { started: false, feedId: null, skipped: "already_running" };
  }

  for (const t of trackTickers) {
    const sid = sheetMap[t];
    const sheet = sid ? dataSheets?.[sid] : null;
    if (sheet?.liveFeedEnded?.reason === "markets_closed") {
      return { started: false, skipped: "markets_closed" };
    }
  }

  /** @type {Record<string, string>} */
  const trackedSheets = {};
  for (const t of trackTickers) {
    if (sheetMap[t]) trackedSheets[t] = sheetMap[t];
  }

  const pollMs = clampLiveFeedPollIntervalMsForEndpoint(
    Math.floor(Number(opts.pollIntervalMs)) || 60_000,
    "kalshi-live",
    "orderbook",
  );
  const depthRaw = Math.floor(Number(opts.depth ?? group.depth));
  const cfg = createLiveFeedConfig({
    integration: "kalshi-live",
    endpoint: "orderbook",
    status: "ephemeral",
    pollIntervalMs: pollMs,
    params: {
      marketTickers: trackTickers,
      ...(Number.isFinite(depthRaw) && depthRaw >= 0 && depthRaw <= 100
        ? { depth: depthRaw }
        : {}),
    },
    sheets: {
      marketSheetIdsByTicker: trackedSheets,
    },
  });
  if (!cfg) {
    return { started: false, skipped: "invalid_config" };
  }

  const feedId = liveFeedActions.start(cfg);
  if (!feedId) {
    return { started: false, skipped: "start_failed" };
  }

  if (opts.toastOnStart !== false) {
    const freq =
      LIVE_FEED_POLL_FREQUENCY_OPTIONS.find((o) => o.valueMs === pollMs)?.label ||
      `every ${Math.round(pollMs / 1000)}s`;
    const prefix =
      opts.reason === "published_dashboard" || opts.reason === "published_project"
        ? "Live feed resumed"
        : "Live feed started";
    toast.success(`${prefix} · market orderbook · ${freq.toLowerCase()}`);
  }

  return { started: true, feedId };
}

/**
 * After project sheets hydrate: if a published dashboard exists for the project
 * and sheets are live-capable, auto-start the editor ephemeral feed.
 *
 * @param {{
 *   userId?: string | null;
 *   dataSetId?: string | null;
 *   dataSheets?: Record<string, unknown> | null;
 *   liveFeedActions?: object | null;
 *   liveFeedState?: object | null;
 *   publishedHint?: boolean;
 * }} opts
 */
export async function maybeAutoStartPublishedProjectLiveFeed(opts = {}) {
  const dataSheets = opts.dataSheets;
  const eventGroup = discoverEventCandlesticksFeedGroup(dataSheets || {});
  const marketGroup = !eventGroup
    ? discoverMarketCandlesticksFeedGroup(dataSheets || {})
    : null;
  const tradesGroup =
    !eventGroup && !marketGroup ? discoverTradesFeedGroup(dataSheets || {}) : null;
  const orderbookGroup =
    !eventGroup && !marketGroup && !tradesGroup
      ? discoverOrderbookFeedGroup(dataSheets || {})
      : null;
  if (!eventGroup && !marketGroup && !tradesGroup && !orderbookGroup) {
    return { started: false, skipped: "not_live_capable" };
  }

  let published = opts.publishedHint === true;
  if (!published) {
    published = await fetchProjectHasPublishedDashboard({
      userId: String(opts.userId || ""),
      dataSetId: String(opts.dataSetId || ""),
    });
  }
  if (!published) return { started: false, skipped: "not_published" };

  if (eventGroup) {
    return startEventCandlesticksEditorLiveFeed({
      dataSheets,
      liveFeedActions: opts.liveFeedActions,
      liveFeedState: opts.liveFeedState,
      reason: "published_project",
    });
  }

  if (marketGroup) {
    return startMarketCandlesticksEditorLiveFeed({
      dataSheets,
      liveFeedActions: opts.liveFeedActions,
      liveFeedState: opts.liveFeedState,
      reason: "published_project",
    });
  }

  if (tradesGroup) {
    return startTradesEditorLiveFeed({
      dataSheets,
      liveFeedActions: opts.liveFeedActions,
      liveFeedState: opts.liveFeedState,
      reason: "published_project",
    });
  }

  return startOrderbookEditorLiveFeed({
    dataSheets,
    liveFeedActions: opts.liveFeedActions,
    liveFeedState: opts.liveFeedState,
    reason: "published_project",
  });
}
