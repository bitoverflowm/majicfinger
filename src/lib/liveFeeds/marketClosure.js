/**
 * Detect when tracked Kalshi markets are past trading so live polls can stop.
 */

import { extractKalshiMarketTiming, formatKalshiMarketDate } from "@/lib/kalshiLive/kalshiMarketTiming";
import {
  classifyMarketVsHistoricalCutoff,
  formatKalshiCutoffDisplay,
} from "@/lib/kalshiLive/marketTickerSearch";
import { liveFeedSheetIds } from "@/lib/liveFeeds/feedConfig";

/**
 * Statuses that mean the market is no longer open for trading / candles.
 * @param {string | undefined} status
 */
export function isKalshiMarketClosedStatus(status) {
  const s = String(status || "").trim().toLowerCase();
  return (
    s === "closed" ||
    s === "determined" ||
    s === "settled" ||
    s === "finalized" ||
    s === "amended" ||
    s === "disputed"
  );
}

/**
 * True when a market row is past trading (closed status or past close_time).
 * @param {Record<string, unknown> | null | undefined} market
 * @param {number} [nowMs]
 */
export function isKalshiMarketPastTrading(market, nowMs = Date.now()) {
  const timing = extractKalshiMarketTiming(market);
  if (isKalshiMarketClosedStatus(timing.status)) return true;
  const closeMs = timing.closeTime ? Date.parse(timing.closeTime) : NaN;
  // Status can lag behind close_time; once close has passed, stop treating as live.
  if (Number.isFinite(closeMs) && nowMs > closeMs + 2000) return true;
  return false;
}

/**
 * Latest close_time ISO among market rows (for closed-on display).
 * @param {Record<string, unknown>[] | null | undefined} metaRows
 * @param {Iterable<string> | null | undefined} tickers
 * @returns {{ closeTimeIso: string | null; closeTimeMs: number | null; closeDateLabel: string }}
 */
export function latestCloseTimeAmongTickers(metaRows, tickers) {
  const want = new Set(
    [...(tickers || [])].map((t) => String(t || "").trim().toUpperCase()).filter(Boolean),
  );
  let bestIso = null;
  let bestMs = null;
  for (const row of Array.isArray(metaRows) ? metaRows : []) {
    const t = String(row?.ticker || row?.market_ticker || "")
      .trim()
      .toUpperCase();
    if (want.size && !want.has(t)) continue;
    const timing = extractKalshiMarketTiming(row);
    const iso = timing.closeTime || null;
    if (!iso) continue;
    const ms = Date.parse(iso);
    if (!Number.isFinite(ms)) continue;
    if (bestMs == null || ms > bestMs) {
      bestMs = ms;
      bestIso = iso;
    }
  }
  return {
    closeTimeIso: bestIso,
    closeTimeMs: bestMs,
    closeDateLabel: bestIso
      ? formatKalshiMarketDate(bestIso) || formatKalshiCutoffDisplay(bestIso)
      : "",
  };
}

/**
 * Where the full archive lives for a closed event, based on Kalshi live/historical cutoff.
 * - ended before cutoff → Kalshi Historical v2
 * - opened after cutoff (now closed) → Kalshi Live
 * - spans cutoff → both
 *
 * @param {Record<string, unknown>[] | null | undefined} metaRows
 * @param {Iterable<string> | null | undefined} trackedTickers
 * @param {number | null | undefined} cutoffMs
 * @returns {"historical_v2" | "live" | "both" | "unknown"}
 */
export function resolveClosedMarketArchiveIntegration(metaRows, trackedTickers, cutoffMs) {
  if (!Number.isFinite(Number(cutoffMs))) return "unknown";
  const ms = Number(cutoffMs);
  const tracked = [
    ...new Set(
      [...(trackedTickers || [])]
        .map((t) => String(t || "").trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
  /** @type {Map<string, Record<string, unknown>>} */
  const byTicker = new Map();
  for (const row of Array.isArray(metaRows) ? metaRows : []) {
    const t = String(row?.ticker || row?.market_ticker || "")
      .trim()
      .toUpperCase();
    if (t) byTicker.set(t, row);
  }

  /** @type {Set<"historical_v2" | "live" | "both" | "unknown">} */
  const targets = new Set();
  const rows = tracked.length
    ? tracked.map((t) => byTicker.get(t)).filter(Boolean)
    : [...byTicker.values()];

  for (const row of rows) {
    const timing = extractKalshiMarketTiming(row);
    const rel = classifyMarketVsHistoricalCutoff(
      { openTime: timing.openTime, closeTime: timing.closeTime },
      ms,
    );
    if (rel === "ended_before_cutoff") targets.add("historical_v2");
    else if (rel === "fully_after_cutoff") targets.add("live");
    else if (rel === "spans_cutoff") targets.add("both");
    else {
      const closeMs = timing.closeTime ? Date.parse(timing.closeTime) : NaN;
      if (Number.isFinite(closeMs)) {
        targets.add(closeMs < ms ? "historical_v2" : "live");
      } else {
        targets.add("unknown");
      }
    }
  }

  if (!targets.size) return "unknown";
  if (targets.has("both") || (targets.has("historical_v2") && targets.has("live"))) {
    return "both";
  }
  if (targets.has("historical_v2") && !targets.has("unknown")) return "historical_v2";
  if (targets.has("live") && !targets.has("unknown")) return "live";
  if (targets.has("historical_v2")) return "historical_v2";
  if (targets.has("live")) return "live";
  return "unknown";
}

/**
 * Display labels for archive integrations.
 * @param {"historical_v2" | "live" | "both" | "unknown"} target
 * @returns {string}
 */
export function closedMarketArchiveIntegrationLabel(target) {
  if (target === "historical_v2") return "Kalshi Historical v2";
  if (target === "live") return "Kalshi Live";
  if (target === "both") return "Kalshi Live and Kalshi Historical v2";
  return "Kalshi Live or Kalshi Historical v2";
}

/**
 * Evaluate closure across tickers this live feed is tracking (sheet map keys).
 *
 * @param {Record<string, unknown>[] | null | undefined} metaRows
 * @param {Iterable<string> | null | undefined} trackedTickers
 * @param {number} [nowMs]
 * @returns {{
 *   allClosed: boolean;
 *   anyClosed: boolean;
 *   closedTickers: string[];
 *   openTickers: string[];
 *   missingTickers: string[];
 * }}
 */
export function evaluateTrackedMarketsClosure(metaRows, trackedTickers, nowMs = Date.now()) {
  const tracked = [
    ...new Set(
      [...(trackedTickers || [])]
        .map((t) => String(t || "").trim().toUpperCase())
        .filter(Boolean),
    ),
  ];

  if (!tracked.length) {
    return {
      allClosed: false,
      anyClosed: false,
      closedTickers: [],
      openTickers: [],
      missingTickers: [],
    };
  }

  /** @type {Map<string, Record<string, unknown>>} */
  const byTicker = new Map();
  for (const row of Array.isArray(metaRows) ? metaRows : []) {
    const t = String(row?.ticker || row?.market_ticker || "")
      .trim()
      .toUpperCase();
    if (t) byTicker.set(t, row);
  }

  /** @type {string[]} */
  const closedTickers = [];
  /** @type {string[]} */
  const openTickers = [];
  /** @type {string[]} */
  const missingTickers = [];

  for (const t of tracked) {
    const row = byTicker.get(t);
    if (!row) {
      missingTickers.push(t);
      continue;
    }
    if (isKalshiMarketPastTrading(row, nowMs)) closedTickers.push(t);
    else openTickers.push(t);
  }

  const allClosed =
    missingTickers.length === 0 &&
    openTickers.length === 0 &&
    closedTickers.length === tracked.length;

  return {
    allClosed,
    anyClosed: closedTickers.length > 0,
    closedTickers,
    openTickers,
    missingTickers,
  };
}

/**
 * Prefer fresh tick meta rows; fill gaps from the markets metadata sheet so a failed
 * meta refresh still ends the feed when the market is already closed in-sheet.
 *
 * @param {Record<string, unknown>[] | null | undefined} tickMetaRows
 * @param {Record<string, unknown>[] | null | undefined} sheetMetaRows
 * @returns {Record<string, unknown>[]}
 */
export function mergeMarketMetaRowsForClosure(tickMetaRows, sheetMetaRows) {
  /** @type {Map<string, Record<string, unknown>>} */
  const byTicker = new Map();
  for (const row of Array.isArray(sheetMetaRows) ? sheetMetaRows : []) {
    const t = String(row?.ticker || row?.market_ticker || "")
      .trim()
      .toUpperCase();
    if (t) byTicker.set(t, row);
  }
  for (const row of Array.isArray(tickMetaRows) ? tickMetaRows : []) {
    const t = String(row?.ticker || row?.market_ticker || "")
      .trim()
      .toUpperCase();
    if (t) byTicker.set(t, row);
  }
  return [...byTicker.values()];
}

/**
 * @param {import("@/lib/liveFeeds/feedConfig").LiveFeedConfig} feed
 * @param {{
 *   reason?: string;
 *   closedTickers?: string[];
 *   message?: string;
 *   endedAt?: number;
 * }} [partial]
 */
export function buildLiveFeedEndedStamp(feed, partial = {}) {
  const reason = String(partial.reason || "markets_closed");
  const closedTickers = Array.isArray(partial.closedTickers)
    ? partial.closedTickers.map((t) => String(t).toUpperCase())
    : [];
  const endedAt = Number(partial.endedAt) || Date.now();
  const message =
    String(partial.message || "").trim() ||
    (closedTickers.length === 1
      ? `Market ${closedTickers[0]} closed · live feed stopped`
      : `Markets closed · live feed stopped`);
  return {
    reason,
    endedAt,
    closedTickers,
    message,
    feedId: feed?.id || null,
    eventTicker: feed?.params?.eventTicker || null,
  };
}

/**
 * @param {Record<string, object>} dataSheets
 * @param {import("@/lib/liveFeeds/feedConfig").LiveFeedConfig} feed
 * @param {ReturnType<typeof buildLiveFeedEndedStamp>} ended
 */
export function stampLiveFeedEndedOnSheets(dataSheets, feed, ended) {
  const next = { ...(dataSheets || {}) };
  for (const sheetId of liveFeedSheetIds(feed)) {
    const sheet = next[sheetId];
    if (!sheet) continue;
    const patchLiveFeed = (lf) => {
      if (!lf || typeof lf !== "object") return lf;
      return {
        ...lf,
        status: "ended",
        isRunning: false,
        endedReason: ended?.reason || "markets_closed",
        liveFeedEnded: ended,
      };
    };
    next[sheetId] = {
      ...sheet,
      liveFeedEnded: ended,
      ...(sheet.liveFeed ? { liveFeed: patchLiveFeed(sheet.liveFeed) } : {}),
      ...(sheet.saveMeta?.liveFeed
        ? { saveMeta: { ...sheet.saveMeta, liveFeed: patchLiveFeed(sheet.saveMeta.liveFeed) } }
        : {}),
      ...(sheet.provenance?.liveFeed
        ? {
            provenance: {
              ...sheet.provenance,
              liveFeed: patchLiveFeed(sheet.provenance.liveFeed),
            },
          }
        : {}),
    };
  }
  return next;
}

/**
 * Clear ended stamp when (re)starting a live feed.
 * @param {Record<string, object>} dataSheets
 * @param {import("@/lib/liveFeeds/feedConfig").LiveFeedConfig} feed
 */
export function clearLiveFeedEndedOnSheets(dataSheets, feed) {
  const next = { ...(dataSheets || {}) };
  for (const sheetId of liveFeedSheetIds(feed)) {
    const sheet = next[sheetId];
    if (!sheet || sheet.liveFeedEnded == null) continue;
    next[sheetId] = {
      ...sheet,
      liveFeedEnded: null,
    };
  }
  return next;
}
