/**
 * Server-side incremental fetch for market candlesticks (direct upstream, no browser proxy).
 * Same return shape as event incremental for shared overlay/upsert paths.
 */

import { periodIntervalSec } from "@/lib/liveFeeds/registry";
import { fetchKalshiLiveCandlesticksBatchUpstream } from "@/lib/kalshiLive/fetchKalshiLiveCandlesticksUpstream";
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
 * @param {{
 *   marketTickers: string[];
 *   periodInterval: number;
 *   lookbackPeriods?: number;
 *   startTs?: number;
 *   endTs?: number;
 * }} opts
 */
export async function fetchKalshiLiveMarketCandlesticksIncrementalServer(opts) {
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
  for (const ticker of marketTickers) {
    try {
      const market = await fetchKalshiLiveMarket({ marketTicker: ticker });
      rawMarkets.push(market);
    } catch {
      // Meta refresh is best-effort.
    }
  }

  const markets = await fetchKalshiLiveCandlesticksBatchUpstream({
    marketTickers,
    start_ts: startTs,
    end_ts: endTs,
    period_interval: periodInterval,
  });

  const flat = flattenKalshiLiveCandlestickGroups(markets);
  /** @type {Map<string, Record<string, unknown>[]>} */
  const rowsByTicker = new Map();
  for (const row of flat) {
    const t = String(row?.market_ticker || "").trim().toUpperCase();
    if (!t) continue;
    if (!rowsByTicker.has(t)) rowsByTicker.set(t, []);
    rowsByTicker.get(t).push(row);
  }

  /** @type {{ ticker: string; rows: Record<string, unknown>[] }[]} */
  const byMarket = [];
  for (const ticker of marketTickers) {
    const rawRows = rowsByTicker.get(ticker) || [];
    const projected = projectKalshiLiveCandlestickRows(rawRows, ALL_CANDLESTICK_COLUMN_NAMES);
    byMarket.push({ ticker, rows: projected });
  }

  const metaRows = projectKalshiLiveMarketRows(rawMarkets, ALL_MARKET_COLUMN_NAMES);

  return {
    metaRows,
    byMarket,
    startTs,
    endTs,
    usedBackfillWindow,
  };
}
