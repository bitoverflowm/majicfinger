/**
 * Project-level flag: which integration pull unlocked editor live for this DataSet.
 * Independent of public ChartDashboard.live_backed (published on-demand live).
 */

import { discoverEventCandlesticksFeedGroup } from "@/lib/liveFeeds/feedConfig";
import { pollIntervalMsForPeriod } from "@/lib/liveFeeds/registry";
import { sanitizeProjectLiveFeedSource } from "@/lib/liveFeeds/sanitizeProjectLiveFeedSource";

export { sanitizeProjectLiveFeedSource };

/**
 * Build live_feed_source from workbook provenance (+ optional poll preference).
 * @param {Record<string, object> | null | undefined} dataSheets
 * @param {{
 *   pollIntervalMs?: number | null;
 *   previous?: import("./sanitizeProjectLiveFeedSource").ProjectLiveFeedSource | null;
 * }} [opts]
 */
export function buildProjectLiveFeedSourceFromSheets(dataSheets, opts = {}) {
  const group = discoverEventCandlesticksFeedGroup(dataSheets || {});
  if (!group) return null;
  const prev = sanitizeProjectLiveFeedSource(opts.previous);
  const pollFromOpt = Math.floor(Number(opts.pollIntervalMs));
  const pollIntervalMs = Number.isFinite(pollFromOpt) && pollFromOpt > 0
    ? pollFromOpt
    : prev?.pollIntervalMs || pollIntervalMsForPeriod(group.periodInterval);
  return sanitizeProjectLiveFeedSource({
    enabled: true,
    integration: "kalshi-live",
    endpoint: "event_candlesticks",
    eventTicker: group.eventTicker,
    seriesTicker: group.seriesTicker,
    periodInterval: group.periodInterval,
    pollIntervalMs,
    marketsMetadataSheetId: group.sheets.marketsMetadataSheetId,
    marketCount: Object.keys(group.sheets.marketSheetIdsByTicker || {}).length,
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
  return !!discoverEventCandlesticksFeedGroup(dataSheets || {});
}
