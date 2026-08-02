import {
  createLiveFeedConfig,
  stampLiveFeedOntoSheets,
  extractPersistedLiveFeedsFromSheets,
  liveFeedSheetIds,
} from "@/lib/liveFeeds/feedConfig";

/**
 * Flip running ephemeral feeds to persisted and stamp onto sheets for save.
 *
 * @param {{
 *   dataSheets: Record<string, object>;
 *   liveFeedState?: { feedsById?: Record<string, object> };
 * }} opts
 * @returns {{
 *   dataSheets: Record<string, object>;
 *   persistedFeeds: import("@/lib/liveFeeds/feedConfig").LiveFeedConfig[];
 * }}
 */
export function solidifyLiveFeedsForSave({ dataSheets, liveFeedState }) {
  let nextSheets = { ...(dataSheets || {}) };
  /** @type {import("@/lib/liveFeeds/feedConfig").LiveFeedConfig[]} */
  const persistedFeeds = [];

  const feedsById = liveFeedState?.feedsById && typeof liveFeedState.feedsById === "object"
    ? liveFeedState.feedsById
    : {};

  for (const raw of Object.values(feedsById)) {
    if (!raw || typeof raw !== "object") continue;
    const isActive = raw.isRunning || raw.status === "ephemeral" || raw.status === "persisted";
    if (!isActive && raw.status !== "paused") continue;

    const cfg = createLiveFeedConfig({
      ...raw,
      status: raw.status === "paused" ? "paused" : "persisted",
    });
    if (!cfg) continue;

    nextSheets = stampLiveFeedOntoSheets(nextSheets, cfg);
    if (cfg.status === "persisted") persistedFeeds.push(cfg);
  }

  // Also keep any already-stamped persisted feeds that aren't in ephemeral state
  for (const existing of extractPersistedLiveFeedsFromSheets(nextSheets)) {
    if (!persistedFeeds.some((f) => f.id === existing.id)) {
      persistedFeeds.push(existing);
    }
  }

  return { dataSheets: nextSheets, persistedFeeds };
}

/**
 * @param {import("@/lib/liveFeeds/feedConfig").LiveFeedConfig} feed
 * @returns {string[]}
 */
export function sheetIdsForLiveFeed(feed) {
  return liveFeedSheetIds(feed);
}
