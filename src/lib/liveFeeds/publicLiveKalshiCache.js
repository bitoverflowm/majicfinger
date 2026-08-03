/**
 * Public on-demand Kalshi live ticks — short TTL + in-flight coalesce.
 * Many viewers of the same event share one upstream Kalshi fetch.
 */

import { fetchKalshiLiveEventCandlesticksIncrementalServer } from "@/lib/liveFeeds/fetchEventCandlesticksIncrementalServer";
import { periodIntervalSec, pollIntervalMsForPeriod } from "@/lib/liveFeeds/registry";

/** Default CDN/browser freshness for public live responses. */
export const PUBLIC_LIVE_CACHE_TTL_MS = 15_000;

/**
 * Candle periods to fetch for a public wall (not editor incremental lookback=3).
 * 1m → ~2h; 1h → ~5d; 1d → ~4mo.
 */
export function publicLiveLookbackPeriods(periodIntervalMinutes) {
  const m = Math.floor(Number(periodIntervalMinutes)) || 1;
  if (m === 1) return 120;
  if (m === 60) return 120;
  if (m === 1440) return 90;
  return 120;
}

/**
 * @typedef {{
 *   metaRows: Record<string, unknown>[];
 *   byMarket: { ticker: string; rows: Record<string, unknown>[] }[];
 *   fetchedAt: number;
 *   cacheHit: boolean;
 * }} PublicLiveTickPayload
 */

/** @type {Map<string, { expiresAt: number; payload: Omit<PublicLiveTickPayload, "cacheHit"> }>} */
const cache = new Map();

/** @type {Map<string, Promise<Omit<PublicLiveTickPayload, "cacheHit">>>} */
const inflight = new Map();

/**
 * @param {{
 *   eventTicker: string;
 *   seriesTicker: string;
 *   periodInterval: number;
 *   lookbackPeriods?: number;
 * }} opts
 * @returns {Promise<PublicLiveTickPayload>}
 */
export async function getCachedPublicEventCandlesticks(opts) {
  const eventTicker = String(opts.eventTicker || "").trim().toUpperCase();
  const seriesTicker = String(opts.seriesTicker || "").trim().toUpperCase();
  const periodInterval = Math.floor(Number(opts.periodInterval)) || 1;
  const lookbackPeriods =
    Math.floor(Number(opts.lookbackPeriods)) || publicLiveLookbackPeriods(periodInterval);

  if (!eventTicker || !seriesTicker) {
    throw new Error("eventTicker and seriesTicker are required.");
  }

  const key = `${eventTicker}|${seriesTicker}|${periodInterval}|${lookbackPeriods}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.expiresAt > now) {
    return { ...hit.payload, cacheHit: true };
  }

  const pending = inflight.get(key);
  if (pending) {
    const payload = await pending;
    return { ...payload, cacheHit: false };
  }

  const promise = fetchKalshiLiveEventCandlesticksIncrementalServer({
    eventTicker,
    seriesTicker,
    periodInterval,
    lookbackPeriods,
  }).then((tick) => {
    const payload = {
      metaRows: Array.isArray(tick?.metaRows) ? tick.metaRows : [],
      byMarket: Array.isArray(tick?.byMarket) ? tick.byMarket : [],
      fetchedAt: Date.now(),
    };
    cache.set(key, { expiresAt: Date.now() + PUBLIC_LIVE_CACHE_TTL_MS, payload });
    inflight.delete(key);
    return payload;
  });

  inflight.set(key, promise);
  try {
    const payload = await promise;
    return { ...payload, cacheHit: false };
  } catch (e) {
    inflight.delete(key);
    throw e;
  }
}

/**
 * @param {number} periodInterval
 * @returns {number}
 */
export function publicLivePollIntervalMs(periodInterval) {
  return Math.max(PUBLIC_LIVE_CACHE_TTL_MS, pollIntervalMsForPeriod(periodInterval));
}

/**
 * @param {number} periodInterval
 * @returns {number} approximate wall-clock span of the public lookback window (ms)
 */
export function publicLiveLookbackSpanMs(periodInterval) {
  const periods = publicLiveLookbackPeriods(periodInterval);
  return periods * periodIntervalSec(periodInterval) * 1000;
}

export function publicLiveCacheControl() {
  const sec = Math.floor(PUBLIC_LIVE_CACHE_TTL_MS / 1000);
  return `public, s-maxage=${sec}, stale-while-revalidate=${sec * 2}`;
}
