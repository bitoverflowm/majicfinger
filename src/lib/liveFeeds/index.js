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
  filterLiveFeedPollOptionsForPeriod,
  clampLiveFeedPollIntervalMs,
} from "@/lib/liveFeeds/registry";

export {
  createLiveFeedConfig,
  discoverEventCandlesticksFeedGroup,
  discoverMarketCandlesticksFeedGroup,
  discoverKalshiCandlesticksLiveGroup,
  extractPersistedLiveFeedsFromSheets,
  stampLiveFeedOntoSheets,
  liveFeedSheetIds,
  genLiveFeedId,
  sanitizeLiveFeedSheetsMap,
  resolveEventCandlesticksSheetsMap,
  resolveMarketCandlesticksSheetsMap,
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
  startEventCandlesticksEditorLiveFeed,
  startMarketCandlesticksEditorLiveFeed,
  maybeAutoStartPublishedProjectLiveFeed,
  dashboardHasPublishedSlug,
  projectHasPublishedLiveDashboard,
  fetchProjectHasPublishedDashboard,
} from "@/lib/liveFeeds/startEventCandlesticksEditorLiveFeed";

export {
  getCachedPublicEventCandlesticks,
  publicLiveCacheControl,
  publicLiveLookbackPeriods,
  publicLiveSeedRowCap,
  PUBLIC_LIVE_CACHE_TTL_MS,
} from "@/lib/liveFeeds/publicLiveKalshiCache";

export { applyLiveCandleOverlay } from "@/lib/liveFeeds/applyLiveCandleOverlay";

export {
  buildProjectLiveFeedSourceFromSheets,
  projectHasLiveFeedSource,
  sanitizeProjectLiveFeedSource,
} from "@/lib/liveFeeds/projectLiveFeedSource";
