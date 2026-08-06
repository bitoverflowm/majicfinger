/**
 * Project-level flag: which integration pull unlocked editor live for this DataSet.
 * Independent of public ChartDashboard.live_backed (published on-demand live).
 */

import {
  discoverEventCandlesticksFeedGroup,
  discoverMarketCandlesticksFeedGroup,
} from "@/lib/liveFeeds/feedConfig";
import { pollIntervalMsForPeriod } from "@/lib/liveFeeds/registry";
import { sanitizeProjectLiveFeedSource } from "@/lib/liveFeeds/sanitizeProjectLiveFeedSource";

export { sanitizeProjectLiveFeedSource };

/**
 * Build live_feed_source from workbook provenance (+ optional poll preference).
 * Prefers event candlesticks group when both exist.
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
  if (!eventGroup && !marketGroup) return null;

  const prev = sanitizeProjectLiveFeedSource(opts.previous);
  const periodInterval = eventGroup?.periodInterval || marketGroup?.periodInterval || 1;
  const pollFromOpt = Math.floor(Number(opts.pollIntervalMs));
  const pollIntervalMs =
    Number.isFinite(pollFromOpt) && pollFromOpt > 0
      ? pollFromOpt
      : prev?.pollIntervalMs || pollIntervalMsForPeriod(periodInterval);

  if (eventGroup) {
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

/**
 * True when this project should show snapshot / re-enable live UX.
 * @param {{ live_feed_source?: unknown } | null | undefined} project
 * @param {Record<string, object> | null | undefined} dataSheets
 */
export function projectHasLiveFeedSource(project, dataSheets) {
  if (sanitizeProjectLiveFeedSource(project?.live_feed_source)) return true;
  return !!(
    discoverEventCandlesticksFeedGroup(dataSheets || {}) ||
    discoverMarketCandlesticksFeedGroup(dataSheets || {})
  );
}
