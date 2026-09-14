/**
 * Kalshi elections embedding search (undocumented public endpoint).
 * GET https://api.elections.kalshi.com/v1/search/series?query=…&embedding_search=true&order_by=querymatch
 */

export const KALSHI_ELECTIONS_SEARCH_BASE =
  (typeof process !== "undefined" && process.env.KALSHI_ELECTIONS_SEARCH_URL?.trim()) ||
  "https://api.elections.kalshi.com/v1";

/**
 * @typedef {{
 *   entity: "embedding_series";
 *   ticker: string;
 *   title: string;
 *   subtitle?: string;
 *   eventTicker?: string;
 *   category?: string;
 *   markets: Record<string, unknown>[];
 *   raw: Record<string, unknown>;
 * }} KalshiEmbeddingSearchSuggestion
 */

const EMBEDDING_CACHE_TTL_MS = 45_000;
const EMBEDDING_CACHE_MAX = 200;

/**
 * Kalshi `SearchSeriesRequest.Query` uses gin `max` validation. Queries longer
 * than this return HTTP 400 `{error:{code:"invalid_parameters"}}` (often
 * surfaced as a bare "Bad Request" if the nested body is ignored).
 */
export const KALSHI_EMBEDDING_SEARCH_QUERY_MAX = 128;

/** @type {Map<string, { at: number; payload: { suggestions: KalshiEmbeddingSearchSuggestion[]; q: string; total_results_count?: number } }>} */
const embeddingSuggestionCache = new Map();

/**
 * Clip a search string to Kalshi's Query max, preferring a word boundary.
 * @param {string} raw
 */
export function clipKalshiEmbeddingSearchQuery(raw) {
  const query = String(raw || "")
    .replace(/\s+/g, " ")
    .trim();
  if (query.length <= KALSHI_EMBEDDING_SEARCH_QUERY_MAX) return query;
  const sliced = query.slice(0, KALSHI_EMBEDDING_SEARCH_QUERY_MAX);
  const broken = sliced.replace(/\s+\S*$/, "").trim();
  return broken.length >= 12 ? broken : sliced.trim();
}

/**
 * Read a human message from Kalshi JSON (`error` may be a string or `{code,message,details}`).
 * @param {unknown} body
 * @param {string} [fallback]
 */
export function kalshiUpstreamErrorMessage(body, fallback = "") {
  if (!body || typeof body !== "object") return fallback;
  const row = /** @type {Record<string, unknown>} */ (body);
  const err = row.error;
  if (typeof err === "string" && err.trim()) return err.trim();
  if (err && typeof err === "object") {
    const nested = /** @type {Record<string, unknown>} */ (err);
    for (const key of ["message", "details", "code"]) {
      const value = nested[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }
  for (const key of ["message", "msg"]) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return fallback;
}

/**
 * True when the query has at least one word with ≥5 letters/digits.
 * @param {string} raw
 */
export function isKalshiEmbeddingSearchEligible(raw) {
  const tokens = String(raw || "")
    .trim()
    .split(/\s+/)
    .map((t) => t.replace(/[^a-zA-Z0-9]/g, ""))
    .filter(Boolean);
  return tokens.some((t) => t.length >= 5);
}

/**
 * @param {unknown} item
 * @returns {KalshiEmbeddingSearchSuggestion | null}
 */
export function normalizeKalshiEmbeddingSearchItem(item) {
  if (!item || typeof item !== "object") return null;
  const row = /** @type {Record<string, unknown>} */ (item);
  const seriesTicker = String(row.series_ticker || "").trim();
  const eventTicker = String(row.event_ticker || "").trim();
  const ticker = seriesTicker || eventTicker;
  if (!ticker) return null;

  const seriesTitle = String(row.series_title || "").trim();
  const eventTitle = String(row.event_title || "").trim();
  const title = seriesTitle || eventTitle || ticker;
  const subtitleParts = [
    eventTitle && eventTitle !== title ? eventTitle : "",
    String(row.category || "").trim(),
    eventTicker && eventTicker !== ticker ? eventTicker : "",
  ].filter(Boolean);

  const markets = Array.isArray(row.markets)
    ? row.markets.filter((m) => m && typeof m === "object")
    : [];

  return {
    entity: "embedding_series",
    ticker,
    title,
    subtitle: subtitleParts.join(" · ") || undefined,
    eventTicker: eventTicker || undefined,
    category: String(row.category || "").trim() || undefined,
    markets: /** @type {Record<string, unknown>[]} */ (markets),
    raw: row,
  };
}

/**
 * Flatten a selected search hit into sheet rows (one row per nested market).
 * @param {KalshiEmbeddingSearchSuggestion} suggestion
 * @returns {Record<string, unknown>[]}
 */
export function flattenKalshiEmbeddingSearchToRows(suggestion) {
  const seriesTicker = String(suggestion?.ticker || "").trim();
  const seriesTitle = String(suggestion?.title || "").trim();
  const eventTicker = String(suggestion?.eventTicker || "").trim();
  const category = String(suggestion?.category || "").trim();
  const eventTitle = String(suggestion?.raw?.event_title || "").trim();
  const markets = Array.isArray(suggestion?.markets) ? suggestion.markets : [];

  if (!markets.length) {
    return [
      {
        series_ticker: seriesTicker,
        series_title: seriesTitle,
        event_ticker: eventTicker,
        event_title: eventTitle,
        category,
        ticker: "",
        yes_subtitle: "",
        yes_bid_dollars: null,
        yes_ask_dollars: null,
        last_price_dollars: null,
        volume: null,
        result: "",
        close_ts: "",
      },
    ];
  }

  return markets.map((m) => {
    const market = m && typeof m === "object" ? m : {};
    return {
      series_ticker: seriesTicker,
      series_title: seriesTitle,
      event_ticker: eventTicker,
      event_title: eventTitle,
      category,
      ticker: String(market.ticker || "").trim(),
      yes_subtitle: String(market.yes_subtitle || "").trim(),
      yes_bid_dollars:
        market.yes_bid_dollars != null ? Number(market.yes_bid_dollars) : null,
      yes_ask_dollars:
        market.yes_ask_dollars != null ? Number(market.yes_ask_dollars) : null,
      last_price_dollars:
        market.last_price_dollars != null ? Number(market.last_price_dollars) : null,
      volume: market.volume != null ? Number(market.volume) : null,
      result: String(market.result || "").trim(),
      close_ts: String(market.close_ts || "").trim(),
    };
  });
}

/**
 * Flatten all embedding-search hits into sheet rows.
 * @param {KalshiEmbeddingSearchSuggestion[]} suggestions
 * @returns {Record<string, unknown>[]}
 */
export function flattenKalshiEmbeddingSearchSuggestionsToRows(suggestions) {
  const list = Array.isArray(suggestions) ? suggestions : [];
  return list.flatMap((s) => flattenKalshiEmbeddingSearchToRows(s));
}

/**
 * Server-side fetch of embedding search suggestions.
 * @param {string} q
 * @param {{ signal?: AbortSignal }} [opts]
 */
export async function fetchKalshiEmbeddingSearchSuggestions(q, opts = {}) {
  const query = clipKalshiEmbeddingSearchQuery(q);
  if (!isKalshiEmbeddingSearchEligible(query)) {
    return { suggestions: [], q: query };
  }

  const cacheKey = query.toLowerCase();
  const cached = embeddingSuggestionCache.get(cacheKey);
  if (cached && Date.now() - cached.at < EMBEDDING_CACHE_TTL_MS) {
    return cached.payload;
  }

  const params = new URLSearchParams({
    query,
    embedding_search: "true",
    order_by: "querymatch",
  });
  const url = `${String(KALSHI_ELECTIONS_SEARCH_BASE).replace(/\/$/, "")}/search/series?${params}`;

  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: opts.signal,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const extracted = kalshiUpstreamErrorMessage(body, "");
    const fallback =
      res.status === 400
        ? "Kalshi rejected this search query."
        : res.status === 404
          ? "Kalshi returned no results for this search."
          : res.statusText || "Embedding search failed";
    throw new Error(extracted || fallback);
  }

  const page = Array.isArray(body?.current_page) ? body.current_page : [];
  /** @type {KalshiEmbeddingSearchSuggestion[]} */
  const suggestions = [];
  for (const item of page) {
    const sug = normalizeKalshiEmbeddingSearchItem(item);
    if (sug) suggestions.push(sug);
  }

  const payload = {
    suggestions: suggestions.slice(0, 40),
    q: query,
    total_results_count: Number(body?.total_results_count) || suggestions.length,
  };

  embeddingSuggestionCache.set(cacheKey, { at: Date.now(), payload });
  if (embeddingSuggestionCache.size > EMBEDDING_CACHE_MAX) {
    const oldest = embeddingSuggestionCache.keys().next().value;
    if (oldest) embeddingSuggestionCache.delete(oldest);
  }

  return payload;
}
