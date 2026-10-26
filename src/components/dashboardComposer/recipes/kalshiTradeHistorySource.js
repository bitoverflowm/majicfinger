import {
  loadKalshiHistoricalMarketsForTickers,
  loadKalshiHistoricalTradesForTicker,
  loadKalshiLiveCandlesticksForTicker,
  loadKalshiLiveEventsByTickers,
  loadKalshiLiveTradesForTicker,
} from "@/components/dashboardComposer/integrationBuildCatalog";
import { describeComposePhase } from "@/components/dashboardComposer/integrationRunFeed";
import { fetchKalshiHistoricalV2CandlesticksPull } from "@/lib/kalshiHistoricalV2/fetchKalshiHistoricalV2CandlesticksPull";
import { fetchKalshiHistoricalV2Market } from "@/lib/kalshiHistoricalV2/fetchKalshiHistoricalV2Market";
import { fetchKalshiHistoricalV2TradesPull } from "@/lib/kalshiHistoricalV2/fetchKalshiHistoricalV2TradesPull";
import { clampCandlestickWindowToKalshiCap, KALSHI_CANDLESTICK_MAX_CANDLES } from "@/lib/kalshiLive/candlestickCompose";
import { normalizeKalshiLiveMarketRow } from "@/lib/kalshiLive/normalizeMarketRow";
import { normalizeKalshiLiveTradeRow } from "@/lib/kalshiLive/normalizeTradeRow";
import { RECIPE_TRADE_HISTORY, RECIPE_TRADE_ROW_LIMIT } from "@/lib/dataLake/recipeLakeAccess";

/** Kalshi Historical v1 is the lake: Kalshi launch through Dec 2025. */
export const KALSHI_V1_END_MS = Date.UTC(2026, 0, 1);

export const SOURCE_LABELS = {
  kalshiLive: "Kalshi Live",
  kalshiHistorical: "Kalshi Historical v1",
  kalshiHistoricalV2: "Kalshi Historical v2",
};

const SEARCH_LIMIT = 30;
const MARKETS_PER_SERIES = 8;
const SCOPE_LIMIT = 40;
const LIVE_PAGE_SIZE = 1000;
const TICKERISH = /^[A-Za-z0-9][A-Za-z0-9._-]{2,}$/;

export function toMs(value) {
  if (value == null || value === "") return 0;
  const n = Number(value);
  if (Number.isFinite(n) && n > 1e9) return n > 1e16 ? n / 1e6 : n > 1e12 ? n : n * 1000;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function num(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function wait(ms, signal) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });
}

async function getJson(url, signal, { retries = 3, onWait } = {}) {
  for (let attempt = 0; ; attempt += 1) {
    const res = await fetch(url, { signal, credentials: "same-origin", headers: { Accept: "application/json" } });
    if (res.status === 429 && attempt < retries) {
      const retryAfter = Number(res.headers.get("Retry-After"));
      const seconds = Math.min(60, Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : 2 ** Math.min(attempt, 5));
      onWait?.(seconds);
      await wait(seconds * 1000, signal);
      continue;
    }
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(res.status === 429 ? "Too many requests. Wait a minute and try again." : body?.error || "Kalshi request failed");
      err.status = res.status;
      throw err;
    }
    return body;
  }
}

function rethrowAbort(err) {
  if (err?.name === "AbortError") throw err;
}

/** A ticker typed or pasted on its own, or the last segment of a kalshi.com link. */
export function tickerFromQuery(query) {
  const text = String(query || "").trim();
  if (!text) return "";
  if (/kalshi\.com\//i.test(text)) {
    try {
      const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
      const parts = url.pathname.split("/").filter(Boolean);
      return (parts[parts.length - 1] || "").toUpperCase();
    } catch {
      return "";
    }
  }
  return TICKERISH.test(text) ? text.toUpperCase() : "";
}

function resultFromMarket(raw, home) {
  const ticker = String(raw?.ticker || "").trim();
  if (!ticker) return null;
  const subtitle = String(raw?.yes_sub_title || raw?.subtitle || "").trim();
  return {
    ticker,
    title: String(raw?.title || subtitle || ticker).trim(),
    subtitle: subtitle && subtitle !== raw?.title ? subtitle : "",
    status: String(raw?.status || "").toLowerCase(),
    closeMs: toMs(raw?.close_time),
    home,
  };
}

function listMarkets(body, home) {
  return (Array.isArray(body?.markets) ? body.markets : []).map((market) => resultFromMarket(market, home)).filter(Boolean);
}

function tickerLookups(ticker, signal) {
  const t = encodeURIComponent(ticker);
  if (ticker.includes("-")) {
    return [
      getJson(`/api/integrations/kalshi-live/markets/get?ticker=${t}`, signal).then((body) => ({ rank: -2, items: [resultFromMarket(body?.market, "live")] })),
      getJson(`/api/integrations/kalshi-live/historical/markets/get?ticker=${t}`, signal).then((body) => ({ rank: -2, items: [resultFromMarket(body?.market, "v2")] })),
      getJson(`/api/integrations/kalshi-live/markets?discovery=1&event_ticker=${t}&limit=${SCOPE_LIMIT}`, signal).then((body) => ({ rank: -1, items: listMarkets(body, "live") })),
      getJson(`/api/integrations/kalshi-live/historical/markets?discovery=1&ticker_scope=event&event_ticker=${t}&limit=${SCOPE_LIMIT}`, signal).then((body) => ({ rank: -1, items: listMarkets(body, "v2") })),
    ];
  }
  return [
    getJson(`/api/integrations/kalshi-live/markets?discovery=1&series_ticker=${t}&limit=${SCOPE_LIMIT}`, signal).then((body) => ({ rank: -1, items: listMarkets(body, "live") })),
    getJson(`/api/integrations/kalshi-live/historical/markets?discovery=1&ticker_scope=series&series_ticker=${t}&limit=${SCOPE_LIMIT}`, signal).then((body) => ({ rank: -1, items: listMarkets(body, "v2") })),
  ];
}

function textLookups(query, signal) {
  const q = encodeURIComponent(query);
  const phrase = query.toLowerCase();
  const exact = (item) => item.ticker.toLowerCase().startsWith(phrase) || `${item.title} ${item.subtitle}`.toLowerCase().includes(phrase);
  return [
    // Plain search matches any word, so its loose hits rank below the semantic series matches.
    getJson(`/api/integrations/kalshi-live/search/suggestions?q=${q}`, signal).then((body) => ({
      rank: 2,
      exact,
      items: (body?.suggestions || []).map((hit) => ({
        ticker: String(hit?.ticker || "").trim(),
        title: hit?.title || hit?.ticker || "",
        subtitle: hit?.subtitle || "",
        status: String(hit?.status || "").toLowerCase(),
        closeMs: toMs(hit?.closeTime),
        home: "live",
      })),
    })),
    getJson(`/api/integrations/kalshi-live/search/embedding-suggestions?q=${q}`, signal).then((body) => ({
      rank: 1,
      exact,
      items: (body?.suggestions || []).flatMap((hit) =>
        (hit?.markets || []).slice(0, MARKETS_PER_SERIES).map((market) => ({
          ticker: String(market?.ticker || "").trim(),
          title: hit?.title || market?.ticker || "",
          subtitle: market?.yes_subtitle || market?.subtitle || "",
          status: market?.result ? "settled" : "",
          closeMs: toMs(market?.close_ts),
          home: "",
        })),
      ),
    })),
  ];
}

/**
 * Plain-English search, plus direct lookups when the query looks like a market, event or series
 * ticker or a Kalshi link. Lookups vary from under a second to tens of seconds, so `onUpdate`
 * gets the merged list each time one lands.
 */
export async function searchKalshiMarkets(query, signal, onUpdate) {
  const text = String(query || "").trim();
  const ticker = tickerFromQuery(text);
  const tasks = [...(ticker ? tickerLookups(ticker, signal) : []), ...(/kalshi\.com\//i.test(text) ? [] : textLookups(text, signal))];
  const markets = new Map();
  const merged = () => [...markets.values()].sort((a, b) => a.rank - b.rank).slice(0, SEARCH_LIMIT);
  await Promise.allSettled(
    tasks.map((task) =>
      task.then(({ rank, exact, items }) => {
        if (signal?.aborted) return;
        for (const item of items) {
          if (!item?.ticker) continue;
          const itemRank = exact?.(item) ? 0 : rank;
          const prior = markets.get(item.ticker);
          if (!prior || itemRank < prior.rank) markets.set(item.ticker, { ...prior, ...item, rank: itemRank });
        }
        if (markets.size) onUpdate?.(merged());
      }),
    ),
  );
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  return merged();
}

function metaFromMarket(raw, home, eventTitle = "") {
  const row = normalizeKalshiLiveMarketRow(raw);
  const subtitle = String(row.yes_sub_title || "").trim();
  const title = String(raw?.title || eventTitle || subtitle || row.ticker).trim();
  return {
    ticker: String(row.ticker || raw?.ticker || ""),
    title,
    subtitle: subtitle && subtitle !== title ? subtitle : "",
    eventTicker: String(row.event_ticker || ""),
    status: String(row.status || "").toLowerCase(),
    result: String(row.result || "").toLowerCase(),
    openMs: toMs(row.open_time),
    closeMs: toMs(row.close_time || row.latest_expiration_time),
    lastPrice: num(row.last_price_dollars),
    yesBid: num(row.yes_bid_dollars),
    yesAsk: num(row.yes_ask_dollars),
    volume: num(row.volume_fp),
    volume24h: num(row.volume_24h_fp),
    openInterest: num(row.open_interest_fp),
    home,
  };
}

function metaFromLake(row) {
  const cents = (value) => {
    const n = num(value);
    return n == null ? null : n / 100;
  };
  const subtitle = String(row.yes_sub_title || "").trim();
  const title = String(row.title || subtitle || row.ticker).trim();
  return {
    ticker: String(row.ticker || ""),
    title,
    subtitle: subtitle && subtitle !== title ? subtitle : "",
    eventTicker: String(row.event_ticker || ""),
    status: String(row.status || "").toLowerCase(),
    result: String(row.result || "").toLowerCase(),
    openMs: toMs(row.open_time),
    closeMs: toMs(row.close_time),
    lastPrice: cents(row.last_price),
    yesBid: cents(row.yes_bid),
    yesAsk: cents(row.yes_ask),
    volume: num(row.volume),
    volume24h: num(row.volume_24h),
    openInterest: num(row.open_interest),
    home: "v1",
  };
}

/**
 * Where a market lives. Kalshi Live holds markets that settled after the cutoff, Historical v2
 * holds the ones before it, and the v1 lake is the last resort for tickers neither API knows.
 */
export async function resolveKalshiMarket(ticker, signal) {
  const id = String(ticker || "").trim();
  let raw = null;
  let home = "";
  try {
    const body = await getJson(`/api/integrations/kalshi-live/markets/get?ticker=${encodeURIComponent(id)}`, signal);
    if (body?.market?.ticker) {
      raw = body.market;
      home = "live";
    }
  } catch (err) {
    rethrowAbort(err);
  }
  if (!home) {
    try {
      raw = await fetchKalshiHistoricalV2Market({ marketTicker: id, signal });
      if (raw?.ticker) home = "v2";
    } catch (err) {
      rethrowAbort(err);
    }
  }
  if (home) {
    let eventTitle = "";
    if (!raw.title && raw.event_ticker) {
      try {
        const events = await loadKalshiLiveEventsByTickers([raw.event_ticker]);
        eventTitle = String(events?.rows?.[0]?.title || "");
      } catch {
        eventTitle = "";
      }
    }
    return metaFromMarket(raw, home, eventTitle);
  }
  const lake = await loadKalshiHistoricalMarketsForTickers([id]);
  if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
  const row = lake?.rows?.[0];
  if (!row) throw new Error("Kalshi has no market with this ticker.");
  return metaFromLake(row);
}

let cutoffRequest = null;

/** Kalshi's live and historical boundary. Trades before `tradesMs` only exist in the historical API. */
export function loadKalshiCutoffs() {
  if (!cutoffRequest) {
    cutoffRequest = fetch("/api/integrations/kalshi-live/historical/cutoff", { credentials: "same-origin" })
      .then((res) => (res.ok ? res.json() : {}))
      .catch(() => ({}))
      .then((body) => {
        const marketsMs = toMs(body?.market_settled_ts);
        const cutoffs = { marketsMs, tradesMs: toMs(body?.trades_created_ts) || marketsMs };
        if (!marketsMs) cutoffRequest = null;
        return cutoffs;
      });
  }
  return cutoffRequest;
}

export function planTradeSources(meta, cutoffs) {
  const split = cutoffs?.tradesMs || cutoffs?.marketsMs || 0;
  if (meta?.home === "live") {
    if (!split || (meta.openMs && meta.openMs >= split)) return { kind: "live", sources: ["kalshiLive"], split };
    return { kind: "live+v2", sources: ["kalshiLive", "kalshiHistoricalV2"], split };
  }
  if (meta?.home === "v1" || (meta?.closeMs && meta.closeMs < KALSHI_V1_END_MS)) {
    return { kind: "v1", sources: ["kalshiHistorical", "kalshiHistoricalV2"], split };
  }
  return { kind: "v2", sources: ["kalshiHistoricalV2"], split };
}

export function formatDay(ms) {
  if (!ms) return "";
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function describePlan(plan) {
  const cutoff = formatDay(plan?.split) || "the live cutoff";
  if (plan?.kind === "live") {
    return { label: SOURCE_LABELS.kalshiLive, detail: `Opened after the ${cutoff} live cutoff, so every trade is on Kalshi Live.` };
  }
  if (plan?.kind === "live+v2") {
    return {
      label: `${SOURCE_LABELS.kalshiLive} + Historical v2`,
      detail: `Trades since ${cutoff} come from Kalshi Live. Older trades come from Kalshi Historical v2.`,
    };
  }
  if (plan?.kind === "v1") {
    return {
      label: SOURCE_LABELS.kalshiHistorical,
      detail: "Closed before 2026, so Lychee reads Kalshi Historical v1 first and falls back to Historical v2 if the lake has no trades.",
    };
  }
  return {
    label: SOURCE_LABELS.kalshiHistoricalV2,
    detail: `Settled before the ${cutoff} live cutoff. Lychee reads the v2 trade tape, and pulls the full candlestick history if the tape is empty.`,
  };
}

async function liveTrades(ticker, limit, onProgress) {
  const rows = [];
  let cursor = "";
  while (rows.length < limit) {
    const params = new URLSearchParams({ ticker, limit: String(Math.min(LIVE_PAGE_SIZE, limit - rows.length)) });
    if (cursor) params.set("cursor", cursor);
    // The trades route allows 30 pages a minute, so a long history waits out the limit instead of failing.
    const body = await getJson(`/api/integrations/kalshi-live/markets/trades?${params}`, undefined, {
      retries: 20,
      onWait: (seconds) => onProgress?.(`Read ${rows.length.toLocaleString()} trades from Kalshi Live · pausing ${seconds}s for the rate limit`),
    });
    const page = Array.isArray(body?.trades) ? body.trades : [];
    rows.push(...page.map((trade) => normalizeKalshiLiveTradeRow(trade)));
    onProgress?.(`Read ${rows.length.toLocaleString()} trades from Kalshi Live`);
    cursor = String(body?.cursor || "").trim();
    if (!cursor || !page.length) break;
  }
  return { rows: rows.slice(0, limit), truncated: rows.length >= limit && Boolean(cursor) };
}

async function v2Trades(ticker, limit, onProgress) {
  const result = await fetchKalshiHistoricalV2TradesPull({
    marketTickers: ticker,
    limit,
    onPage: (info) => onProgress?.(`Read ${Number(info?.totalLoaded || 0).toLocaleString()} trades from Kalshi Historical v2`),
  });
  const rows = Array.isArray(result?.raw) ? result.raw : [];
  return { rows, truncated: rows.length >= limit };
}

async function v2Candles(meta, onProgress) {
  const end = Math.floor((meta.closeMs || Date.now()) / 1000);
  const start = Math.floor((meta.openMs || (meta.closeMs || Date.now()) - 30 * 86400000) / 1000);
  const span = Math.max(60, end - start);
  const period = span / 60 <= KALSHI_CANDLESTICK_MAX_CANDLES ? 1 : span / 3600 <= KALSHI_CANDLESTICK_MAX_CANDLES ? 60 : 1440;
  const window = clampCandlestickWindowToKalshiCap(start, end, period);
  onProgress?.(`No trades on the v2 tape. Pulling ${period === 1 ? "1-minute" : period === 60 ? "hourly" : "daily"} candlesticks for the market's life`);
  const result = await fetchKalshiHistoricalV2CandlesticksPull({
    marketTickers: meta.ticker,
    whereFilters: [
      { column: "start_ts", op: "eq", value: window.start_ts },
      { column: "end_ts", op: "eq", value: window.end_ts },
      { column: "period_interval", op: "eq", value: period },
    ],
    limit: KALSHI_CANDLESTICK_MAX_CANDLES,
  });
  return Array.isArray(result?.raw) ? result.raw : [];
}

function dedupeTrades(rows) {
  const seen = new Set();
  return rows.filter((row) => {
    const id = row?.trade_id;
    if (!id) return true;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/**
 * Every trade for one market, yes and no prices on each row, from the source the plan picked.
 * Falls through v1 → v2 trades → v2 candlesticks when a source comes back empty. Recipes skip
 * the plan's row cap and stop only at `RECIPE_TRADE_ROW_LIMIT`.
 */
export async function pullKalshiTradeHistory(meta, plan, { onProgress } = {}) {
  const cap = RECIPE_TRADE_ROW_LIMIT;
  const ticker = meta.ticker;
  const { columns: tradeColumns } = await loadKalshiLiveTradesForTicker(ticker, 1, { empty: true });
  const asTrades = (integrationId, pulled, label = SOURCE_LABELS[integrationId]) => ({
    integrationId,
    table: "trades",
    columns: tradeColumns,
    rows: pulled.rows,
    truncated: pulled.truncated,
    label,
  });

  if (plan.kind === "live" || plan.kind === "live+v2") {
    const live = await liveTrades(ticker, cap, onProgress);
    if (plan.kind === "live" || live.rows.length >= cap) return asTrades("kalshiLive", live);
    const older = await v2Trades(ticker, cap - live.rows.length, onProgress);
    const rows = dedupeTrades([...live.rows, ...older.rows]).slice(0, cap);
    return asTrades("kalshiLive", { rows, truncated: older.truncated }, describePlan(plan).label);
  }

  if (plan.kind === "v1") {
    const lake = await loadKalshiHistoricalTradesForTicker(ticker, cap, {
      recipe: RECIPE_TRADE_HISTORY,
      // A full history downloads 1,000 rows per page, and a slow link can take over 20s for one.
      pageTimeoutMs: 90000,
      onPhase: (info) => onProgress?.(describeComposePhase(info, { table: "kalshi.trades", limit: cap })),
    });
    if (lake.rows.length) {
      return {
        integrationId: "kalshiHistorical",
        table: "trades",
        columns: lake.columns,
        rows: lake.rows,
        truncated: lake.rows.length >= cap,
        label: SOURCE_LABELS.kalshiHistorical,
        composeRequest: lake.request,
      };
    }
    onProgress?.("No trades in the v1 lake. Trying Kalshi Historical v2");
  }

  const tape = await v2Trades(ticker, cap, onProgress);
  if (tape.rows.length) return asTrades("kalshiHistoricalV2", tape);
  const candles = await v2Candles(meta, onProgress);
  const { columns: candleColumns } = await loadKalshiLiveCandlesticksForTicker(ticker, 1, { empty: true });
  return {
    integrationId: "kalshiHistoricalV2",
    table: "candlesticks",
    columns: candleColumns,
    rows: candles,
    truncated: false,
    label: SOURCE_LABELS.kalshiHistoricalV2,
  };
}
