import { periodIntervalSec } from "@/lib/liveFeeds/registry";
import { fetchKalshiLiveMarket } from "@/lib/kalshiLive/fetchKalshiLiveMarket";
import { KALSHI_LIVE_MARKETS_COLUMNS } from "@/lib/kalshiLive/marketsColumns";
import { KALSHI_LIVE_CANDLESTICK_COLUMNS } from "@/lib/kalshiLive/candlesticksColumns";
import { projectKalshiLiveMarketRows } from "@/lib/kalshiLive/normalizeMarketRow";
import {
  flattenKalshiLiveCandlestickGroups,
  projectKalshiLiveCandlestickRows,
} from "@/lib/kalshiLive/normalizeCandlestickRow";

const ALL_MARKET_COLUMN_NAMES = KALSHI_LIVE_MARKETS_COLUMNS.map((c) => c.name);
const ALL_CANDLESTICK_COLUMN_NAMES = KALSHI_LIVE_CANDLESTICK_COLUMNS.map((c) => c.name);

/**
 * Incremental client tick for market candlesticks (one API call per tracked ticker).
 * Same return shape as event incremental so upsert/closure stay shared.
 *
 * @param {{
 *   marketTickers: string[];
 *   periodInterval: number;
 *   lookbackPeriods?: number;
 *   startTs?: number;
 *   endTs?: number;
 *   signal?: AbortSignal;
 * }} opts
 * @returns {Promise<{
 *   metaRows: Record<string, unknown>[];
 *   byMarket: { ticker: string; rows: Record<string, unknown>[] }[];
 *   startTs: number;
 *   endTs: number;
 *   usedBackfillWindow: boolean;
 * }>}
 */
export async function fetchKalshiLiveMarketCandlesticksIncremental(opts) {
  const marketTickers = [
    ...new Set(
      (Array.isArray(opts.marketTickers) ? opts.marketTickers : [])
        .map((t) => String(t || "").trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
  const periodInterval = Math.floor(Number(opts.periodInterval)) || 1;
  const lookbackPeriods = Math.max(2, Math.floor(Number(opts.lookbackPeriods)) || 3);

  if (!marketTickers.length) {
    throw new Error("marketTickers are required.");
  }
  if (![1, 60, 1440].includes(periodInterval)) {
    throw new Error("period_interval must be 1, 60, or 1440.");
  }

  const endTs =
    Number.isFinite(Number(opts.endTs)) && Number(opts.endTs) > 0
      ? Math.floor(Number(opts.endTs))
      : Math.floor(Date.now() / 1000);
  const periodSec = periodIntervalSec(periodInterval);
  const lookbackStart = endTs - lookbackPeriods * periodSec;
  let usedBackfillWindow = false;
  let startTs = lookbackStart;
  if (Number.isFinite(Number(opts.startTs)) && Number(opts.startTs) > 0) {
    startTs = Math.floor(Number(opts.startTs));
    usedBackfillWindow = true;
  }
  if (startTs >= endTs) {
    startTs = lookbackStart;
    usedBackfillWindow = false;
  }

  /** @type {Record<string, unknown>[]} */
  const rawMarkets = [];
  /** @type {{ ticker: string; rows: Record<string, unknown>[] }[]} */
  const byMarket = [];

  for (const ticker of marketTickers) {
    if (opts.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    try {
      const market = await fetchKalshiLiveMarket({
        marketTicker: ticker,
        signal: opts.signal,
      });
      rawMarkets.push(market);
    } catch {
      // Meta refresh is best-effort; candles still proceed.
    }

    const qs = new URLSearchParams({
      market_tickers: ticker,
      start_ts: String(startTs),
      end_ts: String(endTs),
      period_interval: String(periodInterval),
      per_ticker: "1",
    });

    const res = await fetch(
      `/api/integrations/kalshi-live/markets/candlesticks?${qs.toString()}`,
      {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: opts.signal,
      },
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(
        typeof body?.error === "string"
          ? `${ticker}: ${body.error}`
          : typeof body?.message === "string"
            ? `${ticker}: ${body.message}`
            : `${ticker}: ${res.statusText || "Candlesticks request failed"}`,
      );
      // @ts-expect-error status
      err.status = res.status;
      throw err;
    }

    const flat = flattenKalshiLiveCandlestickGroups(body?.markets);
    flat.sort((a, b) => Number(a.end_period_ts) - Number(b.end_period_ts));
    byMarket.push({
      ticker,
      rows: projectKalshiLiveCandlestickRows(flat, ALL_CANDLESTICK_COLUMN_NAMES),
    });
  }

  const metaRows = projectKalshiLiveMarketRows(rawMarkets, ALL_MARKET_COLUMN_NAMES);

  return { metaRows, byMarket, startTs, endTs, usedBackfillWindow };
}
