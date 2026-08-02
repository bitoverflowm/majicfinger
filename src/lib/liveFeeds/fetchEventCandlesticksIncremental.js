import { periodIntervalSec } from "@/lib/liveFeeds/registry";
import { fetchKalshiLiveEvent } from "@/lib/kalshiLive/fetchKalshiLiveEvent";
import { KALSHI_LIVE_MARKETS_COLUMNS } from "@/lib/kalshiLive/marketsColumns";
import { projectKalshiLiveMarketRows } from "@/lib/kalshiLive/normalizeMarketRow";
import {
  normalizeKalshiLiveCandlestickRow,
  projectKalshiLiveCandlestickRows,
} from "@/lib/kalshiLive/normalizeCandlestickRow";

const ALL_MARKET_COLUMN_NAMES = KALSHI_LIVE_MARKETS_COLUMNS.map((c) => c.name);

/**
 * Incremental client tick for event candlesticks (short lookback window).
 *
 * @param {{
 *   eventTicker: string;
 *   seriesTicker: string;
 *   periodInterval: number;
 *   lookbackPeriods?: number;
 *   signal?: AbortSignal;
 * }} opts
 * @returns {Promise<{
 *   metaRows: Record<string, unknown>[];
 *   byMarket: { ticker: string; rows: Record<string, unknown>[] }[];
 * }>}
 */
export async function fetchKalshiLiveEventCandlesticksIncremental(opts) {
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

  const eventPayload = await fetchKalshiLiveEvent({
    eventTicker,
    withNestedMarkets: true,
    signal: opts.signal,
  });
  const eventMarkets = Array.isArray(eventPayload?.event?.markets)
    ? eventPayload.event.markets
    : Array.isArray(eventPayload?.markets)
      ? eventPayload.markets
      : [];
  const metaRows = projectKalshiLiveMarketRows(eventMarkets, ALL_MARKET_COLUMN_NAMES);

  const qs = new URLSearchParams({
    ticker: eventTicker,
    series_ticker: seriesTicker,
    start_ts: String(startTs),
    end_ts: String(endTs),
    period_interval: String(periodInterval),
  });

  const res = await fetch(`/api/integrations/kalshi-live/events/candlesticks?${qs.toString()}`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal: opts.signal,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(
      typeof body?.error === "string"
        ? body.error
        : typeof body?.message === "string"
          ? body.message
          : res.statusText || "Event candlesticks request failed",
    );
    // @ts-expect-error status
    err.status = res.status;
    throw err;
  }

  const marketTickers = Array.isArray(body?.market_tickers)
    ? body.market_tickers.map((t) => String(t || "").trim())
    : [];
  const marketCandlesticks = Array.isArray(body?.market_candlesticks) ? body.market_candlesticks : [];

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
