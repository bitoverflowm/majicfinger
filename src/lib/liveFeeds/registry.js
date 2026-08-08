/**
 * Live REST-poll feed registry.
 * Allowlist entries for Kalshi Live candlestick + trades endpoints.
 * Add entries here when expanding to other endpoints / integrations.
 */

/** @typedef {"rest_poll"} LiveFeedTransport */
/** @typedef {"ephemeral" | "persisted" | "paused"} LiveFeedStatus */
/** @typedef {"kalshi_candlestick_upsert" | "kalshi_trades_upsert"} LiveFeedMergeStrategy */

/**
 * @typedef {object} LiveFeedEndpointDef
 * @property {string} integration
 * @property {string} endpoint
 * @property {LiveFeedTransport} transport
 * @property {LiveFeedMergeStrategy} merge
 * @property {number[]} [allowedPeriodIntervals]  Kalshi minutes: 1 | 60 | 1440 (candles only)
 * @property {number} [defaultPeriodInterval]
 * @property {number} defaultPollIntervalMs
 * @property {number} minPollIntervalMs
 * @property {number} lookbackPeriods  Candles: window in candle periods. Trades: lookback window in seconds when sheet is empty / public seed.
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
    // Working window per market sheet — upsert drops oldest bars when over this cap.
    softRowCapPerSheet: 50_000,
  },
  "kalshi-live:candlesticks": {
    integration: "kalshi-live",
    endpoint: "candlesticks",
    transport: "rest_poll",
    merge: "kalshi_candlestick_upsert",
    allowedPeriodIntervals: [1, 60, 1440],
    defaultPeriodInterval: 1,
    defaultPollIntervalMs: 60_000,
    minPollIntervalMs: 15_000,
    lookbackPeriods: 3,
    maxConcurrentEphemeralPerTab: 2,
    softRowCapPerSheet: 50_000,
  },
  "kalshi-live:trades": {
    integration: "kalshi-live",
    endpoint: "trades",
    transport: "rest_poll",
    merge: "kalshi_trades_upsert",
    defaultPollIntervalMs: 60_000,
    // 1s for editor testing; public embeds still floor at 15s.
    minPollIntervalMs: 1_000,
    // Empty-sheet / public seed lookback window in seconds (1 hour).
    lookbackPeriods: 3_600,
    maxConcurrentEphemeralPerTab: 2,
    softRowCapPerSheet: 50_000,
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
  { valueMs: 1_000, label: "Every 1 second" },
  { valueMs: 60_000, label: "Every 1 minute" },
  { valueMs: 5 * 60_000, label: "Every 5 minutes" },
  { valueMs: 15 * 60_000, label: "Every 15 minutes" },
  { valueMs: 60 * 60_000, label: "Every 1 hour" },
  { valueMs: 24 * 60_000 * 60, label: "Every 1 day" },
  { valueMs: 7 * 24 * 60_000 * 60, label: "Every 1 week" },
  { valueMs: 30 * 24 * 60_000 * 60, label: "Every 1 month" },
];

/**
 * Poll options for non-candle feeds (e.g. trades). Includes 1s for testing;
 * still respects the endpoint's minPollIntervalMs.
 *
 * @param {string} integration
 * @param {string} endpoint
 * @returns {typeof LIVE_FEED_POLL_FREQUENCY_OPTIONS}
 */
export function filterLiveFeedPollOptionsForEndpoint(integration, endpoint) {
  const def = getLiveFeedEndpointDef(integration, endpoint);
  const minMs = Math.max(1_000, Math.floor(Number(def?.minPollIntervalMs)) || 1_000);
  return LIVE_FEED_POLL_FREQUENCY_OPTIONS.filter((o) => o.valueMs >= minMs);
}

/**
 * Clamp poll ms to an allowed option for a non-candle endpoint.
 *
 * @param {number | null | undefined} pollMs
 * @param {string} integration
 * @param {string} endpoint
 * @returns {number}
 */
export function clampLiveFeedPollIntervalMsForEndpoint(pollMs, integration, endpoint) {
  const def = getLiveFeedEndpointDef(integration, endpoint);
  const options = filterLiveFeedPollOptionsForEndpoint(integration, endpoint);
  if (!options.length) {
    return Math.max(
      Math.floor(Number(def?.minPollIntervalMs)) || 1_000,
      Math.floor(Number(def?.defaultPollIntervalMs)) || 60_000,
    );
  }
  const n = Math.floor(Number(pollMs));
  if (Number.isFinite(n) && options.some((o) => o.valueMs === n)) return n;
  const preferred = Math.floor(Number(def?.defaultPollIntervalMs)) || 60_000;
  if (options.some((o) => o.valueMs === preferred)) return preferred;
  return options[0].valueMs;
}

/**
 * Poll options allowed for a candle period_interval.
 * Refresh cannot be faster than one candle: 1m candles → ≥1m (1s is candles-incompatible);
 * 1h candles → ≥1h; 1d candles → ≥1d.
 *
 * @param {number} periodIntervalMinutes
 * @returns {typeof LIVE_FEED_POLL_FREQUENCY_OPTIONS}
 */
export function filterLiveFeedPollOptionsForPeriod(periodIntervalMinutes) {
  const minutes = Math.floor(Number(periodIntervalMinutes));
  const periodMs =
    Number.isFinite(minutes) && minutes > 0 ? minutes * 60_000 : 60_000;
  // Candles never offer sub-minute polls (min registry floor is 15s; period floor ≥1m).
  return LIVE_FEED_POLL_FREQUENCY_OPTIONS.filter(
    (o) => o.valueMs >= periodMs && o.valueMs >= 15_000,
  );
}

/**
 * Clamp a poll interval to an allowed option for the candle period.
 *
 * @param {number | null | undefined} pollMs
 * @param {number} periodIntervalMinutes
 * @returns {number}
 */
export function clampLiveFeedPollIntervalMs(pollMs, periodIntervalMinutes) {
  const options = filterLiveFeedPollOptionsForPeriod(periodIntervalMinutes);
  if (!options.length) return pollIntervalMsForPeriod(periodIntervalMinutes);
  const n = Math.floor(Number(pollMs));
  if (Number.isFinite(n) && options.some((o) => o.valueMs === n)) return n;
  const preferred = pollIntervalMsForPeriod(periodIntervalMinutes);
  if (options.some((o) => o.valueMs === preferred)) return preferred;
  return options[0].valueMs;
}

/**
 * Seconds covered by one period_interval candle.
 * @param {number} periodIntervalMinutes
 * @returns {number}
 */
export function periodIntervalSec(periodIntervalMinutes) {
  const m = Math.floor(Number(periodIntervalMinutes));
  return Number.isFinite(m) && m > 0 ? m * 60 : 60;
}
