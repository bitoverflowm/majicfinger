/**
 * One-shot refresh: pull recent event candlesticks and upsert into existing sheets.
 * Does not create new sheets (unlike a fresh Connect pull).
 */

import { createLiveFeedConfig, discoverEventCandlesticksFeedGroup } from "@/lib/liveFeeds/feedConfig";
import { fetchKalshiLiveEventCandlesticksIncremental } from "@/lib/liveFeeds/fetchEventCandlesticksIncremental";
import { applyKalshiCandlestickUpsertToSheets } from "@/lib/liveFeeds/merge/kalshiCandlestickUpsert";
import { getLiveFeedEndpointDef } from "@/lib/liveFeeds/registry";
import { publicLiveLookbackPeriods } from "@/lib/liveFeeds/publicLiveKalshiCache";

/**
 * @param {Record<string, object>} dataSheets
 * @param {{
 *   lookbackPeriods?: number;
 *   signal?: AbortSignal;
 * }} [opts]
 * @returns {Promise<{
 *   dataSheets: Record<string, object>;
 *   stats: object | null;
 *   group: NonNullable<ReturnType<typeof discoverEventCandlesticksFeedGroup>>;
 * }>}
 */
export async function refreshEventCandlesticksSnapshotIntoSheets(dataSheets, opts = {}) {
  const group = discoverEventCandlesticksFeedGroup(dataSheets || {});
  if (!group) {
    throw new Error("No Kalshi event-candlesticks sheets found in this project.");
  }

  const def = getLiveFeedEndpointDef("kalshi-live", "event_candlesticks");
  const softRowCap = def?.softRowCapPerSheet ?? 50_000;
  const lookbackPeriods =
    Math.floor(Number(opts.lookbackPeriods)) ||
    publicLiveLookbackPeriods(group.periodInterval);

  const feed = createLiveFeedConfig({
    integration: "kalshi-live",
    endpoint: "event_candlesticks",
    status: "ephemeral",
    periodInterval: group.periodInterval,
    params: {
      eventTicker: group.eventTicker,
      seriesTicker: group.seriesTicker,
      periodInterval: group.periodInterval,
    },
    sheets: group.sheets,
  });
  if (!feed) {
    throw new Error("Could not build live feed config for this snapshot.");
  }

  const tick = await fetchKalshiLiveEventCandlesticksIncremental({
    eventTicker: group.eventTicker,
    seriesTicker: group.seriesTicker,
    periodInterval: group.periodInterval,
    lookbackPeriods,
    signal: opts.signal,
  });

  const result = applyKalshiCandlestickUpsertToSheets(dataSheets || {}, feed, tick, {
    softRowCap,
  });

  return {
    dataSheets: result.dataSheets,
    stats: result.stats || null,
    group,
  };
}
