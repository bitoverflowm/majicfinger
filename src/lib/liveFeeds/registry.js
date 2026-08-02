/**
 * Live REST-poll feed registry.
 * v1 allowlist: kalshi-live / event_candlesticks only.
 * Add entries here when expanding to other endpoints / integrations.
 */

/** @typedef {"rest_poll"} LiveFeedTransport */
/** @typedef {"ephemeral" | "persisted" | "paused"} LiveFeedStatus */
/** @typedef {"kalshi_candlestick_upsert"} LiveFeedMergeStrategy */

/**
 * @typedef {object} LiveFeedEndpointDef
 * @property {string} integration
 * @property {string} endpoint
 * @property {LiveFeedTransport} transport
 * @property {LiveFeedMergeStrategy} merge
 * @property {number[]} allowedPeriodIntervals  Kalshi minutes: 1 | 60 | 1440
 * @property {number} defaultPeriodInterval
 * @property {number} defaultPollIntervalMs
 * @property {number} minPollIntervalMs
 * @property {number} lookbackPeriods  Incremental window size in candle periods
 * @property {number} maxConcurrentEphemeralPerTab
 * @property {number} softRowCapPerSheet
 */

/** @type {Record<string, LiveFeedEndpointDef>} */
export const LIVE_FEED_REGISTRY = {
  "kalshi-live:event_candlesticks": {
    integration: "kalshi-live",
    endpoint: "event_candlesticks",
    transport: "rest_poll",
    merge: "kalshi_candlestick_upsert",
    allowedPeriodIntervals: [1, 60, 1440],
    defaultPeriodInterval: 1,
    defaultPollIntervalMs: 60_000,
    minPollIntervalMs: 15_000,
    lookbackPeriods: 3,
    maxConcurrentEphemeralPerTab: 2,
    softRowCapPerSheet: 2000,
  },
};

/**
 * @param {string} integration
 * @param {string} endpoint
 * @returns {string}
 */
export function liveFeedRegistryKey(integration, endpoint) {
  return `${String(integration || "").trim()}:${String(endpoint || "").trim()}`;
}

/**
 * @param {string} integration
 * @param {string} endpoint
 * @returns {LiveFeedEndpointDef | null}
 */
export function getLiveFeedEndpointDef(integration, endpoint) {
  const key = liveFeedRegistryKey(integration, endpoint);
  return LIVE_FEED_REGISTRY[key] || null;
}

/**
 * @param {string} integration
 * @param {string} endpoint
 * @returns {boolean}
 */
export function isLiveFeedAllowed(integration, endpoint) {
  return !!getLiveFeedEndpointDef(integration, endpoint);
}

/**
 * Map Kalshi period_interval (minutes) → default poll interval ms.
 * @param {number} periodIntervalMinutes
 * @returns {number}
 */
export function pollIntervalMsForPeriod(periodIntervalMinutes) {
  const m = Math.floor(Number(periodIntervalMinutes));
  if (m === 1) return 60_000;
  if (m === 60) return 60 * 60_000;
  if (m === 1440) return 24 * 60 * 60_000;
  return 60_000;
}

/**
 * Human label for Kalshi candle period_interval (minutes).
 * @param {number} periodIntervalMinutes
 * @returns {string}
 */
export function describeCandlePeriod(periodIntervalMinutes) {
  const m = Math.floor(Number(periodIntervalMinutes));
  if (m === 1) return "1 minute";
  if (m === 60) return "1 hour";
  if (m === 1440) return "1 day";
  return `${m} minute`;
}

/** How often the live feed may poll (independent of candle size). */
export const LIVE_FEED_POLL_FREQUENCY_OPTIONS = [
  { valueMs: 60_000, label: "Every 1 minute" },
  { valueMs: 5 * 60_000, label: "Every 5 minutes" },
  { valueMs: 15 * 60_000, label: "Every 15 minutes" },
  { valueMs: 60 * 60_000, label: "Every 1 hour" },
  { valueMs: 24 * 60 * 60_000, label: "Every 1 day" },
  { valueMs: 7 * 24 * 60 * 60_000, label: "Every 1 week" },
  { valueMs: 30 * 24 * 60 * 60_000, label: "Every 1 month" },
];

/**
 * Seconds covered by one period_interval candle.
 * @param {number} periodIntervalMinutes
 * @returns {number}
 */
export function periodIntervalSec(periodIntervalMinutes) {
  const m = Math.floor(Number(periodIntervalMinutes));
  return Number.isFinite(m) && m > 0 ? m * 60 : 60;
}
