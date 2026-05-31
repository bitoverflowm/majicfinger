/**
 * Kalshi Live typeahead — ticker lookup via GET /markets, text search via
 * paginated GET /events?with_nested_markets=true (Kalshi has no text query param).
 */
import { kalshiLiveUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";

/** @typedef {{ entity: "market"; ticker: string; title: string; eventTicker?: string; status?: string; subtitle?: string }} KalshiLiveSearchSuggestion */

const SUGGESTION_LIMIT = 12;
const EVENTS_PAGE_LIMIT = 200;
const MAX_EVENT_PAGES = 5;
const SEARCH_BUDGET_MS = 4000;
const CACHE_TTL_MS = 45_000;
const CACHE_MAX = 80;

/** @type {Map<string, { at: number; suggestions: KalshiLiveSearchSuggestion[] }>} */
const suggestionCache = new Map();

/** @param {string} q */
function tokenizeQuery(q) {
  const raw = String(q || "")
    .trim()
    .toLowerCase();
  const words = raw.split(/\s+/).map((w) => w.trim()).filter((w) => w.length >= 2);
  if (words.length) return words;
  if (raw.length >= 2) return [raw];
  return [];
}

/** @param {string} q */
function isTickerLike(q) {
  return /^[A-Z0-9][A-Z0-9-]*$/i.test(String(q || "").trim()) && q.length <= 64;
}

/**
 * @param {string[]} tokens
 * @param {string} haystack
 */
function allTokensMatch(tokens, haystack) {
  const lower = String(haystack || "").toLowerCase();
  if (!lower) return false;
  return tokens.every((t) => lower.includes(t));
}

/**
 * @param {string[]} tokens
 * @param {Record<string, unknown>} fields
 */
function scoreFields(tokens, fields) {
  let best = 0;
  for (const { text, weight } of fields) {
    const val = String(text || "").trim();
    if (!val) continue;
    const lower = val.toLowerCase();
    const fullQuery = tokens.join(" ");
    if (lower === fullQuery) best = Math.max(best, weight + 20);
    else if (allTokensMatch(tokens, val)) best = Math.max(best, weight);
    else if (tokens.some((t) => lower.includes(t))) best = Math.max(best, Math.floor(weight * 0.6));
  }
  return best;
}

/**
 * @param {Record<string, unknown>} event
 * @param {Record<string, unknown>} market
 */
function marketPrimaryTitle(event, market) {
  const eventTitle = String(event?.title || "").trim();
  const marketTitle = String(market?.title || market?.subtitle || "").trim();
  const eventSub = String(event?.sub_title || "").trim();
  return eventTitle || marketTitle || eventSub || String(market?.ticker || "").trim();
}

/**
 * Outcome-specific label shown under the title (e.g. "Below 300", "Mars").
 * @param {Record<string, unknown>} market
 */
function marketOutcomeLabel(market) {
  return String(market?.yes_sub_title || "").trim();
}

/**
 * @param {Record<string, unknown>} event
 * @param {Record<string, unknown>} market
 */
function buildSuggestionDisplay(event, market) {
  const ticker = String(market?.ticker || "").trim();
  const eventTicker = String(event?.event_ticker || market?.event_ticker || "").trim();
  const title = marketPrimaryTitle(event, market);
  const outcome = marketOutcomeLabel(market);

  let subtitle = outcome;
  if (!subtitle || subtitle === title) {
    subtitle = eventTicker && eventTicker !== title ? eventTicker : ticker;
  }

  return { title, subtitle, ticker, eventTicker };
}

/**
 * @param {string[]} tokens
 * @param {Record<string, unknown>} event
 * @param {Record<string, unknown>} market
 */
function scoreEventMarket(tokens, event, market) {
  const eventTitle = String(event?.title || "").trim();
  const eventSub = String(event?.sub_title || "").trim();
  const eventTicker = String(event?.event_ticker || market?.event_ticker || "").trim();
  const ticker = String(market?.ticker || "").trim();
  const yesSub = String(market?.yes_sub_title || "").trim();
  const noSub = String(market?.no_sub_title || "").trim();
  const title = String(market?.title || market?.subtitle || "").trim();

  let score = scoreFields(tokens, [
    { text: eventTitle, weight: 100 },
    { text: eventSub, weight: 85 },
    { text: yesSub, weight: 80 },
    { text: title, weight: 75 },
    { text: noSub, weight: 65 },
    { text: ticker, weight: 55 },
    { text: eventTicker, weight: 50 },
  ]);

  const status = String(market?.status || "").toLowerCase();
  if (status === "active" || status === "open") score += 10;

  return score;
}

/**
 * @param {Record<string, unknown>} event
 * @param {Record<string, unknown>} market
 * @param {number} score
 * @returns {KalshiLiveSearchSuggestion | null}
 */
function toSuggestion(event, market, score) {
  const ticker = String(market?.ticker || "").trim();
  if (!ticker) return null;

  const { title, subtitle, eventTicker } = buildSuggestionDisplay(event, market);

  return {
    entity: "market",
    ticker,
    title,
    eventTicker: eventTicker || undefined,
    status: String(market?.status || ""),
    subtitle,
    score,
  };
}

/** @param {string} path @param {Record<string, string>} params */
async function kalshiFetch(path, params = {}) {
  const qs = new URLSearchParams(params);
  const url = `${kalshiLiveUrl(path)}?${qs.toString()}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof body?.message === "string"
        ? body.message
        : typeof body?.error === "string"
          ? body.error
          : "Kalshi request failed";
    throw new Error(msg);
  }
  return body;
}

/** @param {string} q @param {string[]} tokens */
async function searchByTicker(q, tokens) {
  const body = await kalshiFetch("markets", {
    tickers: q.toUpperCase(),
    limit: "50",
  });
  const markets = Array.isArray(body?.markets) ? body.markets : [];
  /** @type {({ score: number } & KalshiLiveSearchSuggestion)[]} */
  const scored = [];

  for (const m of markets) {
    const ticker = String(m?.ticker || "").trim();
    if (!ticker) continue;
    const { title, subtitle, eventTicker } = buildSuggestionDisplay({}, m);
    const exact = ticker.toLowerCase() === q.toLowerCase();
    const score = exact
      ? 120
      : scoreFields(tokens, [
          { text: ticker, weight: 100 },
          { text: title, weight: 80 },
          { text: String(m?.yes_sub_title || ""), weight: 75 },
          { text: eventTicker, weight: 60 },
        ]);
    if (score <= 0 && !exact) continue;
    scored.push({
      entity: "market",
      ticker,
      title,
      eventTicker: eventTicker || undefined,
      status: String(m?.status || ""),
      subtitle,
      score,
    });
  }

  return scored;
}

/** @param {string[]} tokens */
async function searchByText(tokens) {
  /** @type {Map<string, { score: number } & KalshiLiveSearchSuggestion>} */
  const byTicker = new Map();
  const deadline = Date.now() + SEARCH_BUDGET_MS;
  let cursor = "";
  let pages = 0;

  while (
    byTicker.size < SUGGESTION_LIMIT &&
    pages < MAX_EVENT_PAGES &&
    Date.now() < deadline
  ) {
    /** @type {Record<string, string>} */
    const params = {
      status: "open",
      with_nested_markets: "true",
      limit: String(EVENTS_PAGE_LIMIT),
    };
    if (cursor) params.cursor = cursor;

    const body = await kalshiFetch("events", params);
    const events = Array.isArray(body?.events) ? body.events : [];

    for (const event of events) {
      const markets = Array.isArray(event?.markets) ? event.markets : [];
      for (const market of markets) {
        const score = scoreEventMarket(tokens, event, market);
        if (score <= 0) continue;
        const sug = toSuggestion(event, market, score);
        if (!sug) continue;
        const prev = byTicker.get(sug.ticker);
        if (!prev || score > prev.score) {
          byTicker.set(sug.ticker, { ...sug, score });
        }
      }
    }

    pages += 1;
    cursor = String(body?.cursor || "").trim();
    if (!cursor || events.length === 0) break;
  }

  return [...byTicker.values()];
}

/**
 * @param {string} q
 * @returns {Promise<{ suggestions: KalshiLiveSearchSuggestion[] }>}
 */
export async function fetchKalshiLiveSearchSuggestions(q) {
  const trimmed = String(q || "").trim();
  const tokens = tokenizeQuery(trimmed);
  if (tokens.length === 0) {
    return { suggestions: [] };
  }

  const cacheKey = tokens.join(" ");
  const cached = suggestionCache.get(cacheKey);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    return { suggestions: cached.suggestions };
  }

  /** @type {({ score: number } & KalshiLiveSearchSuggestion)[]} */
  let scored = [];

  if (isTickerLike(trimmed)) {
    scored = await searchByTicker(trimmed, tokens);
  }

  // Text scan when the query is natural language, or ticker lookup found nothing.
  if (!isTickerLike(trimmed) || scored.length === 0) {
    const textHits = await searchByText(tokens);
    const merged = new Map(scored.map((s) => [s.ticker, s]));
    for (const hit of textHits) {
      const prev = merged.get(hit.ticker);
      if (!prev || hit.score > prev.score) merged.set(hit.ticker, hit);
    }
    scored = [...merged.values()];
  }

  const suggestions = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, SUGGESTION_LIMIT)
    .map(({ score: _s, ...rest }) => rest);

  suggestionCache.set(cacheKey, { at: Date.now(), suggestions });
  if (suggestionCache.size > CACHE_MAX) {
    const oldest = suggestionCache.keys().next().value;
    if (oldest) suggestionCache.delete(oldest);
  }

  return { suggestions };
}
