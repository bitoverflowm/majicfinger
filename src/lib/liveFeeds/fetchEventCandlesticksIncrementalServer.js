import { kalshiLiveUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";
import { periodIntervalSec } from "@/lib/liveFeeds/registry";
import { KALSHI_LIVE_MARKETS_COLUMNS } from "@/lib/kalshiLive/marketsColumns";
import { projectKalshiLiveMarketRows } from "@/lib/kalshiLive/normalizeMarketRow";
import {
  normalizeKalshiLiveCandlestickRow,
  projectKalshiLiveCandlestickRows,
} from "@/lib/kalshiLive/normalizeCandlestickRow";

const ALL_MARKET_COLUMN_NAMES = KALSHI_LIVE_MARKETS_COLUMNS.map((c) => c.name);

/**
 * Server-side incremental fetch for event candlesticks (direct upstream, no browser proxy).
 *
 * @param {{
 *   eventTicker: string;
 *   seriesTicker: string;
 *   periodInterval: number;
 *   lookbackPeriods?: number;
 * }} opts
 * @returns {Promise<{
 *   metaRows: Record<string, unknown>[];
 *   byMarket: { ticker: string; rows: Record<string, unknown>[] }[];
 * }>}
 */
export async function fetchKalshiLiveEventCandlesticksIncrementalServer(opts) {
  const eventTicker = String(opts.eventTicker || "").trim().toUpperCase();
  const seriesTicker = String(opts.seriesTicker || "").trim().toUpperCase();
  const periodInterval = Math.floor(Number(opts.periodInterval)) || 1;
  const lookbackPeriods = Math.max(2, Math.floor(Number(opts.lookbackPeriods)) || 3);

  if (!eventTicker || !seriesTicker) {
    throw new Error("eventTicker and seriesTicker are required.");
  }
  if (![1, 60, 1440].includes(periodInterval)) {
    throw new Error("period_interval must be 1, 60, or 1440.");
  }

  const endTs = Math.floor(Date.now() / 1000);
  const startTs = endTs - lookbackPeriods * periodIntervalSec(periodInterval);

  const eventUrl = `${kalshiLiveUrl(`events/${encodeURIComponent(eventTicker)}`)}?with_nested_markets=true`;
  const eventRes = await fetch(eventUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const eventBody = await eventRes.json().catch(() => ({}));
  if (!eventRes.ok) {
    const err = new Error(
      typeof eventBody?.message === "string"
        ? eventBody.message
        : typeof eventBody?.error === "string"
          ? eventBody.error
          : eventRes.statusText || "Event request failed",
    );
    // @ts-expect-error status
    err.status = eventRes.status;
    throw err;
  }

  const eventObj = eventBody?.event && typeof eventBody.event === "object" ? eventBody.event : null;
  const eventMarkets = Array.isArray(eventObj?.markets)
    ? eventObj.markets
    : Array.isArray(eventBody?.markets)
      ? eventBody.markets
      : [];
  const metaRows = projectKalshiLiveMarketRows(eventMarkets, ALL_MARKET_COLUMN_NAMES);

  const qs = new URLSearchParams({
    start_ts: String(startTs),
    end_ts: String(endTs),
    period_interval: String(periodInterval),
  });
  const candlesPath = `series/${encodeURIComponent(seriesTicker)}/events/${encodeURIComponent(eventTicker)}/candlesticks`;
  const candlesUrl = `${kalshiLiveUrl(candlesPath)}?${qs.toString()}`;
  const candlesRes = await fetch(candlesUrl, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const candlesBody = await candlesRes.json().catch(() => ({}));
  if (!candlesRes.ok) {
    const err = new Error(
      typeof candlesBody?.message === "string"
        ? candlesBody.message
        : typeof candlesBody?.error === "string"
          ? candlesBody.error
          : candlesRes.statusText || "Event candlesticks request failed",
    );
    // @ts-expect-error status
    err.status = candlesRes.status;
    const retryAfter = Number(candlesRes.headers.get("retry-after"));
    if (Number.isFinite(retryAfter) && retryAfter > 0) {
      // @ts-expect-error retryAfterMs
      err.retryAfterMs = retryAfter * 1000;
    }
    throw err;
  }

  const marketTickers = Array.isArray(candlesBody?.market_tickers)
    ? candlesBody.market_tickers.map((t) => String(t || "").trim())
    : [];
  const marketCandlesticks = Array.isArray(candlesBody?.market_candlesticks)
    ? candlesBody.market_candlesticks
    : [];

  /** @type {{ ticker: string; rows: Record<string, unknown>[] }[]} */
  const byMarket = [];
  for (let i = 0; i < marketTickers.length; i++) {
    const ticker = String(marketTickers[i] || "").trim().toUpperCase();
    if (!ticker) continue;
    const candles = Array.isArray(marketCandlesticks[i]) ? marketCandlesticks[i] : [];
    const normalized = candles.map((candle) =>
      normalizeKalshiLiveCandlestickRow(ticker, /** @type {Record<string, unknown>} */ (candle)),
    );
    normalized.sort((a, b) => Number(a.end_period_ts) - Number(b.end_period_ts));
    byMarket.push({
      ticker,
      rows: projectKalshiLiveCandlestickRows(normalized),
    });
  }

  return { metaRows, byMarket };
}
