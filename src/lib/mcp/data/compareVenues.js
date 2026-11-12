import { findPolymarketLiveMatchesForKalshi } from "@/lib/predictionMarkets/matchKalshiToPolymarketLive";
import { buildKalshiMatchQueryFromPolymarket } from "@/lib/predictionMarkets/matchPolymarketToKalshiLive";
import {
  getKalshiMarket,
  getPolymarketMarketByCondition,
  searchKalshi,
  searchPolymarket,
} from "@/lib/mcp/data/providers";

const GAMMA_BASE = (process.env.POLYMARKET_GAMMA_API_URL || "https://gamma-api.polymarket.com").replace(/\/$/, "");

async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json();
}

/** Shape Gamma public-search into the suggestion rows the matcher expects. */
async function fetchPolymarketSuggestions(q) {
  const url = `${GAMMA_BASE}/public-search?q=${encodeURIComponent(q)}&limit_per_type=20&search_profiles=false`;
  let body;
  try {
    body = await fetchJson(url);
  } catch {
    body = await fetchJson(`${GAMMA_BASE}/events?limit=20&active=true&closed=false`);
    const events = Array.isArray(body) ? body : [];
    return {
      suggestions: events.map((ev) => ({
        entity: "event",
        id: String(ev.id || ""),
        slug: ev.slug || null,
        title: ev.title || "",
        closed: ev.closed,
        raw: ev,
      })),
    };
  }
  const suggestions = [];
  for (const m of Array.isArray(body?.markets) ? body.markets : []) {
    suggestions.push({
      entity: "market",
      id: String(m.id || ""),
      slug: m.slug || null,
      title: m.question || m.title || "",
      conditionId: m.conditionId || m.condition_id || null,
      closed: m.closed,
      volume24hr: m.volume24hr,
      raw: m,
    });
  }
  for (const ev of Array.isArray(body?.events) ? body.events : []) {
    suggestions.push({
      entity: "event",
      id: String(ev.id || ""),
      slug: ev.slug || null,
      title: ev.title || "",
      closed: ev.closed,
      raw: ev,
    });
  }
  return { suggestions };
}

async function fetchEventsBySeries(slug) {
  const params = new URLSearchParams({
    series_slug: slug,
    closed: "false",
    order: "endDate",
    ascending: "true",
    limit: "8",
  });
  const body = await fetchJson(`${GAMMA_BASE}/events?${params}`);
  return Array.isArray(body) ? body : Array.isArray(body?.events) ? body.events : [];
}

function polymarketPullHint(market) {
  const conditionId = market?.conditionId || market?.condition_id || market?.raw?.conditionId || null;
  return conditionId
    ? { tool: "pull_market_bundle", condition_id: conditionId }
    : null;
}

function kalshiPullHint(ticker) {
  return ticker ? { tool: "preview_kalshi_market", ticker } : null;
}

/**
 * Cross-venue gap scan using Lychee matchers + live pulls (no HTML scrape).
 */
export async function compareVenues({ query = "", ticker = "", conditionId = "", limit = 8 } = {}) {
  const q = String(query || "").trim();
  const kalshiTicker = String(ticker || "").trim();
  const condition = String(conditionId || "").trim();

  if (!q && !kalshiTicker && !condition) {
    throw new Error("Provide query, ticker (Kalshi), or condition_id (Polymarket)");
  }

  // Seed from Kalshi ticker → match Polymarket via product matcher.
  if (kalshiTicker) {
    const kalshi = await getKalshiMarket(kalshiTicker);
    const match = await findPolymarketLiveMatchesForKalshi(
      {
        ticker: kalshi.market.ticker,
        title: kalshi.market.title,
        seriesTicker: String(kalshi.market.ticker || "").split("-")[0] || "",
      },
      {
        fetchSuggestions: fetchPolymarketSuggestions,
        fetchEventsBySeries,
      },
    );
    let candidates = (match.candidates || []).slice(0, limit).map((c) => ({
      tier: c.tier,
      score: c.score,
      reasons: c.reasons,
      market: {
        title: c.market?.title || c.market?.question || null,
        condition_id: c.market?.conditionId || c.market?.condition_id || null,
        slug: c.market?.slug || null,
        end_date: c.market?.endDate || c.market?.end_date || null,
      },
      pull: polymarketPullHint(c.market),
    }));

    // Fallback: title search when the series/crypto matcher finds nothing.
    if (!candidates.length && kalshi.market.title) {
      const hits = await searchPolymarket(kalshi.market.title, { limit });
      candidates = hits
        .filter((row) => row.entity === "market" || row.condition_id)
        .map((row) => ({
          tier: "related",
          score: null,
          reasons: ["Title search fallback"],
          market: {
            title: row.title,
            condition_id: row.condition_id,
            slug: row.slug,
            end_date: row.end_date || null,
          },
          pull: row.condition_id ? { tool: "pull_market_bundle", condition_id: row.condition_id } : null,
        }));
    }

    return {
      direction: "kalshi_to_polymarket",
      seed: { venue: "kalshi", ...kalshi.market, pull: kalshiPullHint(kalshi.market.ticker) },
      match_query: match.query,
      preselected: match.preselected
        ? {
            tier: match.preselected.tier,
            score: match.preselected.score,
            market: match.preselected.market,
            pull: polymarketPullHint(match.preselected.market),
          }
        : candidates[0] || null,
      candidates,
      empty_message: candidates.length ? null : match.emptyMessage,
      next: "pull_market_bundle on the best Polymarket condition_id; preview_kalshi_market on the seed; add_insight_blocks comparing prices/liquidity.",
    };
  }

  // Seed from Polymarket condition → search Kalshi by cleaned title.
  if (condition) {
    const market = await getPolymarketMarketByCondition(condition);
    const matchQuery = buildKalshiMatchQueryFromPolymarket({
      title: market.title,
      eventTitle: market.event_title,
      slug: market.slug,
    });
    const kalshiHits = matchQuery ? await searchKalshi(matchQuery, { limit }) : [];
    return {
      direction: "polymarket_to_kalshi",
      seed: {
        venue: "polymarket",
        ...market,
        pull: market.condition_id ? { tool: "pull_market_bundle", condition_id: market.condition_id } : null,
      },
      match_query: matchQuery,
      candidates: kalshiHits.map((row) => ({
        ...row,
        pull: kalshiPullHint(row.ticker),
      })),
      next: "preview_kalshi_market on the best ticker; pull_market_bundle on the Polymarket seed; write gap notes via add_insight_blocks.",
    };
  }

  // Free-text: search both and return dual candidate lists with pull hints.
  const [kalshi, polymarket] = await Promise.all([
    searchKalshi(q, { limit }),
    searchPolymarket(q, { limit }),
  ]);
  return {
    direction: "theme_both",
    query: q,
    kalshi,
    polymarket,
    next: "Pair the closest titles manually, then preview_kalshi_market + pull_market_bundle and compare in add_insight_blocks.",
  };
}
