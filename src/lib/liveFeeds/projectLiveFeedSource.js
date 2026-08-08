/**
 * Project-level flag: which integration pull unlocked editor live for this DataSet.
 * Independent of public ChartDashboard.live_backed (published on-demand live).
 */

import {
  discoverEventCandlesticksFeedGroup,
  discoverMarketCandlesticksFeedGroup,
  discoverTradesFeedGroup,
} from "@/lib/liveFeeds/feedConfig";
import {
  clampLiveFeedPollIntervalMsForEndpoint,
  pollIntervalMsForPeriod,
} from "@/lib/liveFeeds/registry";
import { sanitizeProjectLiveFeedSource } from "@/lib/liveFeeds/sanitizeProjectLiveFeedSource";

export { sanitizeProjectLiveFeedSource };

/**
 * Build live_feed_source from workbook provenance (+ optional poll preference).
 * Prefers event candlesticks, then market candlesticks, then trades.
 * @param {Record<string, object> | null | undefined} dataSheets
 * @param {{
 *   pollIntervalMs?: number | null;
 *   previous?: import("./sanitizeProjectLiveFeedSource").ProjectLiveFeedSource | null;
 * }} [opts]
 */
export function buildProjectLiveFeedSourceFromSheets(dataSheets, opts = {}) {
  const eventGroup = discoverEventCandlesticksFeedGroup(dataSheets || {});
  const marketGroup = !eventGroup
    ? discoverMarketCandlesticksFeedGroup(dataSheets || {})
    : null;
  const tradesGroup =
    !eventGroup && !marketGroup ? discoverTradesFeedGroup(dataSheets || {}) : null;
  if (!eventGroup && !marketGroup && !tradesGroup) return null;

  const prev = sanitizeProjectLiveFeedSource(opts.previous);
  const periodInterval = eventGroup?.periodInterval || marketGroup?.periodInterval || 1;
  const pollFromOpt = Math.floor(Number(opts.pollIntervalMs));

  if (eventGroup) {
    const pollIntervalMs =
      Number.isFinite(pollFromOpt) && pollFromOpt > 0
        ? pollFromOpt
        : prev?.pollIntervalMs || pollIntervalMsForPeriod(periodInterval);
    return sanitizeProjectLiveFeedSource({
      enabled: true,
      integration: "kalshi-live",
      endpoint: "event_candlesticks",
      eventTicker: eventGroup.eventTicker,
      seriesTicker: eventGroup.seriesTicker,
      periodInterval: eventGroup.periodInterval,
      pollIntervalMs,
      marketsMetadataSheetId: eventGroup.sheets.marketsMetadataSheetId,
      marketCount: Object.keys(eventGroup.sheets.marketSheetIdsByTicker || {}).length,
      updatedAt: new Date().toISOString(),
    });
  }

  if (marketGroup) {
    const pollIntervalMs =
      Number.isFinite(pollFromOpt) && pollFromOpt > 0
        ? pollFromOpt
        : prev?.pollIntervalMs || pollIntervalMsForPeriod(periodInterval);
    return sanitizeProjectLiveFeedSource({
      enabled: true,
      integration: "kalshi-live",
      endpoint: "candlesticks",
      marketTickers: marketGroup.marketTickers,
      periodInterval: marketGroup.periodInterval,
      pollIntervalMs,
      marketsMetadataSheetId: marketGroup.sheets.marketsMetadataSheetId,
      marketCount: marketGroup.marketTickers.length,
      updatedAt: new Date().toISOString(),
    });
  }

  const pollIntervalMs = clampLiveFeedPollIntervalMsForEndpoint(
    Number.isFinite(pollFromOpt) && pollFromOpt > 0
      ? pollFromOpt
      : prev?.endpoint === "trades"
        ? prev.pollIntervalMs
        : 60_000,
    "kalshi-live",
    "trades",
  );
  return sanitizeProjectLiveFeedSource({
    enabled: true,
    integration: "kalshi-live",
    endpoint: "trades",
    marketTickers: tradesGroup.marketTickers,
    periodInterval: 1,
    pollIntervalMs,
    marketCount: tradesGroup.marketTickers.length,
    updatedAt: new Date().toISOString(),
  });
}

/**
 * True when this project should show snapshot / re-enable live UX.
 * @param {{ live_feed_source?: unknown } | null | undefined} project
 * @param {Record<string, object> | null | undefined} dataSheets
 */
export function projectHasLiveFeedSource(project, dataSheets) {
  if (sanitizeProjectLiveFeedSource(project?.live_feed_source)) return true;
  return !!(
    discoverEventCandlesticksFeedGroup(dataSheets || {}) ||
    discoverMarketCandlesticksFeedGroup(dataSheets || {}) ||
    discoverTradesFeedGroup(dataSheets || {})
  );
}
