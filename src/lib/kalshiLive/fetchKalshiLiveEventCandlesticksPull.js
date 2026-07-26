import {
  inferSeriesTickerFromEvent,
  parseKalshiLiveEventCandlesticksTicker,
  partitionCandlestickApiParams,
  summarizeKalshiLiveEventCandlesticksRequest,
  validateKalshiLiveEventCandlesticksPull,
} from "@/lib/kalshiLive/eventCandlesticksCompose";
import { fetchKalshiLiveEvent } from "@/lib/kalshiLive/fetchKalshiLiveEvent";
import { KALSHI_LIVE_MARKETS_COLUMNS } from "@/lib/kalshiLive/marketsColumns";
import { projectKalshiLiveMarketRows } from "@/lib/kalshiLive/normalizeMarketRow";
import {
  normalizeKalshiLiveCandlestickRow,
  projectKalshiLiveCandlestickRows,
} from "@/lib/kalshiLive/normalizeCandlestickRow";

const ALL_MARKET_COLUMN_NAMES = KALSHI_LIVE_MARKETS_COLUMNS.map((c) => c.name);

/** Hard cap on adjusted_end_ts re-queries so a runaway window can't loop forever. */
const MAX_REQUERIES = 40;

/**
 * One GET to the event-candlesticks proxy.
 *
 * @param {{
 *   eventTicker: string;
 *   seriesTicker: string;
 *   startTs: number;
 *   endTs: number;
 *   periodInterval: number;
 *   signal?: AbortSignal;
 * }} opts
 * @returns {Promise<{
 *   marketTickers: string[];
 *   marketCandlesticks: unknown[][];
 *   adjustedEndTs: number | null;
 * }>}
 */
async function fetchEventCandlesticksPage(opts) {
  const qs = new URLSearchParams({
    ticker: opts.eventTicker,
    series_ticker: opts.seriesTicker,
    start_ts: String(Math.floor(opts.startTs)),
    end_ts: String(Math.floor(opts.endTs)),
    period_interval: String(Math.floor(opts.periodInterval)),
  });

  const res = await fetch(`/api/integrations/kalshi-live/events/candlesticks?${qs.toString()}`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal: opts.signal,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      typeof body?.error === "string"
        ? body.error
        : typeof body?.message === "string"
          ? body.message
          : res.statusText || "Event candlesticks request failed",
    );
  }

  const adjusted = Math.floor(Number(body?.adjusted_end_ts));
  return {
    marketTickers: Array.isArray(body?.market_tickers)
      ? body.market_tickers.map((t) => String(t || "").trim())
      : [],
    marketCandlesticks: Array.isArray(body?.market_candlesticks) ? body.market_candlesticks : [],
    adjustedEndTs: Number.isFinite(adjusted) ? adjusted : null,
  };
}

/**
 * Pull candlesticks for every market in a single event.
 *
 * Sheet 1 = metadata for all markets in the event.
 * Sheets 2..N = one market per sheet with its candlestick rows.
 *
 * Handles `adjusted_end_ts`: when Kalshi truncates a wide window it returns an
 * adjusted end < requested end; we re-query from there and merge (dedup by
 * end_period_ts) until the full requested range is covered.
 *
 * @param {{
 *   eventTicker: string;
 *   seriesTicker?: string;
 *   whereFilters?: import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveWhereFilter[];
 *   selectedColumns?: string[];
 *   signal?: AbortSignal;
 *   onProgress?: (info: { label: string; progress: number }) => void;
 * }} opts
 * @returns {Promise<{
 *   metaRows: Record<string, unknown>[];
 *   byMarket: { ticker: string; rows: Record<string, unknown>[] }[];
 *   marketTickers: string[];
 *   querySummary: string;
 * }>}
 */
export async function fetchKalshiLiveEventCandlesticksPull(opts) {
  const whereFilters = Array.isArray(opts.whereFilters) ? opts.whereFilters : [];
  const err = validateKalshiLiveEventCandlesticksPull(
    opts.eventTicker,
    opts.seriesTicker || "",
    whereFilters,
  );
  if (err) throw new Error(err);

  const eventTicker = parseKalshiLiveEventCandlesticksTicker(opts.eventTicker);
  const seriesTicker =
    parseKalshiLiveEventCandlesticksTicker(opts.seriesTicker || "") ||
    inferSeriesTickerFromEvent(eventTicker);

  const { apiParams } = partitionCandlestickApiParams(whereFilters);
  const startTs = Math.floor(Number(apiParams.start_ts));
  const endTs = Math.floor(Number(apiParams.end_ts));
  const periodInterval = Math.floor(Number(apiParams.period_interval));

  if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");

  // Sheet 1 — metadata for every market in the event.
  opts.onProgress?.({ label: `Fetching ${eventTicker} markets…`, progress: 12 });
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

  const eventObj =
    eventPayload?.event && typeof eventPayload.event === "object" ? eventPayload.event : null;
  const eventMeta = {
    eventTicker,
    seriesTicker:
      String(eventObj?.series_ticker || seriesTicker || "").trim() || seriesTicker,
    title: String(eventObj?.title || "").trim(),
    subTitle: String(eventObj?.sub_title || "").trim(),
    category: String(eventObj?.category || "").trim(),
  };

  // Sheets 2..N — candlesticks per market (merge adjusted_end_ts windows).
  /** @type {Map<string, { candles: unknown[]; seen: Set<number>; order: number }>} */
  const byMarketMap = new Map();
  let reqStart = startTs;
  let requeries = 0;

  for (let iter = 0; iter < MAX_REQUERIES; iter++) {
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const page = await fetchEventCandlesticksPage({
      eventTicker,
      seriesTicker,
      startTs: reqStart,
      endTs,
      periodInterval,
      signal: opts.signal,
    });

    for (let i = 0; i < page.marketTickers.length; i++) {
      const ticker = String(page.marketTickers[i] || "").trim();
      if (!ticker) continue;
      const candles = Array.isArray(page.marketCandlesticks[i])
        ? page.marketCandlesticks[i]
        : [];
      let bucket = byMarketMap.get(ticker);
      if (!bucket) {
        bucket = { candles: [], seen: new Set(), order: byMarketMap.size };
        byMarketMap.set(ticker, bucket);
      }
      for (const candle of candles) {
        const ts = Math.floor(Number(candle?.end_period_ts));
        if (Number.isFinite(ts)) {
          if (bucket.seen.has(ts)) continue;
          bucket.seen.add(ts);
        }
        bucket.candles.push(candle);
      }
    }

    const adjusted = page.adjustedEndTs;
    // adjusted_end_ts < requested end means the window was truncated; requery
    // from the adjusted boundary to fetch the remaining candles.
    if (adjusted != null && adjusted < endTs && adjusted > reqStart) {
      reqStart = adjusted;
      requeries += 1;
      opts.onProgress?.({
        label: `Merging remaining candles (${requeries})…`,
        progress: Math.min(88, 30 + requeries * 8),
      });
      continue;
    }
    break;
  }

  /** @type {{ ticker: string; rows: Record<string, unknown>[] }[]} */
  const byMarket = [...byMarketMap.entries()]
    .sort((a, b) => a[1].order - b[1].order)
    .map(([ticker, bucket]) => {
      const normalized = bucket.candles.map((candle) =>
        normalizeKalshiLiveCandlestickRow(ticker, /** @type {Record<string, unknown>} */ (candle)),
      );
      normalized.sort((a, b) => Number(a.end_period_ts) - Number(b.end_period_ts));
      return {
        ticker,
        rows: projectKalshiLiveCandlestickRows(normalized, opts.selectedColumns),
      };
    });

  const marketTickers = byMarket.map((m) => m.ticker);

  return {
    metaRows,
    byMarket,
    marketTickers,
    eventMeta,
    querySummary: summarizeKalshiLiveEventCandlesticksRequest(
      eventTicker,
      seriesTicker,
      apiParams,
      { marketCount: marketTickers.length, requeries },
    ),
  };
}
