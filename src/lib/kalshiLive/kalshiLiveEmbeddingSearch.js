/**
 * Kalshi elections embedding search (undocumented public endpoint).
 * GET https://api.elections.kalshi.com/v1/search/series?query=…&embedding_search=true&order_by=querymatch
 */

export const KALSHI_ELECTIONS_SEARCH_BASE =
  (typeof process !== "undefined" && process.env.KALSHI_ELECTIONS_SEARCH_URL?.trim()) ||
  "https://api.elections.kalshi.com/v1";

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
 * Server-side fetch of embedding search suggestions.
 * @param {string} q
 * @param {{ signal?: AbortSignal }} [opts]
 */
export async function fetchKalshiEmbeddingSearchSuggestions(q, opts = {}) {
  const query = String(q || "").trim();
  if (!isKalshiEmbeddingSearchEligible(query)) {
    return { suggestions: [], q: query };
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
    throw new Error(
      typeof body?.message === "string"
        ? body.message
        : typeof body?.error === "string"
          ? body.error
          : res.statusText || "Embedding search failed",
    );
  }

  const page = Array.isArray(body?.current_page) ? body.current_page : [];
  /** @type {KalshiEmbeddingSearchSuggestion[]} */
  const suggestions = [];
  for (const item of page) {
    const sug = normalizeKalshiEmbeddingSearchItem(item);
    if (sug) suggestions.push(sug);
  }

  return {
    suggestions: suggestions.slice(0, 40),
    q: query,
    total_results_count: Number(body?.total_results_count) || suggestions.length,
  };
}
