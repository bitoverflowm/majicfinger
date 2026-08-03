/**
 * Live REST-poll feeds — public barrel.
 *
 * Expansion path (after event_candlesticks vertical slice):
 * 1. Add registry entry in registry.js (candlesticks / trades / markets / leaderboard)
 * 2. Add incremental fetch adapter (client + server)
 * 3. Add or reuse merge strategy
 * 4. Wire Start live UX for that endpoint
 * Same RestLiveFeedManager, persist, cron, and public poll paths apply.
 */

export {
  LIVE_FEED_REGISTRY,
  getLiveFeedEndpointDef,
  isLiveFeedAllowed,
  liveFeedRegistryKey,
  pollIntervalMsForPeriod,
  periodIntervalSec,
  describeCandlePeriod,
  LIVE_FEED_POLL_FREQUENCY_OPTIONS,
} from "@/lib/liveFeeds/registry";

export {
  createLiveFeedConfig,
  discoverEventCandlesticksFeedGroup,
  extractPersistedLiveFeedsFromSheets,
  stampLiveFeedOntoSheets,
  liveFeedSheetIds,
  genLiveFeedId,
} from "@/lib/liveFeeds/feedConfig";

export { solidifyLiveFeedsForSave } from "@/lib/liveFeeds/persistFeedsOnSave";

export {
  evaluateTrackedMarketsClosure,
  isKalshiMarketClosedStatus,
  isKalshiMarketPastTrading,
} from "@/lib/liveFeeds/marketClosure";
