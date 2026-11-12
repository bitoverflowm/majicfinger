import { fetchKalshiLiveSearchSuggestions } from "@/lib/kalshiLive/kalshiLiveSearchSuggestions";
import { orderProfileSuggestions } from "@/lib/polymarketLive/polymarketPublicSearch";
import { flattenPolymarketHoldersV2 } from "@/lib/mcp/data/holdersFlatten";

export { flattenPolymarketHoldersV2 };

const GAMMA_BASE = (process.env.POLYMARKET_GAMMA_API_URL || "https://gamma-api.polymarket.com").replace(/\/$/, "");
const DATA_API_BASE = (process.env.POLYMARKET_DATA_API_URL || "https://data-api.polymarket.com").replace(/\/$/, "");

async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json();
}

function mapMarket(m) {
  return {
    venue: "polymarket",
    entity: "market",
    id: String(m.id || ""),
    slug: m.slug || null,
    title: m.question || m.title || "",
    condition_id: m.conditionId || m.condition_id || null,
    volume: Number(m.volumeNum ?? m.volume) || null,
    volume_24h: Number(m.volume24hr ?? m.volume_24hr) || null,
    liquidity: Number(m.liquidityNum ?? m.liquidity) || null,
    end_date: m.endDate || m.end_date_iso || null,
    active: m.active ?? null,
    closed: m.closed ?? null,
    outcomes: typeof m.outcomes === "string" ? safeJson(m.outcomes) : m.outcomes || null,
    outcome_prices: typeof m.outcomePrices === "string" ? safeJson(m.outcomePrices) : m.outcomePrices || null,
    clob_token_ids: typeof m.clobTokenIds === "string" ? safeJson(m.clobTokenIds) : m.clobTokenIds || null,
    event_slug: m.eventSlug || m.events?.[0]?.slug || null,
    event_title: m.events?.[0]?.title || null,
  };
}

function safeJson(value) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export async function searchKalshi(query, { limit = 12 } = {}) {
  const q = String(query || "").trim();
  if (q.length < 2) return [];
  const { suggestions } = await fetchKalshiLiveSearchSuggestions(q, {
    limit: Math.min(40, Math.max(1, limit)),
  });
  return (suggestions || []).slice(0, limit).map((item) => ({
    venue: "kalshi",
    entity: "market",
    ticker: item.ticker,
    title: item.title,
    event_ticker: item.eventTicker || null,
    status: item.status || null,
    close_time: item.closeTime || null,
    pull: {
      tool: "preview_kalshi_market",
      ticker: item.ticker,
    },
  }));
}

export async function searchPolymarket(query, { limit = 12 } = {}) {
  const q = String(query || "").trim();
  if (q.length < 2) return [];
  const url = `${GAMMA_BASE}/public-search?q=${encodeURIComponent(q)}&limit_per_type=${Math.min(20, limit)}`;
  let body;
  try {
    body = await fetchJson(url);
  } catch {
    body = await fetchJson(`${GAMMA_BASE}/events?limit=${Math.min(20, limit)}&active=true&closed=false`);
    const events = Array.isArray(body) ? body : [];
    const needle = q.toLowerCase();
    return events
      .filter((ev) => String(ev?.title || "").toLowerCase().includes(needle))
      .slice(0, limit)
      .map((ev) => ({
        venue: "polymarket",
        entity: "event",
        id: String(ev.id || ""),
        slug: ev.slug || null,
        title: ev.title || "",
        volume: ev.volume ?? null,
        condition_id: Array.isArray(ev.markets) ? ev.markets[0]?.conditionId || null : null,
        pull: {
          tool: "pull_market_bundle",
          condition_id: Array.isArray(ev.markets) ? ev.markets[0]?.conditionId || null : null,
        },
      }));
  }

  const events = Array.isArray(body?.events) ? body.events : [];
  const markets = Array.isArray(body?.markets) ? body.markets : [];
  const profiles = Array.isArray(body?.profiles) ? body.profiles : [];

  const mapped = [
    ...markets.map((m) => {
      const row = mapMarket(m);
      return {
        ...row,
        pull: row.condition_id
          ? { tool: "pull_market_bundle", condition_id: row.condition_id, slug: row.slug }
          : null,
      };
    }),
    ...events.map((ev) => ({
      venue: "polymarket",
      entity: "event",
      id: String(ev.id || ""),
      slug: ev.slug || null,
      title: ev.title || "",
      volume: ev.volume ?? null,
      condition_id: Array.isArray(ev.markets) ? ev.markets[0]?.conditionId || null : null,
      markets: Array.isArray(ev.markets)
        ? ev.markets.slice(0, 12).map((m) => ({
            title: m.question || m.groupItemTitle || "",
            condition_id: m.conditionId || null,
            slug: m.slug || null,
          }))
        : [],
      pull: {
        tool: "get_lookalike_markets",
        event_slug: ev.slug || null,
      },
    })),
    ...profiles.map((p) => ({
      venue: "polymarket",
      entity: "profile",
      title: p.name || p.pseudonym || "",
      proxy_wallet: p.proxyWallet || p.proxy_wallet || null,
      pseudonym: p.pseudonym || null,
    })),
  ];

  return orderProfileSuggestions(mapped, q, limit);
}

export async function getMostActivePolymarketMarkets({ limit = 15, closed = false } = {}) {
  const params = new URLSearchParams({
    limit: String(Math.min(50, Math.max(1, limit))),
    active: "true",
    closed: closed ? "true" : "false",
    order: "volume24hr",
    ascending: "false",
  });
  const body = await fetchJson(`${GAMMA_BASE}/markets?${params}`);
  const markets = Array.isArray(body) ? body : [];
  return markets.map(mapMarket).map((row, index) => ({
    rank: index + 1,
    ...row,
    pull: row.condition_id
      ? { tool: "pull_market_bundle", condition_id: row.condition_id, slug: row.slug, title: row.title }
      : null,
  }));
}

export async function getPolymarketMarketByCondition(conditionId) {
  const condition = String(conditionId || "").trim();
  if (!condition) throw new Error("condition_id required");
  const body = await fetchJson(`${GAMMA_BASE}/markets?condition_ids=${encodeURIComponent(condition)}&limit=5`);
  const markets = Array.isArray(body) ? body : [];
  if (!markets.length) {
    throw new Error(`No Polymarket market found for condition_id ${condition}`);
  }
  return mapMarket(markets[0]);
}

export async function getLookalikeMarkets({ conditionId = "", eventSlug = "", limit = 12 } = {}) {
  let event = null;
  if (eventSlug) {
    event = await fetchJson(`${GAMMA_BASE}/events/slug/${encodeURIComponent(eventSlug)}`);
  } else if (conditionId) {
    const market = await getPolymarketMarketByCondition(conditionId);
    const slug = market.event_slug;
    if (!slug) {
      return {
        seed: market,
        lookalikes: [],
        note: "Market has no parent event slug; search by title for relatives.",
      };
    }
    event = await fetchJson(`${GAMMA_BASE}/events/slug/${encodeURIComponent(slug)}`);
  } else {
    throw new Error("Provide condition_id or event_slug");
  }

  const markets = Array.isArray(event?.markets) ? event.markets : [];
  const lookalikes = markets.slice(0, limit).map(mapMarket);
  return {
    event: {
      id: String(event?.id || ""),
      slug: event?.slug || null,
      title: event?.title || "",
      volume: event?.volume ?? null,
    },
    lookalikes,
    note: "Same event, different settlement windows / related contracts — compare prices and holders across deadlines.",
  };
}

export async function getPolymarketHolders(conditionId, { limit = 50, includePnl = false } = {}) {
  const condition = String(conditionId || "").trim();
  if (!condition) throw new Error("condition_id required");
  const params = new URLSearchParams();
  params.set("condition", condition);
  params.set("limit", String(Math.min(includePnl ? 100 : 500, Math.max(1, limit))));
  if (includePnl) params.set("include_pnl", "true");
  const body = await fetchJson(`${DATA_API_BASE}/v2/holders?${params}`);
  const rows = flattenPolymarketHoldersV2(body, { conditionId: condition });
  if (!rows.length) {
    throw new Error(
      `Lychee holders pull returned 0 wallets for ${condition}. Check the condition_id (0x…) from search_markets / get_most_active_markets — do not scrape Polymarket HTML.`,
    );
  }
  const yes = rows.filter((r) => r.outcome === "YES" || r.outcome_index === 0);
  const no = rows.filter((r) => r.outcome === "NO" || r.outcome_index === 1);
  return {
    condition_id: condition,
    source: "lychee:polymarket-data-api-v2/holders",
    count: rows.length,
    yes_count: yes.length,
    no_count: no.length,
    rows,
    preview: rows.slice(0, Math.min(40, limit)),
    next: {
      compose: "add_sheet_with_chart",
      sheet_kind: "holders",
      analyze: "analyze_holders",
    },
  };
}

export async function getPolymarketTradesPreview(conditionId, { limit = 50 } = {}) {
  const condition = String(conditionId || "").trim();
  if (!condition) throw new Error("condition_id required");
  const params = new URLSearchParams();
  params.set("condition", condition);
  params.set("limit", String(Math.min(500, Math.max(1, limit))));
  const body = await fetchJson(`${DATA_API_BASE}/v2/trades?${params}`);
  const rowsRaw = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
  const rows = rowsRaw.map((row) => ({
    condition_id: condition,
    side: row.side || null,
    price: row.price != null ? Number(row.price) : null,
    size: row.size != null ? Number(row.size) : row.amount != null ? Number(row.amount) : null,
    timestamp: row.timestamp || row.createdAt || row.time || null,
    proxy_wallet: row.proxyWallet || row.proxy_wallet || row.user || null,
    outcome: row.outcome || null,
  }));
  if (!rows.length) {
    throw new Error(
      `Lychee trades pull returned 0 rows for ${condition}. Verify condition_id; do not scrape Polymarket as a fallback.`,
    );
  }
  const prices = rows.map((r) => r.price).filter((n) => Number.isFinite(n));
  const sizes = rows.map((r) => r.size).filter((n) => Number.isFinite(n));
  const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
  const vol = sizes.length ? sizes.reduce((a, b) => a + b, 0) : null;
  return {
    condition_id: condition,
    source: "lychee:polymarket-data-api-v2/trades",
    trade_count: rows.length,
    avg_price: avg,
    size_sum: vol,
    rows,
    preview: rows.slice(0, Math.min(40, limit)),
    next: {
      compose: "add_sheet_with_chart",
      sheet_kind: "trades",
      analyze: "analyze_tape",
    },
  };
}

export async function estimatePullSize({ venue, query, rowsRequested = 5000 }) {
  const rows = Math.max(1, Math.min(500_000, Number(rowsRequested) || 5000));
  return {
    venue: venue || "unknown",
    query: query || "",
    estimated_rows: rows,
    recommendation:
      rows > 500
        ? "Prefer pull_market_bundle (holders+trades+charts) first; full lake materialize only if the user insists."
        : "Sample size looks reasonable for a first pass.",
  };
}

export function catalogCapabilities() {
  return {
    role: "Lychee MCP is a research partner: pull source-of-truth prediction-market data, compose Lychee sheets/charts, analyze, then publish shareable research.",
    rule: "Never scrape Polymarket/Kalshi HTML when a Lychee tool exists. If a Lychee pull errors, report the error and retry with a corrected condition_id/ticker.",
    ids: {
      polymarket_market_key: "condition_id (0x…)",
      kalshi_market_key: "ticker",
    },
    tools: [
      { name: "list_capabilities", stage: "orient", purpose: "What you can pull and how pieces compose" },
      { name: "get_most_active_markets", stage: "orient", purpose: "Rank Polymarket by 24h volume" },
      { name: "search_markets", stage: "orient", purpose: "Search Kalshi + Polymarket; returns pull hints" },
      { name: "get_lookalike_markets", stage: "orient", purpose: "Related deadlines / same-event contracts" },
      { name: "preview_holders", stage: "sample", purpose: "Flattened holder wallets for a condition_id" },
      { name: "preview_market_activity", stage: "sample", purpose: "Recent trades for a condition_id" },
      { name: "pull_market_bundle", stage: "ingest+compose", purpose: "Holders+trades → Lychee sheets+charts in one project" },
      { name: "analyze_holders", stage: "analyze", purpose: "Concentration, imbalance, risk notes, trade hypotheses" },
      { name: "analyze_tape", stage: "analyze", purpose: "Tape stats + inference" },
      { name: "add_sheet_with_chart", stage: "compose", purpose: "Add a Lychee sheet + auto chart from rows" },
      { name: "add_insight_blocks", stage: "compose", purpose: "Narrative conclusion tiles" },
      { name: "publish_project", stage: "publish", purpose: "Shareable Lychee URL" },
    ],
  };
}
