/**
 * Reusable Polymarket ↔ Kalshi Live market matching.
 *
 * Kalshi natural-language search (embedding-suggestions) accepts only a free-text
 * `q` string — not structured event metadata. We pack title, outcomes, category,
 * and dates into that query, then score returned series/markets locally.
 *
 * Known data incompatibilities (do not paper over):
 * - Embedding hits are series/event bundles with nested markets; no API match score.
 * - Resolution rules / settlement conditions are not returned by search — exact
 *   contractual equivalence cannot be proven from search payloads alone.
 * - Volume units differ (Kalshi contracts vs Polymarket USDC notionals).
 * - Multi-outcome Polymarket markets rarely map 1:1 to binary Kalshi YES/NO.
 * - Close/expiration fields use different shapes and may be missing on either side.
 */

import { isKalshiEmbeddingSearchEligible } from "@/lib/kalshiLive/kalshiLiveEmbeddingSearch";
import { impliedChancePctFromMarketRow } from "@/lib/kalshiLive/eventCandlesticksPowerMove";

/** @typedef {"exact" | "close" | "related" | "none"} MatchTier */

/**
 * @typedef {{
 *   marketTicker: string;
 *   title: string;
 *   eventTicker?: string;
 *   seriesTicker?: string;
 *   category?: string;
 *   status?: string;
 *   closeTime?: string;
 *   yesSubtitle?: string;
 *   noSubtitle?: string;
 *   chancePct?: number | null;
 *   volume?: number | null;
 *   suggestionTitle?: string;
 *   raw: Record<string, unknown>;
 * }} KalshiMatchCandidateMarket
 */

/**
 * @typedef {{
 *   market: KalshiMatchCandidateMarket;
 *   score: number;
 *   tier: MatchTier;
 *   reasons: string[];
 *   warnings: string[];
 * }} KalshiMatchCandidate
 */

/**
 * @typedef {{
 *   query: string;
 *   candidates: KalshiMatchCandidate[];
 *   preselected: KalshiMatchCandidate | null;
 *   requiresUserChoice: boolean;
 *   emptyMessage: string | null;
 * }} KalshiMatchResult
 */

const STOP = new Set([
  "a",
  "an",
  "the",
  "of",
  "on",
  "in",
  "to",
  "for",
  "and",
  "or",
  "will",
  "be",
  "by",
  "at",
  "is",
  "are",
  "was",
  "were",
  "next",
  "before",
  "after",
  "with",
  "from",
  "that",
  "this",
  "market",
  "yes",
  "no",
]);

/**
 * @param {unknown} value
 * @returns {string}
 */
function str(value) {
  return String(value ?? "").trim();
}

/**
 * @param {string} text
 * @returns {string[]}
 */
export function tokenizeMatchText(text) {
  return str(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP.has(t));
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
 * @param {unknown} value
 * @returns {number | null}
 */
function parseTimeMs(value) {
  const raw = str(value);
  if (!raw) return null;
  const ms = Date.parse(raw);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * @param {Record<string, unknown>} polymarket
 * @returns {string}
 */
export function buildKalshiMatchQueryFromPolymarket(polymarket) {
  const market = polymarket && typeof polymarket === "object" ? polymarket : {};
  const title = str(market.title || market.question || market.slug);
  const outcomes = Array.isArray(market.outcomes)
    ? market.outcomes.map((o) => str(o)).filter(Boolean)
    : [];
  const tags = Array.isArray(market.tags)
    ? market.tags.map((t) => str(t)).filter(Boolean)
    : [];
  const category = str(market.category || market.groupItemTitle || tags[0] || "");
  const end =
    str(market.endDateIso) ||
    str(market.endDate) ||
    str(market.closedTime) ||
    str(market.end_date_iso) ||
    "";

  const parts = [
    title,
    outcomes.length ? `outcomes ${outcomes.join(" / ")}` : "",
    category ? `category ${category}` : "",
    end ? `resolves ${end.slice(0, 10)}` : "",
    "prediction market",
  ].filter(Boolean);

  return parts.join(". ").replace(/\s+/g, " ").trim();
}

/**
 * @param {Record<string, unknown>} polymarket
 * @returns {{ yesLabel: string; noLabel: string | null; isBinary: boolean; outcomeCount: number }}
 */
export function polymarketOutcomeShape(polymarket) {
  const outcomes = Array.isArray(polymarket?.outcomes)
    ? polymarket.outcomes.map((o) => str(o)).filter(Boolean)
    : [];
  const lower = outcomes.map((o) => o.toLowerCase());
  const yesIdx = lower.findIndex((o) => o === "yes");
  const noIdx = lower.findIndex((o) => o === "no");
  const isBinary =
    outcomes.length === 2 &&
    ((yesIdx >= 0 && noIdx >= 0) || outcomes.length === 2);
  return {
    yesLabel: yesIdx >= 0 ? outcomes[yesIdx] : outcomes[0] || "Yes",
    noLabel: noIdx >= 0 ? outcomes[noIdx] : outcomes[1] || null,
    isBinary: outcomes.length === 2,
    outcomeCount: outcomes.length,
  };
}

/**
 * Flatten embedding suggestions into market-level candidates.
 * @param {import("@/lib/kalshiLive/kalshiLiveEmbeddingSearch").KalshiEmbeddingSearchSuggestion[]} suggestions
 * @returns {KalshiMatchCandidateMarket[]}
 */
export function flattenKalshiEmbeddingSuggestionsToMarkets(suggestions) {
  const list = Array.isArray(suggestions) ? suggestions : [];
  /** @type {KalshiMatchCandidateMarket[]} */
  const out = [];
  const seen = new Set();

  for (const suggestion of list) {
    const markets = Array.isArray(suggestion?.markets) ? suggestion.markets : [];
    const seriesTicker = str(suggestion?.ticker);
    const eventTicker = str(suggestion?.eventTicker);
    const suggestionTitle = str(suggestion?.title);
    const category = str(suggestion?.category);

    if (!markets.length) continue;

    for (const raw of markets) {
      if (!raw || typeof raw !== "object") continue;
      const row = /** @type {Record<string, unknown>} */ (raw);
      const marketTicker = str(row.ticker).toUpperCase();
      if (!marketTicker || seen.has(marketTicker)) continue;
      seen.add(marketTicker);

      const yesSub = str(row.yes_sub_title || row.yes_subtitle || row.subtitle);
      const title =
        yesSub ||
        str(row.title) ||
        suggestionTitle ||
        marketTicker;

      out.push({
        marketTicker,
        title,
        eventTicker: eventTicker || undefined,
        seriesTicker: seriesTicker || undefined,
        category: category || undefined,
        status: str(row.status) || undefined,
        closeTime: str(row.close_time || row.close_ts || row.expected_expiration_time) || undefined,
        yesSubtitle: yesSub || undefined,
        noSubtitle: str(row.no_sub_title || row.no_subtitle) || undefined,
        chancePct: impliedChancePctFromMarketRow(row),
        volume:
          row.volume_fp != null && Number.isFinite(Number(row.volume_fp))
            ? Number(row.volume_fp)
            : row.volume != null && Number.isFinite(Number(row.volume))
              ? Number(row.volume)
              : null,
        suggestionTitle: suggestionTitle || undefined,
        raw: row,
      });
    }
  }

  return out;
}

/**
 * @param {Record<string, unknown>} polymarket
 * @param {KalshiMatchCandidateMarket} kalshi
 * @returns {KalshiMatchCandidate}
 */
export function scorePolymarketKalshiMarketPair(polymarket, kalshi) {
  const polyTitle = str(polymarket?.title || polymarket?.question || "");
  const polyTokens = tokenizeMatchText(
    [polyTitle, ...(Array.isArray(polymarket?.tags) ? polymarket.tags : [])].join(" "),
  );
  const kalshiTokens = tokenizeMatchText(
    [kalshi.title, kalshi.suggestionTitle, kalshi.yesSubtitle, kalshi.noSubtitle, kalshi.category]
      .filter(Boolean)
      .join(" "),
  );

  const titleOverlap = jaccard(polyTokens, kalshiTokens);
  /** @type {string[]} */
  const reasons = [];
  /** @type {string[]} */
  const warnings = [];

  let score = titleOverlap * 0.55;
  if (titleOverlap >= 0.45) reasons.push("Strong title overlap");
  else if (titleOverlap >= 0.25) reasons.push("Partial title overlap");
  else warnings.push("Weak title overlap");

  const shape = polymarketOutcomeShape(polymarket);
  if (!shape.isBinary) {
    warnings.push("Polymarket market is not a simple YES/NO binary contract");
    score -= 0.15;
  } else {
    reasons.push("Both sides look binary (YES/NO style)");
    score += 0.08;
  }

  const polyStatus = str(polymarket?.closed ? "closed" : polymarket?.active === false ? "closed" : "open").toLowerCase();
  const kalshiStatus = str(kalshi.status || "open").toLowerCase();
  const polyOpen = !["closed", "resolved", "settled"].includes(polyStatus) && polymarket?.closed !== true;
  const kalshiOpen = !["closed", "determined", "finalized", "settled"].includes(kalshiStatus);
  if (polyOpen && kalshiOpen) {
    score += 0.1;
    reasons.push("Both markets appear live/open");
  } else if (polyOpen !== kalshiOpen) {
    score -= 0.2;
    warnings.push("Market status may differ (live vs closed)");
  }

  const polyEnd =
    parseTimeMs(polymarket?.endDateIso) ||
    parseTimeMs(polymarket?.endDate) ||
    parseTimeMs(polymarket?.closedTime);
  const kalshiEnd = parseTimeMs(kalshi.closeTime);
  if (polyEnd != null && kalshiEnd != null) {
    const dayDiff = Math.abs(polyEnd - kalshiEnd) / (24 * 60 * 60 * 1000);
    if (dayDiff <= 7) {
      score += 0.18;
      reasons.push("Resolution windows are within about a week");
    } else if (dayDiff <= 45) {
      score += 0.06;
      warnings.push("Resolution periods may differ");
    } else {
      score -= 0.12;
      warnings.push("Resolution periods look materially different");
    }
  } else {
    warnings.push("Could not compare resolution dates from available metadata");
  }

  // Settlement / rules are not in search payloads — never claim exact on text alone.
  warnings.push(
    "Settlement rules are not fully available from search results; treat matches as provisional",
  );

  score = Math.max(0, Math.min(1, score));

  /** @type {MatchTier} */
  let tier = "none";
  // Exact requires near-identical titles + open + date alignment; still rare by design.
  if (
    score >= 0.88 &&
    titleOverlap >= 0.72 &&
    shape.isBinary &&
    polyOpen &&
    kalshiOpen &&
    polyEnd != null &&
    kalshiEnd != null &&
    Math.abs(polyEnd - kalshiEnd) / (24 * 60 * 60 * 1000) <= 7
  ) {
    tier = "exact";
  } else if (score >= 0.55 && titleOverlap >= 0.28) {
    tier = "close";
  } else if (score >= 0.35 && titleOverlap >= 0.18) {
    tier = "related";
  } else {
    tier = "none";
  }

  return {
    market: kalshi,
    score,
    tier,
    reasons,
    warnings,
  };
}

/**
 * @param {Record<string, unknown>} polymarket
 * @param {import("@/lib/kalshiLive/kalshiLiveEmbeddingSearch").KalshiEmbeddingSearchSuggestion[]} suggestions
 * @returns {KalshiMatchCandidate[]}
 */
export function rankKalshiCandidatesForPolymarket(polymarket, suggestions) {
  const markets = flattenKalshiEmbeddingSuggestionsToMarkets(suggestions);
  return markets
    .map((market) => scorePolymarketKalshiMarketPair(polymarket, market))
    .filter((c) => c.tier !== "none")
    .sort((a, b) => b.score - a.score)
    .slice(0, 12);
}

/**
 * Client-side match: build query → embedding search → score.
 *
 * @param {Record<string, unknown>} polymarket
 * @param {{
 *   signal?: AbortSignal;
 *   fetchSuggestions?: (q: string, signal?: AbortSignal) => Promise<{ suggestions?: unknown[] }>;
 * }} [opts]
 * @returns {Promise<KalshiMatchResult>}
 */
export async function findKalshiLiveMatchesForPolymarket(polymarket, opts = {}) {
  const query = buildKalshiMatchQueryFromPolymarket(polymarket);
  const emptyMessage =
    "We couldn’t find an equivalent live Kalshi market for this event. Try another market or search Kalshi manually.";

  if (!isKalshiEmbeddingSearchEligible(query)) {
    return {
      query,
      candidates: [],
      preselected: null,
      requiresUserChoice: false,
      emptyMessage,
    };
  }

  const fetchSuggestions =
    opts.fetchSuggestions ||
    (async (q, signal) => {
      const res = await fetch(
        `/api/integrations/kalshi-live/search/embedding-suggestions?${new URLSearchParams({ q }).toString()}`,
        {
          credentials: "same-origin",
          headers: { Accept: "application/json" },
          signal,
        },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof body?.error === "string" ? body.error : "Kalshi search failed",
        );
      }
      return body;
    });

  const body = await fetchSuggestions(query, opts.signal);
  const suggestions = Array.isArray(body?.suggestions) ? body.suggestions : [];
  const candidates = rankKalshiCandidatesForPolymarket(polymarket, suggestions);

  if (!candidates.length) {
    return {
      query,
      candidates: [],
      preselected: null,
      requiresUserChoice: false,
      emptyMessage,
    };
  }

  const top = candidates[0];
  const second = candidates[1];
  const clearWinner =
    top &&
    (top.tier === "exact" || top.tier === "close") &&
    (!second || top.score - second.score >= 0.12);

  return {
    query,
    candidates,
    preselected: clearWinner ? top : null,
    requiresUserChoice: !clearWinner,
    emptyMessage: null,
  };
}

/**
 * Human label for match tier badges.
 * @param {MatchTier} tier
 */
export function matchTierLabel(tier) {
  if (tier === "exact") return "Exact match";
  if (tier === "close") return "Close match";
  if (tier === "related") return "Related market";
  return "No match";
}
