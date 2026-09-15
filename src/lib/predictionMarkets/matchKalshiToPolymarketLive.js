/**
 * Kalshi → Polymarket matching.
 *
 * Polymarket public-search is a real text index, but Kalshi titles often include
 * strike/target prices and calendar dates that poison it (e.g. "BTC 15 min ·
 * $77,250.27 target" → MicroStrategy "September 15-21"). Recurring crypto
 * up/down contracts map 1:1 onto Gamma series (`btc-up-or-down-15m`) — look
 * those up directly, then fall back to a cleaned search. Rank locally and only
 * auto-select a clear winner.
 */

import { tokenizeMatchText } from "@/lib/predictionMarkets/matchPolymarketToKalshiLive";
import {
  polymarketRealtimeMarketFromSuggestion,
  polymarketRealtimeMarketKey,
  polymarketRealtimeMarketsFromEventSuggestion,
} from "@/lib/polymarketLive/polymarketRealtimeCompose";

/** @typedef {"exact" | "close" | "related" | "none"} MatchTier */
/** @typedef {"btc" | "eth" | "sol" | "gold"} CryptoAsset */
/** @typedef {"5m" | "15m" | "hourly" | "4h" | "daily"} CryptoHorizon */

/**
 * @typedef {{
 *   title?: string;
 *   eventTitle?: string;
 *   tags?: string[];
 *   ticker?: string;
 *   seriesTicker?: string;
 * }} KalshiMatchSource
 */

/**
 * @typedef {{
 *   market: Record<string, unknown>;
 *   score: number;
 *   tier: MatchTier;
 *   reasons: string[];
 * }} PolymarketMatchCandidate
 */

/**
 * @typedef {{
 *   query: string;
 *   candidates: PolymarketMatchCandidate[];
 *   preselected: PolymarketMatchCandidate | null;
 *   emptyMessage: string | null;
 * }} PolymarketMatchResult
 */

const POLY_NO_MATCH_MESSAGE =
  "Couldn’t find a Polymarket market for that Kalshi contract. Search Polymarket manually, or try another Kalshi market.";

const ASSET_SERIES = {
  btc: "btc",
  eth: "eth",
  sol: "sol",
};

/**
 * @param {unknown} value
 * @returns {string}
 */
function str(value) {
  return String(value ?? "").trim();
}

/**
 * Kalshi series ticker is the prefix before the first hyphen (`KXBTC15M-26SEP15…`).
 * @param {KalshiMatchSource} kalshi
 * @returns {string}
 */
export function kalshiSeriesTickerFromSource(kalshi) {
  const explicit = str(kalshi?.seriesTicker).toUpperCase();
  if (explicit) return explicit;
  const ticker = str(kalshi?.ticker).toUpperCase();
  if (!ticker) return "";
  const dash = ticker.indexOf("-");
  return dash > 0 ? ticker.slice(0, dash) : ticker;
}

/**
 * @param {KalshiMatchSource} kalshi
 * @returns {{ asset: CryptoAsset | null; horizon: CryptoHorizon | null }}
 */
export function inferKalshiAssetHorizon(kalshi) {
  const series = kalshiSeriesTickerFromSource(kalshi);
  const hay = `${series} ${str(kalshi?.ticker)} ${str(kalshi?.title)} ${str(kalshi?.eventTitle)}`.toLowerCase();

  /** @type {CryptoAsset | null} */
  let asset = null;
  if (/\bbtc\b|bitcoin/.test(hay) || /BTC/.test(series)) asset = "btc";
  else if (/\beth\b|ethereum/.test(hay) || /ETH/.test(series)) asset = "eth";
  else if (/\bsol\b|solana/.test(hay) || /SOL/.test(series)) asset = "sol";
  else if (/\bgold\b|\bxau\b/.test(hay) || /GOLD|XAU/.test(series)) asset = "gold";

  /** @type {CryptoHorizon | null} */
  let horizon = null;
  if (/15M/.test(series) || /15\s*min/.test(hay)) horizon = "15m";
  else if (/5M/.test(series) || /\b5\s*min/.test(hay)) horizon = "5m";
  else if (/4H/.test(series) || /\b4\s*h(?:our)?/.test(hay)) horizon = "4h";
  else if (/H$/.test(series) || /\bhourly\b|\b1\s*h(?:our)?/.test(hay)) horizon = "hourly";
  else if (/D$/.test(series) || /\bdaily\b|\b24\s*h/.test(hay)) horizon = "daily";

  return { asset, horizon };
}

/**
 * Recurring Polymarket series slug for a Kalshi crypto up/down contract.
 * @param {KalshiMatchSource} kalshi
 * @returns {string | null}
 */
export function polymarketSeriesSlugFromKalshi(kalshi) {
  const { asset, horizon } = inferKalshiAssetHorizon(kalshi);
  if (!asset || !horizon || asset === "gold") return null;
  const prefix = ASSET_SERIES[asset];
  if (!prefix) return null;
  const rec = horizon === "hourly" ? "hourly" : horizon;
  return `${prefix}-up-or-down-${rec}`;
}

/**
 * Horizon encoded in a Polymarket event/market slug (`btc-updown-15m-1789…`).
 * Do not infer 15m from calendar dates in the title ("September 15").
 * @param {string} slug
 * @param {string} [title]
 * @returns {CryptoHorizon | null}
 */
export function polymarketHorizonFromSlug(slug, title = "") {
  const s = str(slug).toLowerCase();
  if (/-15m(?:-|$)/.test(s) || /updown-15m/.test(s) || /up-or-down-15m/.test(s)) return "15m";
  if (/-5m(?:-|$)/.test(s) || /updown-5m/.test(s) || /up-or-down-5m/.test(s)) return "5m";
  if (/-4h(?:-|$)/.test(s) || /up-or-down-4h/.test(s)) return "4h";
  if (/hourly/.test(s) || /-1h(?:-|$)/.test(s)) return "hourly";
  if (/daily/.test(s) || /-1d(?:-|$)/.test(s)) return "daily";
  const t = str(title).toLowerCase();
  if (/\b15\s*min(?:ute)?s?\b/.test(t) || /\b15m\b/.test(t)) return "15m";
  if (/\b5\s*min(?:ute)?s?\b/.test(t) || /\b5m\b/.test(t)) return "5m";
  return null;
}

/**
 * Strip Kalshi strike/target decoration that poisons Polymarket search.
 * @param {string} text
 * @returns {string}
 */
export function cleanKalshiTextForPolymarketSearch(text) {
  return str(text)
    .replace(/\$[\d,]+(?:\.\d+)?/g, " ")
    .replace(/\b(?:target|strike)\b/gi, " ")
    .replace(/[·•—–]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Prefer the market question after an em dash over the event+strike prefix.
 * @param {KalshiMatchSource} kalshi
 * @returns {string}
 */
export function preferredKalshiSearchText(kalshi) {
  const title = str(kalshi?.title);
  const eventTitle = str(kalshi?.eventTitle);
  const parts = title.split(/\s+[—–]\s+/);
  if (parts.length > 1) {
    const eventPart = str(parts[0]);
    const marketPart = str(parts[parts.length - 1]);
    // "Ito vs Knutson — Gabriela Knutson wins" → search the matchup, not only the YES player.
    if (/\bvs\.?\b/i.test(eventPart) && eventPart.length >= 6) return eventPart;
    if (marketPart.length >= 12) return marketPart;
  }
  return eventTitle || title;
}

/**
 * @param {CryptoAsset | null} asset
 * @param {CryptoHorizon | null} horizon
 * @returns {string | null}
 */
function searchQueryForAssetHorizon(asset, horizon) {
  if (!asset || !horizon) return null;
  const name = asset === "btc" ? "Bitcoin" : asset === "eth" ? "Ethereum" : asset === "sol" ? "Solana" : "Gold";
  const rec =
    horizon === "15m"
      ? "15m"
      : horizon === "5m"
        ? "5m"
        : horizon === "4h"
          ? "4h"
          : horizon === "hourly"
            ? "Hourly"
            : "Daily";
  return `${name} Up or Down ${rec}`;
}

/**
 * @param {KalshiMatchSource} kalshi
 * @returns {string[]}
 */
export function polymarketMatchQueriesFromKalshi(kalshi) {
  const source = kalshi && typeof kalshi === "object" ? kalshi : {};
  const { asset, horizon } = inferKalshiAssetHorizon(source);
  const pattern = searchQueryForAssetHorizon(asset, horizon);
  /** @type {string[]} */
  const queries = [];
  const push = (q) => {
    const next = str(q);
    if (next.length < 2) return;
    if (queries.some((existing) => existing.toLowerCase() === next.toLowerCase())) return;
    queries.push(next);
  };
  push(pattern);
  if (!pattern) {
    push(cleanKalshiTextForPolymarketSearch(preferredKalshiSearchText(source)));
    const title = str(source.title);
    const parts = title.split(/\s+[—–]\s+/);
    if (parts.length > 1) {
      push(cleanKalshiTextForPolymarketSearch(parts[0]));
      push(cleanKalshiTextForPolymarketSearch(parts[parts.length - 1]));
    }
    if (source.eventTitle && str(source.eventTitle) !== title) {
      push(cleanKalshiTextForPolymarketSearch(source.eventTitle));
    }
  }
  return queries;
}

/**
 * @param {KalshiMatchSource} kalshi
 * @returns {string}
 */
export function buildPolymarketMatchQueryFromKalshi(kalshi) {
  return polymarketMatchQueriesFromKalshi(kalshi)[0] || "";
}

/**
 * @param {Iterable<string>} a
 * @param {Iterable<string>} b
 */
function jaccard(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter += 1;
  return inter / (A.size + B.size - inter);
}

/**
 * @param {string[]} tokens
 * @returns {string[]}
 */
function expandHorizonTokens(tokens) {
  const out = new Set(tokens);
  const blob = tokens.join(" ");
  if (tokens.includes("btc") || tokens.includes("bitcoin")) {
    out.add("btc");
    out.add("bitcoin");
  }
  if (/\b15m\b/.test(blob) || (tokens.includes("15") && /min/.test(blob))) {
    out.add("15m");
    out.add("15");
    out.add("min");
    out.add("minute");
    out.add("minutes");
  }
  if (tokens.includes("up") || tokens.includes("down")) {
    out.add("up");
    out.add("down");
  }
  return [...out];
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
function parseTimeMs(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value;
  }
  const s = String(value).trim();
  // Gamma `endDateIso` is often a calendar date (`2026-09-15`), not the window close.
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const ms = Date.parse(s);
  return Number.isFinite(ms) ? ms : null;
}

const HORIZON_MS = {
  "5m": 5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  hourly: 60 * 60 * 1000,
  "4h": 4 * 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
};

/**
 * Recurring up/down slugs encode the window start as a unix suffix
 * (`btc-updown-15m-1789457400`). Gamma `startDate` is market creation, not the window.
 * @param {Record<string, unknown>} market
 * @returns {{ start: number; end: number } | null}
 */
export function polymarketWindowBounds(market) {
  const slug = str(market?.slug);
  const horizon = polymarketHorizonFromSlug(slug, str(market?.title));
  const unix = slug.match(/-(\d{9,})$/);
  if (unix && horizon && HORIZON_MS[horizon]) {
    const start = Number(unix[1]) * 1000;
    if (Number.isFinite(start) && start > 0) {
      return { start, end: start + HORIZON_MS[horizon] };
    }
  }
  const start = parseTimeMs(market?.eventStartTime) || parseTimeMs(market?.startTime);
  const end = parseTimeMs(market?.endDate) || parseTimeMs(market?.endTime);
  if (start != null && end != null && end > start) return { start, end };
  if (end != null && horizon && HORIZON_MS[horizon]) {
    return { start: end - HORIZON_MS[horizon], end };
  }
  return null;
}

/**
 * Currently-open window scores highest; upcoming windows a bit less.
 * @param {Record<string, unknown>} market
 * @param {number} nowMs
 * @returns {number}
 */
function liveWindowBonus(market, nowMs) {
  if (market?.closed === true || market?.closed === "true") return -0.35;
  const bounds = polymarketWindowBounds(market);
  if (!bounds) return 0;
  if (bounds.end <= nowMs) return -0.35;
  if (bounds.start <= nowMs && nowMs < bounds.end) return 0.22;
  if (bounds.start > nowMs && bounds.start - nowMs <= 2 * 60 * 60 * 1000) return 0.08;
  return 0;
}

/**
 * @param {PolymarketMatchCandidate[]} candidates
 * @param {number} nowMs
 * @returns {PolymarketMatchCandidate | null}
 */
export function pickLivePolymarketSeriesCandidate(candidates, nowMs) {
  const list = Array.isArray(candidates) ? candidates : [];
  if (!list.length) return null;
  /** @type {{ candidate: PolymarketMatchCandidate; bounds: { start: number; end: number } }[]} */
  const dated = [];
  for (const candidate of list) {
    const bounds = polymarketWindowBounds(candidate.market);
    if (bounds) dated.push({ candidate, bounds });
  }
  const live = dated
    .filter((row) => row.bounds.start <= nowMs && nowMs < row.bounds.end)
    .sort((a, b) => a.bounds.end - b.bounds.end);
  if (live[0]) return live[0].candidate;
  const upcoming = dated
    .filter((row) => row.bounds.start >= nowMs)
    .sort((a, b) => a.bounds.start - b.bounds.start);
  return upcoming[0]?.candidate || null;
}

/**
 * @param {KalshiMatchSource} kalshi
 * @param {Record<string, unknown>} polymarket
 * @param {{ nowMs?: number }} [opts]
 * @returns {PolymarketMatchCandidate}
 */
export function scoreKalshiToPolymarketPair(kalshi, polymarket, opts = {}) {
  const source = kalshi && typeof kalshi === "object" ? kalshi : {};
  const market = polymarket && typeof polymarket === "object" ? polymarket : {};
  const kalshiHay = cleanKalshiTextForPolymarketSearch(
    [source.title, source.eventTitle, source.ticker, source.seriesTicker, ...(Array.isArray(source.tags) ? source.tags : [])]
      .filter(Boolean)
      .join(" "),
  );
  const polyHay = [market.title, market.slug, market.eventTitle, ...(Array.isArray(market.tags) ? market.tags : [])]
    .filter(Boolean)
    .join(" ");

  const kalshiTokens = expandHorizonTokens(tokenizeMatchText(kalshiHay));
  const polyTokens = expandHorizonTokens(tokenizeMatchText(polyHay));
  const overlap = jaccard(kalshiTokens, polyTokens);

  /** @type {string[]} */
  const reasons = [];
  let score = overlap * 0.5;
  if (overlap >= 0.4) reasons.push("Strong title overlap");
  else if (overlap >= 0.2) reasons.push("Partial title overlap");

  const nameTokens = (tokens) =>
    tokens.filter((token) => token.length >= 3 && !/^(yes|no|win|wins|will|the|and|vs)$/.test(token));
  const kalshiNames = new Set(nameTokens(kalshiTokens));
  const polyNames = nameTokens(polyTokens);
  let nameHits = 0;
  for (const token of polyNames) if (kalshiNames.has(token)) nameHits += 1;
  if (nameHits >= 2) {
    score += 0.28;
    reasons.push("Matching names in both titles");
  } else if (nameHits === 1) {
    score += 0.1;
    reasons.push("Shared name token");
  }

  const inferred = inferKalshiAssetHorizon(source);
  const polyHorizon = polymarketHorizonFromSlug(str(market.slug), str(market.title) || str(market.eventTitle));
  const pBlob = polyHay.toLowerCase();

  if (inferred.horizon && polyHorizon && inferred.horizon !== polyHorizon) {
    return {
      market,
      score: 0,
      tier: "none",
      reasons: [`Horizon mismatch (${inferred.horizon} vs ${polyHorizon})`],
    };
  }
  if (inferred.horizon && polyHorizon && inferred.horizon === polyHorizon) {
    score += 0.32;
    reasons.push(`Same ${inferred.horizon} horizon`);
  } else if (inferred.horizon && !polyHorizon) {
    score -= 0.22;
  }

  const kBtc = inferred.asset === "btc" || /\bbtc\b|bitcoin/.test(kalshiHay.toLowerCase());
  const pBtc = /\bbtc\b|bitcoin/.test(pBlob);
  const kEth = inferred.asset === "eth";
  const pEth = /\beth\b|ethereum/.test(pBlob);
  const kSol = inferred.asset === "sol";
  const pSol = /\bsol\b|solana/.test(pBlob);
  if ((kBtc && pBtc) || (kEth && pEth) || (kSol && pSol)) {
    score += 0.2;
    reasons.push("Same underlying asset");
  } else if (inferred.asset && (pBtc || pEth || pSol) && !(kBtc && pBtc) && !(kEth && pEth) && !(kSol && pSol)) {
    score -= 0.35;
    reasons.push("Different underlying asset");
  }

  const kDir = /\bup\b|\bdown\b/.test(kalshiHay.toLowerCase()) || Boolean(inferred.horizon);
  const pDir = /\bup\b|\bdown\b|updown|up or down/.test(pBlob);
  if (kDir && pDir) {
    score += 0.16;
    reasons.push("Both are up/down direction markets");
  }

  const pCorporate =
    /microstrategy|\bmstr\b|purchase|purchases|buys|bought|treasury|holdings|announces/.test(pBlob);
  if (pCorporate && (inferred.horizon || kDir)) {
    return {
      market,
      score: 0,
      tier: "none",
      reasons: ["Dropped corporate/holdings BTC market"],
    };
  }

  const nowMs = typeof opts.nowMs === "number" ? opts.nowMs : Date.now();
  const windowBonus = liveWindowBonus(market, nowMs);
  if (windowBonus > 0) reasons.push("Live window is open now");
  score += windowBonus;

  score = Math.max(0, Math.min(1, score));
  /** @type {MatchTier} */
  let tier = "none";
  const sameHorizon = Boolean(inferred.horizon && polyHorizon && inferred.horizon === polyHorizon);
  if (score >= 0.72 && (!inferred.horizon || sameHorizon)) tier = "exact";
  else if (score >= 0.48) tier = "close";
  else if (score >= 0.18) tier = "related";

  return { market, score, tier, reasons };
}

/**
 * @param {KalshiMatchSource} kalshi
 * @param {Record<string, unknown>[]} markets
 * @param {{ nowMs?: number }} [opts]
 * @returns {PolymarketMatchCandidate[]}
 */
export function rankPolymarketCandidatesForKalshi(kalshi, markets, opts = {}) {
  return (Array.isArray(markets) ? markets : [])
    .map((market) => scoreKalshiToPolymarketPair(kalshi, market, opts))
    .filter((row) => row.tier !== "none")
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}

/**
 * @param {unknown[]} suggestions
 * @returns {Record<string, unknown>[]}
 */
export function flattenPolymarketSuggestionsToMarkets(suggestions) {
  /** @type {Record<string, unknown>[]} */
  const markets = [];
  const seen = new Set();
  const push = (market) => {
    if (!market || typeof market !== "object") return;
    const key = polymarketRealtimeMarketKey(market);
    if (!key || seen.has(key)) return;
    seen.add(key);
    markets.push(market);
  };
  for (const row of Array.isArray(suggestions) ? suggestions : []) {
    if (!row || typeof row !== "object") continue;
    const item = /** @type {Record<string, unknown>} */ (row);
    const entity = str(item.entity);
    const closed = item.closed === true || item.closed === "true";
    if (entity === "market" && !closed) {
      push(polymarketRealtimeMarketFromSuggestion(item));
    } else if (entity === "event") {
      for (const nested of polymarketRealtimeMarketsFromEventSuggestion(item)) {
        push(nested);
      }
    }
  }
  return markets;
}

/**
 * @param {unknown} events
 * @returns {Record<string, unknown>[]}
 */
export function marketsFromGammaEvents(events) {
  const list = Array.isArray(events) ? events : [];
  /** @type {Record<string, unknown>[]} */
  const markets = [];
  const seen = new Set();
  for (const event of list) {
    if (!event || typeof event !== "object") continue;
    const row = /** @type {Record<string, unknown>} */ (event);
    const nested = polymarketRealtimeMarketsFromEventSuggestion({
      entity: "event",
      id: str(row.id),
      slug: str(row.slug),
      title: str(row.title),
      closed: row.closed,
      raw: row,
    });
    for (const market of nested) {
      const key = polymarketRealtimeMarketKey(market);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      markets.push(market);
    }
  }
  return markets;
}

/**
 * @param {unknown} data
 * @returns {unknown[]}
 */
function asEventList(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    const row = /** @type {Record<string, unknown>} */ (data);
    if (Array.isArray(row.events)) return row.events;
  }
  return [];
}

/**
 * @param {KalshiMatchSource} kalshi
 * @param {{
 *   signal?: AbortSignal;
 *   nowMs?: number;
 *   fetchSuggestions?: (q: string, signal?: AbortSignal) => Promise<{ suggestions?: unknown[] }>;
 *   fetchEventsBySeries?: (seriesSlug: string, signal?: AbortSignal) => Promise<unknown[]>;
 * }} [opts]
 * @returns {Promise<PolymarketMatchResult>}
 */
export async function findPolymarketLiveMatchesForKalshi(kalshi, opts = {}) {
  const queries = polymarketMatchQueriesFromKalshi(kalshi);
  const seriesSlug = polymarketSeriesSlugFromKalshi(kalshi);
  const query = seriesSlug || queries[0] || "";
  if (!query && !seriesSlug) {
    return {
      query,
      candidates: [],
      preselected: null,
      emptyMessage: POLY_NO_MATCH_MESSAGE,
    };
  }

  const fetchSuggestions =
    opts.fetchSuggestions ||
    (async (q, signal) => {
      const params = new URLSearchParams({
        query: "metadataSuggestions",
        q,
        limit_per_type: "20",
        search_tags: "true",
        search_profiles: "false",
        keep_closed_markets: "0",
      });
      const res = await fetch(`/api/integrations/polymarket?${params.toString()}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data?.message === "string" ? data.message : "Polymarket search failed",
        );
      }
      return data;
    });

  const fetchEventsBySeries =
    opts.fetchEventsBySeries ||
    (async (slug, signal) => {
      const params = new URLSearchParams({
        query: "listEvents",
        series_slug: slug,
        closed: "false",
        order: "endDate",
        ascending: "true",
        limit: "8",
        skipFlatten: "true",
      });
      const res = await fetch(`/api/integrations/polymarket?${params.toString()}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal,
      });
      const data = await res.json().catch(() => []);
      if (!res.ok) {
        throw new Error(
          typeof data?.message === "string" ? data.message : "Polymarket series lookup failed",
        );
      }
      return asEventList(data);
    });

  /** @type {Record<string, unknown>[]} */
  const merged = [];
  const seen = new Set();
  const pushMarket = (market) => {
    if (!market || typeof market !== "object") return;
    const key = polymarketRealtimeMarketKey(market);
    if (!key || seen.has(key)) return;
    seen.add(key);
    merged.push(market);
  };

  if (seriesSlug) {
    const events = await fetchEventsBySeries(seriesSlug, opts.signal);
    for (const market of marketsFromGammaEvents(events)) pushMarket(market);
  }

  if (!merged.length) {
    for (const q of queries.slice(0, 3)) {
      const body = await fetchSuggestions(q, opts.signal);
      for (const market of flattenPolymarketSuggestionsToMarkets(body?.suggestions)) {
        pushMarket(market);
      }
    }
  }

  const nowMs = typeof opts.nowMs === "number" ? opts.nowMs : Date.now();
  let candidates = rankPolymarketCandidatesForKalshi(kalshi, merged, { nowMs });
  if (!candidates.length) {
    return {
      query,
      candidates: [],
      preselected: null,
      emptyMessage: POLY_NO_MATCH_MESSAGE,
    };
  }

  if (seriesSlug) {
    const live = pickLivePolymarketSeriesCandidate(candidates, nowMs);
    if (live) {
      live.tier = "exact";
      live.score = Math.max(live.score, 0.9);
      if (!live.reasons.includes("Current window in the same Polymarket series")) {
        live.reasons = [...live.reasons, "Current window in the same Polymarket series"];
      }
      for (const row of candidates) {
        if (row !== live && row.tier === "exact") row.tier = "close";
      }
      candidates = [live, ...candidates.filter((row) => row !== live)];
    }
  }

  const top = candidates[0];
  const second = candidates[1];
  const seriesExact = Boolean(seriesSlug && top?.tier === "exact");
  const clearWinner =
    top &&
    (top.tier === "exact" || top.tier === "close") &&
    (seriesExact || !second || top.score - second.score >= 0.12);

  return {
    query,
    candidates,
    preselected: clearWinner ? top : null,
    emptyMessage: null,
  };
}
