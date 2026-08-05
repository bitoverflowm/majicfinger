/**
 * Live REST-poll feeds — public barrel.
 *
 * Editor: ephemeral browser poll via RestLiveFeedManager.
 * Public dashboards: on-demand Kalshi via /api/public/.../live (cached), not cron.
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
  sanitizeLiveFeedSheetsMap,
  resolveEventCandlesticksSheetsMap,
} from "@/lib/liveFeeds/feedConfig";

export {
  evaluateTrackedMarketsClosure,
  isKalshiMarketClosedStatus,
  isKalshiMarketPastTrading,
} from "@/lib/liveFeeds/marketClosure";

export {
  datasetHasEventCandlesticksLiveSource,
  liveBackedDashboardFields,
  resolveDatasetLiveBacked,
  resolvePublicDashboardLiveConfig,
} from "@/lib/liveFeeds/publicLiveConfig";

export {
  getCachedPublicEventCandlesticks,
  publicLiveCacheControl,
  publicLiveLookbackPeriods,
  PUBLIC_LIVE_CACHE_TTL_MS,
} from "@/lib/liveFeeds/publicLiveKalshiCache";

export { applyLiveCandleOverlay } from "@/lib/liveFeeds/applyLiveCandleOverlay";

export {
  buildProjectLiveFeedSourceFromSheets,
  projectHasLiveFeedSource,
  sanitizeProjectLiveFeedSource,
} from "@/lib/liveFeeds/projectLiveFeedSource";
