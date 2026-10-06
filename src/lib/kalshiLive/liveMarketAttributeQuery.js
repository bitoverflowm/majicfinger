import { isValidMarketTickerToken } from "@/lib/kalshiLive/marketTickerSearch";
import {
  buildKalshiLiveMarketsDiscoveryQueryParams,
  emptyKalshiLiveMarketsDiscoveryParams,
  validateKalshiLiveMarketsDiscoveryPull,
} from "@/lib/kalshiLive/marketDiscovery";
import { normalizeKalshiLiveMarketRow } from "@/lib/kalshiLive/normalizeMarketRow";

/** How many markets a preview scan will read before it stops. */
export const KALSHI_LIVE_MARKET_SCAN_CAP = 20_000;

/** Pause between market pages so a scan stays under the anonymous 30 requests / minute limit. */
export const KALSHI_LIVE_MARKET_PAGE_GAP_MS = 2_200;

const MAX_RATE_RETRIES = 6;
const DROP_SAMPLE = 8;

const DATE_QUERY = {
  created_time: ["minCreatedTs", "maxCreatedTs"],
  updated_time: ["minUpdatedTs", "maxUpdatedTs"],
  close_time: ["minCloseTs", "maxCloseTs"],
  settlement_ts: ["minSettledTs", "maxSettledTs"],
};

export const KALSHI_LIVE_QUERY_ATTRIBUTE_COLUMNS = [
  {
    id: "series_ticker",
    title: "Series ticker",
    type: "text",
    queryOnly: true,
    description: "Markets in one series.",
  },
  {
    id: "listing_status",
    title: "Listing status",
    type: "text",
    queryOnly: true,
    enumOptions: [
      ["unopened", "Unopened"],
      ["open", "Open"],
      ["paused", "Paused"],
      ["closed", "Closed"],
      ["settled", "Settled"],
    ],
    description: "Whether a market is unopened, open, paused, closed, or settled.",
  },
  {
    id: "tickers",
    title: "Market ticker",
    type: "text",
    queryOnly: true,
    exactTickers: true,
    description: "Know your tickers exactly? Add one or more tickers below.",
  },
  {
    id: "mve_filter",
    title: "Multivariate events",
    type: "text",
    queryOnly: true,
    enumOptions: [
      ["exclude", "Exclude"],
      ["only", "Only"],
    ],
    description: "Combo markets. Exclude leaves them out. Only keeps them.",
  },
];

function terms(filter) {
  const seen = new Set();
  const out = [];
  const list = Array.isArray(filter?.containsTags) ? filter.containsTags : [];
  for (const term of [...list, filter?.contains]) {
    const value = String(term || "").trim();
    if (!value) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

function oneTicker(filter) {
  const list = terms(filter);
  if (list.length !== 1 || terms({ containsTags: filter?.excludesTags, contains: filter?.excludes }).length) return "";
  return isValidMarketTickerToken(list[0]) ? list[0].toUpperCase() : "";
}

function exactMarketTickers(filter) {
  const seen = new Set();
  const out = [];
  for (const term of terms(filter).flatMap((value) => value.split(/[\s,]+/))) {
    const token = String(term || "").trim();
    if (!isValidMarketTickerToken(token)) continue;
    const key = token.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(key);
  }
  return out;
}

function unixFromIso(iso, edge) {
  const [year, month, day] = String(iso || "").split("-").map(Number);
  if (!year || !month || !day) return "";
  const date = edge === "end" ? new Date(year, month - 1, day, 23, 59, 59) : new Date(year, month - 1, day, 0, 0, 0);
  const sec = Math.floor(date.getTime() / 1000);
  return Number.isFinite(sec) && sec > 0 ? sec : "";
}

/**
 * Turn attribute filters into GET /markets query params.
 * Response-only filters (yes sub title, price, lifecycle status, and the rest) stay off this object.
 * @param {Record<string, any>} filters
 */
export function kalshiLiveDiscoveryFromFilters(filters) {
  const source = filters && typeof filters === "object" ? filters : {};
  const params = emptyKalshiLiveMarketsDiscoveryParams();

  const event = oneTicker(source.event_ticker);
  if (event) params.eventTicker = event;

  const series = oneTicker(source.series_ticker);
  if (series) params.seriesTicker = series;

  const listing = Array.isArray(source.listing_status?.include) ? source.listing_status.include.filter(Boolean) : [];
  if (listing.length === 1) params.status = String(listing[0]);

  const mve = Array.isArray(source.mve_filter?.include) ? source.mve_filter.include.filter(Boolean) : [];
  if (mve.length === 1) params.mveFilter = mve[0] === "only" ? "only" : "exclude";
  else if (mve.length > 1) params.mveFilter = "any";

  const tickerList = exactMarketTickers(source.tickers);
  if (tickerList.length === 1) params.ticker = tickerList[0];
  else if (tickerList.length > 1) params.tickers = tickerList.join(",");
  if (tickerList.length && !mve.length) params.mveFilter = "any";

  for (const [columnId, [minKey, maxKey]] of Object.entries(DATE_QUERY)) {
    const filter = source[columnId];
    if (!filter) continue;
    if (filter.from) params[minKey] = unixFromIso(filter.from, "start");
    if (filter.to) params[maxKey] = unixFromIso(filter.to, "end");
  }

  return params;
}

/**
 * True when the discovery object narrows the request past the default (mve exclude, no other params).
 * @param {Record<string, any>} filters
 */
/**
 * @param {Record<string, any>} filters
 * @returns {string}
 */
export function kalshiLiveFilterQueryError(filters) {
  const source = filters && typeof filters === "object" ? filters : {};
  const listing = Array.isArray(source.listing_status?.include) ? source.listing_status.include.filter(Boolean) : [];
  if (listing.length > 1) return "Listing status accepts a single value.";
  const seriesTerms = terms(source.series_ticker);
  if (seriesTerms.length > 1) return "Series ticker accepts a single ticker.";
  const eventTerms = terms(source.event_ticker);
  if (eventTerms.length > 1 && eventTerms.every((term) => isValidMarketTickerToken(term))) {
    return "Event ticker accepts a single ticker.";
  }
  const marketTickers = terms(source.tickers).flatMap((term) => term.split(/[\s,]+/)).map((term) => term.trim()).filter(Boolean);
  const invalidTicker = marketTickers.find((term) => !isValidMarketTickerToken(term));
  if (invalidTicker) return "Market ticker needs an exact ticker. Use Market ticker containing for part of a name.";
  return validateKalshiLiveMarketsDiscoveryPull(kalshiLiveDiscoveryFromFilters(source)) || "";
}

export function kalshiLiveDiscoveryIsNarrow(filters) {
  const params = kalshiLiveDiscoveryFromFilters(filters);
  return Boolean(
    params.status ||
      params.eventTicker ||
      params.seriesTicker ||
      params.ticker ||
      params.tickers ||
      params.minCreatedTs ||
      params.maxCreatedTs ||
      params.minUpdatedTs ||
      params.maxUpdatedTs ||
      params.minCloseTs ||
      params.maxCloseTs ||
      params.minSettledTs ||
      params.maxSettledTs ||
      params.mveFilter === "only" ||
      params.mveFilter === "any",
  );
}

/**
 * Filters Kalshi accepts on GET /markets. Open time and volume are absent on purpose.
 * @param {Record<string, any>} params
 * @returns {string[]}
 */
export function describeKalshiLiveServerFilters(params) {
  const source = params && typeof params === "object" ? params : {};
  const parts = [];
  if (source.minCreatedTs || source.maxCreatedTs) parts.push("created time");
  if (source.minUpdatedTs || source.maxUpdatedTs) parts.push("updated time");
  if (source.minCloseTs || source.maxCloseTs) parts.push("close time");
  if (source.minSettledTs || source.maxSettledTs) parts.push("settled time");
  if (source.status) parts.push("listing status");
  if (source.seriesTicker) parts.push("series ticker");
  if (source.eventTicker) parts.push("event ticker");
  if (source.ticker) parts.push("market ticker");
  else if (source.tickers) parts.push("market tickers");
  if (source.mveFilter === "only") parts.push("multivariate events");
  return parts;
}

export function isKalshiRateLimitError(error) {
  return error?.status === 429 || /too many requests|rate limit/i.test(String(error?.message || ""));
}

export function kalshiRetryDelayMs(error, attempt) {
  const sec = Number(error?.retryAfterSec);
  if (Number.isFinite(sec) && sec > 0) return Math.min(60, Math.ceil(sec)) * 1000;
  return Math.min(30_000, 1_500 * 2 ** Math.max(0, attempt));
}

function abortError() {
  const error = new Error("Aborted");
  error.name = "AbortError";
  return error;
}

function sleep(ms, signal) {
  if (signal?.aborted) return Promise.reject(abortError());
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function marketLabel(row) {
  return String(row?.yes_sub_title || row?.no_sub_title || "").trim();
}

async function getJson(url, signal) {
  const res = await fetch(url, { credentials: "same-origin", signal });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error = new Error(json?.error || "Kalshi markets request failed");
    error.status = res.status;
    const header = Number(res.headers.get("retry-after"));
    const body = Number(json?.retryAfterSec);
    error.retryAfterSec = Number.isFinite(header) && header > 0 ? header : Number.isFinite(body) && body > 0 ? body : 0;
    throw error;
  }
  return json;
}

/**
 * Page GET /markets until the match limit, the scan cap, or the cursor ends.
 * Pages are spaced, and a 429 is retried after Retry-After instead of failing the scan.
 * @param {{
 *   discovery: Record<string, any>,
 *   limit: number,
 *   signal?: AbortSignal,
 *   match?: (row: Record<string, unknown>) => boolean,
 *   explain?: (row: Record<string, unknown>) => string,
 *   onPage?: (info: {
 *     rows: Record<string, unknown>[],
 *     scanned: number,
 *     exhausted: boolean,
 *     truncated: boolean,
 *     dropped: { ticker: string, label: string, reason: string }[],
 *     droppedCount: number,
 *     waiting: boolean,
 *     waitMs: number,
 *     page: number,
 *   }) => void,
 * }} args
 */
function considerRow(raw, matched, cap, explain, match) {
  const row = normalizeKalshiLiveMarketRow(raw);
  if (!String(row.ticker || "").trim()) return null;
  const reason = typeof explain === "function" ? String(explain(row) || "") : "";
  const rejected = typeof explain === "function" ? Boolean(reason) : Boolean(match) && !match(row);
  if (rejected) {
    return {
      dropped: {
        ticker: String(row.ticker || "").trim(),
        label: marketLabel(row),
        reason: reason || "does not match",
      },
    };
  }
  if (matched.length < cap) matched.push(row);
  return { kept: true };
}

export async function scanKalshiLiveMarkets({ discovery, limit, signal, match, explain, onPage }) {
  const err = validateKalshiLiveMarketsDiscoveryPull(discovery);
  if (err) return { rows: [], scanned: 0, exhausted: true, truncated: false, error: err };

  const cap = Math.max(1, Math.min(KALSHI_LIVE_MARKET_SCAN_CAP, Math.floor(Number(limit) || KALSHI_LIVE_MARKET_SCAN_CAP)));
  const singleTicker = String(discovery?.ticker || "").trim();
  if (singleTicker) {
    let retries = 0;
    let json;
    for (;;) {
      if (signal?.aborted) throw abortError();
      try {
        json = await getJson(`/api/integrations/kalshi-live/markets/get?ticker=${encodeURIComponent(singleTicker)}`, signal);
        break;
      } catch (error) {
        if (error?.name === "AbortError") throw error;
        if (isKalshiRateLimitError(error) && retries < MAX_RATE_RETRIES) {
          const waitMs = kalshiRetryDelayMs(error, retries);
          retries += 1;
          onPage?.({
            rows: [],
            scanned: 0,
            exhausted: false,
            truncated: false,
            dropped: [],
            droppedCount: 0,
            waiting: true,
            waitMs,
            page: 0,
          });
          await sleep(waitMs, signal);
          continue;
        }
        throw error;
      }
    }
    const matched = [];
    const market = json?.market && typeof json.market === "object" ? json.market : null;
    const verdict = market ? considerRow(market, matched, cap, explain, match) : null;
    const dropped = verdict?.dropped ? [verdict.dropped] : [];
    onPage?.({
      rows: matched.slice(),
      scanned: market ? 1 : 0,
      exhausted: true,
      truncated: false,
      dropped,
      droppedCount: dropped.length,
      waiting: false,
      waitMs: 0,
      page: 1,
    });
    return { rows: matched, scanned: market ? 1 : 0, exhausted: true, truncated: false, error: "" };
  }

  const matched = [];
  let scanned = 0;
  let cursor = "";
  let exhausted = false;
  let page = 0;
  let retries = 0;

  while (page < 40 && scanned < KALSHI_LIVE_MARKET_SCAN_CAP && matched.length < cap) {
    if (signal?.aborted) throw abortError();
    const params = buildKalshiLiveMarketsDiscoveryQueryParams(discovery, { limit: 1000 });
    const qs = new URLSearchParams({ discovery: "1", ...params });
    if (cursor) qs.set("cursor", cursor);
    let json;
    try {
      json = await getJson(`/api/integrations/kalshi-live/markets?${qs}`, signal);
    } catch (error) {
      if (error?.name === "AbortError") throw error;
      if (isKalshiRateLimitError(error) && retries < MAX_RATE_RETRIES) {
        const waitMs = kalshiRetryDelayMs(error, retries);
        retries += 1;
        onPage?.({
          rows: matched.slice(),
          scanned,
          exhausted: false,
          truncated: false,
          dropped: [],
          droppedCount: 0,
          waiting: true,
          waitMs,
          page,
        });
        await sleep(waitMs, signal);
        continue;
      }
      throw error;
    }
    retries = 0;
    page += 1;
    const markets = Array.isArray(json.markets) ? json.markets : [];
    scanned += markets.length;
    const dropped = [];
    let droppedCount = 0;
    for (const raw of markets) {
      const row = normalizeKalshiLiveMarketRow(raw);
      if (!String(row.ticker || "").trim()) continue;
      const reason = typeof explain === "function" ? String(explain(row) || "") : "";
      const rejected = typeof explain === "function" ? Boolean(reason) : Boolean(match) && !match(row);
      if (rejected) {
        droppedCount += 1;
        if (dropped.length < DROP_SAMPLE) {
          dropped.push({
            ticker: String(row.ticker || "").trim(),
            label: marketLabel(row),
            reason: reason || "does not match",
          });
        }
        continue;
      }
      matched.push(row);
      if (matched.length >= cap) break;
    }
    cursor = String(json.cursor || "").trim();
    if (!cursor || !markets.length) exhausted = true;
    const truncated = !exhausted && matched.length < cap && scanned >= KALSHI_LIVE_MARKET_SCAN_CAP;
    onPage?.({
      rows: matched.slice(),
      scanned,
      exhausted,
      truncated,
      dropped,
      droppedCount,
      waiting: false,
      waitMs: 0,
      page,
    });
    if (exhausted || matched.length >= cap || truncated) break;
    await sleep(KALSHI_LIVE_MARKET_PAGE_GAP_MS, signal);
  }
  if (!cursor) exhausted = true;
  const truncated = !exhausted && matched.length < cap;
  return { rows: matched, scanned, exhausted, truncated, error: "" };
}
