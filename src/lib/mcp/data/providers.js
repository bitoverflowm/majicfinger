import { fetchKalshiLiveSearchSuggestions } from "@/lib/kalshiLive/kalshiLiveSearchSuggestions";
import { kalshiLiveSocialUrl, kalshiLiveUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";
import { orderProfileSuggestions } from "@/lib/polymarketLive/polymarketPublicSearch";
import { flattenPolymarketHoldersV2 } from "@/lib/mcp/data/holdersFlatten";
import { getFlowsCatalog, findDataset } from "@/lib/mcp/data/flowsCatalog";

export { flattenPolymarketHoldersV2 };

const GAMMA_BASE = (process.env.POLYMARKET_GAMMA_API_URL || "https://gamma-api.polymarket.com").replace(/\/$/, "");
const DATA_API_BASE = (process.env.POLYMARKET_DATA_API_URL || "https://data-api.polymarket.com").replace(/\/$/, "");
const CLOB_BASE = (process.env.POLYMARKET_CLOB_API_URL || "https://clob.polymarket.com").replace(/\/$/, "");

async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json();
}

function winnerFromPrices(outcomes, prices) {
  if (!Array.isArray(outcomes) || !Array.isArray(prices) || !outcomes.length) return null;
  let best = -1;
  let idx = -1;
  for (let i = 0; i < Math.min(outcomes.length, prices.length); i++) {
    const p = Number(prices[i]);
    if (Number.isFinite(p) && p > best) {
      best = p;
      idx = i;
    }
  }
  if (idx < 0) return null;
  return { outcome: String(outcomes[idx]), outcome_index: idx, price: best };
}

function mapMarket(m) {
  const outcomes = typeof m.outcomes === "string" ? safeJson(m.outcomes) : m.outcomes || null;
  const outcome_prices = typeof m.outcomePrices === "string" ? safeJson(m.outcomePrices) : m.outcomePrices || null;
  const closed = m.closed === true || m.closed === "true";
  const winner = closed ? winnerFromPrices(outcomes, outcome_prices) : null;
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
    closed,
    outcomes,
    outcome_prices,
    winner: winner?.outcome || null,
    winner_index: winner?.outcome_index ?? null,
    yes_won: winner ? winner.outcome_index === 0 : null,
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

/** `allTokens` keeps only markets whose titles contain every query word. */
export async function searchKalshi(query, { limit = 12, allTokens = false } = {}) {
  const q = String(query || "").trim();
  if (q.length < 2) return [];
  const { suggestions } = await fetchKalshiLiveSearchSuggestions(q, {
    limit: Math.min(40, Math.max(1, limit)),
    allTokens,
  });
  return (suggestions || []).slice(0, limit).map((item) => ({
    venue: "kalshi",
    entity: "market",
    ticker: item.ticker,
    title: item.title,
    outcome_label: item.outcomeLabel || null,
    yes_price: item.yesPrice ?? null,
    volume_24h: item.volume24h ?? null,
    event_ticker: item.eventTicker || null,
    status: item.status || null,
    close_time: item.closeTime || null,
    pull: {
      tool: "preview_kalshi_market",
      ticker: item.ticker,
    },
  }));
}

/**
 * Kalshi's own site search (undocumented v1), ranked by query match. Returns open events
 * with their outcome markets and prices; the trade API has no text search.
 */
export async function searchKalshiEvents(query, { limit = 6 } = {}) {
  const q = String(query || "").trim();
  if (q.length < 2) return [];
  const params = new URLSearchParams({ query: q, order_by: "querymatch", page_size: String(Math.min(20, limit)) });
  const body = await fetchJson(`${kalshiLiveSocialUrl("search/series")}?${params}`);
  const price = (m) => {
    const last = Number(m.last_price_dollars);
    if (Number.isFinite(last) && last > 0) return last;
    const bid = Number(m.yes_bid_dollars);
    const ask = Number(m.yes_ask_dollars);
    return Number.isFinite(bid) && Number.isFinite(ask) && ask > 0 ? (bid + ask) / 2 : null;
  };
  const dayChange = (m) => {
    const last = Number(m.last_price_dollars);
    const prev = Number(m.previous_price_dollars);
    return Number.isFinite(last) && Number.isFinite(prev) && prev > 0 ? last - prev : null;
  };
  return (Array.isArray(body?.current_page) ? body.current_page : [])
    .filter((e) => e.event_ticker && Array.isArray(e.markets) && e.markets.length)
    .slice(0, limit)
    .map((e) => ({
      venue: "kalshi",
      entity: "event",
      title: e.event_title || e.series_title || "",
      event_ticker: e.event_ticker,
      ticker: e.markets[0].ticker,
      markets: e.markets.slice(0, 12).map((m) => ({
        title: m.title || m.yes_subtitle || "",
        outcome_label: m.yes_subtitle || null,
        ticker: m.ticker,
        yes_price: price(m),
        price_change_24h: dayChange(m),
        closed: Boolean(m.result),
      })),
      pull: { tool: "preview_kalshi_market", ticker: e.markets[0].ticker },
    }));
}

function looksLikeHottestQuery(query) {
  const q = String(query || "").toLowerCase();
  return (
    /\b(hottest|most active|top volume|highest volume|what's hot|whats hot|trending)\b/.test(q) ||
    q === "hot" ||
    q === "active"
  );
}

/** `activeOnly` drops closed events (e.g. last year's "Fed decision in December?"). */
export async function searchPolymarket(query, { limit = 12, activeOnly = false } = {}) {
  const q = String(query || "").trim();
  if (q.length < 2) return [];

  // Agents often search "hottest" instead of calling get_most_active_markets — fulfill either way.
  if (looksLikeHottestQuery(q)) {
    const active = await getMostActivePolymarketMarkets({ limit });
    return active.map((row) => ({
      ...row,
      matched_via: "get_most_active_markets",
      note: "Query looked like a volume ranking — used Lychee 24h active markets, not keyword search.",
    }));
  }

  const url =
    `${GAMMA_BASE}/public-search?q=${encodeURIComponent(q)}&limit_per_type=${Math.min(20, limit)}` +
    (activeOnly ? "&events_status=active&keep_closed_markets=0" : "");
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
      volume_24h: Number(ev.volume24hr) || null,
      closed: ev.closed === true,
      end_date: ev.endDate || null,
      condition_id: Array.isArray(ev.markets) ? ev.markets[0]?.conditionId || null : null,
      markets: Array.isArray(ev.markets)
        ? ev.markets.slice(0, 12).map((m) => {
            const prices = typeof m.outcomePrices === "string" ? safeJson(m.outcomePrices) : m.outcomePrices;
            return {
              title: m.question || m.groupItemTitle || "",
              outcome_label: m.groupItemTitle || null,
              condition_id: m.conditionId || null,
              slug: m.slug || null,
              yes_price: Array.isArray(prices) && Number.isFinite(Number(prices[0])) ? Number(prices[0]) : null,
              price_change_24h: Number.isFinite(Number(m.oneDayPriceChange)) ? Number(m.oneDayPriceChange) : null,
              volume_24h: Number(m.volume24hr) || null,
              closed: m.closed === true,
            };
          })
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
    active: closed ? "false" : "true",
    closed: closed ? "true" : "false",
    order: closed ? "endDate" : "volume24hr",
    ascending: "false",
  });
  const body = await fetchJson(`${GAMMA_BASE}/markets?${params}`);
  const markets = Array.isArray(body) ? body : [];
  return markets.map(mapMarket).map((row, index) => ({
    rank: index + 1,
    ...row,
    pull: row.condition_id
      ? {
          tool: closed ? "preview_prices" : "pull_market_bundle",
          condition_id: row.condition_id,
          slug: row.slug,
          title: row.title,
          next_analyze: closed ? "analyze_calibration" : "analyze_holders",
        }
      : null,
  }));
}

/**
 * Closed / settled Polymarket markets for calibration-style research.
 * Returns winner from outcome prices when available.
 */
export async function searchClosedPolymarketMarkets(query, { limit = 20 } = {}) {
  const q = String(query || "").trim();
  const needle = q.toLowerCase();
  const pageSize = 50;
  const params = new URLSearchParams({
    limit: String(pageSize),
    closed: "true",
    active: "false",
    order: "endDate",
    ascending: "false",
  });
  const body = await fetchJson(`${GAMMA_BASE}/markets?${params}`);
  let markets = (Array.isArray(body) ? body : []).map(mapMarket);

  // Prefer public-search hits that are closed, then merge recent closed list.
  if (q.length >= 2) {
    try {
      const search = await fetchJson(
        `${GAMMA_BASE}/public-search?q=${encodeURIComponent(q)}&limit_per_type=20&keep_closed_markets=1`,
      );
      const fromSearch = [];
      for (const m of Array.isArray(search?.markets) ? search.markets : []) {
        fromSearch.push(mapMarket(m));
      }
      for (const ev of Array.isArray(search?.events) ? search.events : []) {
        for (const m of Array.isArray(ev?.markets) ? ev.markets : []) {
          fromSearch.push(mapMarket({ ...m, events: [ev] }));
        }
      }
      const closedHits = fromSearch.filter((m) => m.closed);
      if (closedHits.length) markets = [...closedHits, ...markets];
    } catch {
      /* keep recent closed list */
    }
  }

  if (needle) {
    markets = markets.filter((m) => String(m.title || "").toLowerCase().includes(needle));
  }
  const seen = new Set();
  const deduped = [];
  for (const row of markets) {
    const key = row.condition_id || row.id || row.slug;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }

  return deduped.slice(0, limit).map((row, index) => ({
    rank: index + 1,
    ...row,
    pull: row.condition_id
      ? {
          tool: "preview_prices",
          condition_id: row.condition_id,
          also: ["pull_and_compose", "analyze_calibration"],
          note: "Use last YES price before end_date as forecast; yes_won is the label.",
        }
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

export async function getPolymarketHolders(conditionId, { limit = 500, includePnl = false } = {}) {
  const condition = String(conditionId || "").trim();
  if (!condition) throw new Error("condition_id required");
  const params = new URLSearchParams();
  params.set("condition", condition);
  params.set("limit", String(Math.min(includePnl ? 500 : 2000, Math.max(1, limit))));
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
    // Full rows for analysis/charting — preview is a short glance only.
    preview: rows.slice(0, Math.min(25, limit)),
    analysis_ready: true,
    next: {
      compose: "add_sheet_with_chart",
      sheet_kind: "holders",
      analyze: "analyze_holders",
      note: "Use rows (full pull) for analyze_holders / compose — not just preview.",
    },
  };
}

export async function getPolymarketTradesPreview(conditionId, { limit = 500 } = {}) {
  const condition = String(conditionId || "").trim();
  if (!condition) throw new Error("condition_id required");
  const params = new URLSearchParams();
  params.set("condition", condition);
  params.set("limit", String(Math.min(2000, Math.max(1, limit))));
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
    preview: rows.slice(0, Math.min(25, limit)),
    analysis_ready: true,
    next: {
      compose: "add_sheet_with_chart",
      sheet_kind: "trades",
      analyze: "analyze_tape",
      note: "Use rows (full pull) for analyze_tape / compose — not just preview.",
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
      rows > 50_000
        ? "Huge Athena-style dump — use prepare_full_pull (confirm). For analysis/charts prefer pull_market_bundle with full live rows."
        : "Live analysis/chart pulls are fine at this size — only gate raw historical lake downloads.",
  };
}

function firstTokenIds(market) {
  const ids = Array.isArray(market?.clob_token_ids) ? market.clob_token_ids.map(String) : [];
  return ids.filter(Boolean);
}

export async function getPolymarketPrices(conditionId, { limit = 200, interval = "1d" } = {}) {
  const market = await getPolymarketMarketByCondition(conditionId);
  const tokenIds = firstTokenIds(market);
  if (!tokenIds.length) throw new Error(`No clob_token_ids for ${conditionId}`);
  const rows = [];
  for (const tokenId of tokenIds.slice(0, 2)) {
    const params = new URLSearchParams({
      market: tokenId,
      interval: String(interval || "1d"),
    });
    const body = await fetchJson(`${CLOB_BASE}/prices-history?${params}`);
    const history = Array.isArray(body?.history) ? body.history : Array.isArray(body) ? body : [];
    for (const point of history.slice(-Math.max(1, limit))) {
      rows.push({
        condition_id: conditionId,
        market_title: market.title,
        token_id: tokenId,
        t: point?.t ?? null,
        p: point?.p != null ? Number(point.p) : null,
      });
    }
  }
  if (!rows.length) throw new Error(`No price history for ${conditionId}`);
  return {
    market,
    source: "lychee:polymarket-clob/prices-history",
    count: rows.length,
    rows,
    preview: rows.slice(-40),
    next: { compose: "pull_and_compose", dataset: "polymarket.prices" },
  };
}

export async function getPolymarketOrderbook(conditionId) {
  const market = await getPolymarketMarketByCondition(conditionId);
  const tokenIds = firstTokenIds(market);
  if (!tokenIds.length) throw new Error(`No clob_token_ids for ${conditionId}`);
  const rows = [];
  for (let i = 0; i < Math.min(2, tokenIds.length); i++) {
    const tokenId = tokenIds[i];
    const body = await fetchJson(`${CLOB_BASE}/book?token_id=${encodeURIComponent(tokenId)}`);
    const bids = Array.isArray(body?.bids) ? body.bids : [];
    const asks = Array.isArray(body?.asks) ? body.asks : [];
    for (const level of bids.slice(0, 25)) {
      rows.push({
        condition_id: conditionId,
        market_title: market.title,
        token_id: tokenId,
        outcome: i === 0 ? "YES" : "NO",
        side: "bid",
        price: Number(level.price ?? level[0]),
        size: Number(level.size ?? level[1]),
      });
    }
    for (const level of asks.slice(0, 25)) {
      rows.push({
        condition_id: conditionId,
        market_title: market.title,
        token_id: tokenId,
        outcome: i === 0 ? "YES" : "NO",
        side: "ask",
        price: Number(level.price ?? level[0]),
        size: Number(level.size ?? level[1]),
      });
    }
  }
  if (!rows.length) throw new Error(`Empty order book for ${conditionId}`);
  return {
    market,
    source: "lychee:polymarket-clob/book",
    count: rows.length,
    rows,
    preview: rows.slice(0, 40),
    next: { compose: "pull_and_compose", dataset: "polymarket.orderbook" },
  };
}

export async function getPolymarketOpenInterest(conditionId) {
  const condition = String(conditionId || "").trim();
  if (!condition) throw new Error("condition_id required");
  const body = await fetchJson(`${DATA_API_BASE}/v2/oi?condition=${encodeURIComponent(condition)}`);
  const rowsRaw = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : body ? [body] : [];
  const rows = rowsRaw.map((row) => ({
    condition_id: String(row.condition_id || row.conditionId || condition),
    value: row.value != null ? Number(row.value) : row.oi != null ? Number(row.oi) : null,
    timestamp: row.timestamp || row.t || null,
  }));
  if (!rows.length) throw new Error(`No open interest for ${condition}`);
  return {
    condition_id: condition,
    source: "lychee:polymarket-data-api-v2/oi",
    rows,
    preview: rows.slice(0, 40),
    next: { compose: "pull_and_compose", dataset: "polymarket.open_interest" },
  };
}

async function fetchTraderJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  const text = await res.text().catch(() => "");
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = null;
  }
  if (!res.ok) {
    const msg =
      body?.error ||
      body?.message ||
      text ||
      `Request failed (${res.status})`;
    const err = new Error(String(msg));
    err.status = res.status;
    err.code = body?.code || null;
    throw err;
  }
  return body;
}

export async function getPolymarketTrader(wallet, { limit = 50, includeClosed = false } = {}) {
  const { pnlSheetRows } = await import("@/lib/polymarketLive/traderPnlCompose");
  const { positionSheetRow } = await import("@/lib/polymarketLive/traderPositionsCompose");
  const { activitySheetRow } = await import("@/lib/polymarketLive/traderActivityCompose");

  const user = String(wallet || "").trim();
  if (!/^0x[a-fA-F0-9]{40}$/.test(user)) throw new Error("proxy_wallet must be 0x…40 hex");

  const lim = Math.min(200, Math.max(10, limit));
  const closedLim = Math.min(200, Math.max(10, limit));
  const settled = await Promise.allSettled([
    fetchTraderJson(`${DATA_API_BASE}/v2/positions?user=${encodeURIComponent(user)}&limit=${lim}`),
    fetchTraderJson(`${DATA_API_BASE}/v2/activity?user=${encodeURIComponent(user)}&limit=${lim}`),
    fetchTraderJson(
      `${DATA_API_BASE}/v2/user-pnl?user=${encodeURIComponent(user)}&interval=max&fidelity=1d`,
    ),
    fetchTraderJson(`${DATA_API_BASE}/v2/value?user=${encodeURIComponent(user)}`),
    includeClosed
      ? fetchTraderJson(
          `${DATA_API_BASE}/v2/positions?user=${encodeURIComponent(user)}&status=closed&limit=${closedLim}&sort_by=TIMESTAMP&sort_direction=DESC`,
        )
      : Promise.resolve(null),
  ]);

  const [positionsRes, activityRes, pnlRes, valueRes, closedRes] = settled;
  const hardFail = [positionsRes, activityRes].find(
    (r) => r.status === "rejected" && /protocol contract|invalid_request/i.test(r.reason?.message || ""),
  );
  if (hardFail) {
    throw new Error(
      `${hardFail.reason.message} — this holder address is not a tradeable proxy wallet. Pick another holder from preview_holders, or search profiles for the real proxy_wallet. Do not open Lychee magic-link login.`,
    );
  }

  const asRows = (res) =>
    res?.status === "fulfilled"
      ? Array.isArray(res.value?.data)
        ? res.value.data
        : Array.isArray(res.value)
          ? res.value
          : []
      : [];

  const positionsRaw = asRows(positionsRes);
  const activityRaw = asRows(activityRes);
  const closedRaw = includeClosed ? asRows(closedRes) : [];

  const positions = positionsRaw
    .filter((row) => row && typeof row === "object")
    .map((row) => positionSheetRow(row, user));
  const closed_positions = closedRaw
    .filter((row) => row && typeof row === "object")
    .map((row) => positionSheetRow(row, user));
  const activity = activityRaw
    .filter((row) => row && typeof row === "object")
    .map((row) => activitySheetRow(row, user));
  const pnl =
    pnlRes.status === "fulfilled" ? pnlSheetRows(pnlRes.value, user) : [];
  const valueBody = valueRes.status === "fulfilled" ? valueRes.value : null;

  if (!positions.length && !activity.length && !pnl.length && !closed_positions.length) {
    const detail =
      positionsRes.status === "rejected"
        ? positionsRes.reason?.message
        : activityRes.status === "rejected"
          ? activityRes.reason?.message
          : "empty positions + activity";
    throw new Error(
      `No trader data for ${user} (${detail}). Use a real proxy_wallet from holders/activity; do not scrape or magic-link login.`,
    );
  }

  const lastPnl = pnl.length ? pnl[pnl.length - 1] : null;
  return {
    proxy_wallet: user,
    source: "lychee:polymarket-data-api-v2/trader",
    portfolio_value: valueBody,
    pnl_summary: lastPnl
      ? {
          economic_pnl: lastPnl.economic_pnl ?? null,
          realized_pnl: lastPnl.realized_pnl ?? null,
          unrealized_pnl: lastPnl.unrealized_pnl ?? null,
          points: pnl.length,
        }
      : null,
    positions,
    closed_positions,
    activity,
    pnl,
    preview: {
      positions: positions.slice(0, 20),
      closed_positions: closed_positions.slice(0, 20),
      activity: activity.slice(0, 20),
      pnl: pnl.slice(-20),
    },
    analysis_ready: true,
    note:
      "These are full wallet records (positions/activity/pnl), not metadata stubs. preferredColumns only affect sheet display. For Skill Score call get_lychee_skill_score; for theme hit-rates call analyze_trader_theme.",
    chart_hints: {
      positions: "treemap",
      closed_positions: "treemap",
      activity: "activity",
      pnl: "portfolio",
    },
    next: {
      compose: "pull_trader_bundle",
      alt_compose: "pull_and_compose",
      datasets: ["polymarket.trader_positions", "polymarket.trader_activity", "polymarket.trader_pnl"],
      analyze: ["get_lychee_skill_score", "analyze_trader_theme"],
      platform: "explain_lychee_platform",
      note: "Use exact dataset ids polymarket.trader_*. Never ask for email magic-link. Never substitute lesson snapshots for a failed pull.",
    },
  };
}

export async function getKalshiMarket(ticker) {
  const t = String(ticker || "").trim();
  if (!t) throw new Error("ticker required");
  const body = await fetchJson(kalshiLiveUrl(`markets/${encodeURIComponent(t)}`));
  const market = body?.market;
  if (!market || typeof market !== "object") throw new Error(`No Kalshi market for ticker ${t}`);
  const row = {
    venue: "kalshi",
    ticker: market.ticker || t,
    title: market.title || market.subtitle || "",
    status: market.status || null,
    yes_bid: market.yes_bid != null ? Number(market.yes_bid) : null,
    yes_ask: market.yes_ask != null ? Number(market.yes_ask) : null,
    no_bid: market.no_bid != null ? Number(market.no_bid) : null,
    no_ask: market.no_ask != null ? Number(market.no_ask) : null,
    last_price: market.last_price != null ? Number(market.last_price) : null,
    volume: market.volume != null ? Number(market.volume) : null,
    open_interest: market.open_interest != null ? Number(market.open_interest) : null,
    close_time: market.close_time || market.expected_expiration_time || null,
    event_ticker: market.event_ticker || null,
  };
  return {
    market: row,
    rows: [row],
    source: "lychee:kalshi-live/markets",
    next: { compose: "pull_and_compose", dataset: "kalshi.market" },
  };
}

/**
 * Resolve a dataset id into rows + chart metadata for compose.
 */
export async function resolveDatasetPull(datasetId, args = {}) {
  const meta = findDataset(datasetId);
  if (!meta) throw new Error(`Unknown dataset ${datasetId}. Call list_datasets.`);
  if (meta.status === "next") {
    throw new Error(`Dataset ${datasetId} is catalogued but not live yet. Use a live dataset or list_research_flows.`);
  }

  switch (meta.id) {
    case "polymarket.holders": {
      const holders = await getPolymarketHolders(args.condition_id, { limit: args.limit || 50 });
      return { meta, title: `Holders · ${args.condition_id}`, rows: holders.rows, preferredColumns: ["outcome", "name", "amount", "proxy_wallet"] };
    }
    case "polymarket.trades": {
      const trades = await getPolymarketTradesPreview(args.condition_id, { limit: args.limit || 50 });
      return { meta, title: `Trades · ${args.condition_id}`, rows: trades.rows, preferredColumns: ["timestamp", "side", "price", "size"] };
    }
    case "polymarket.prices": {
      const prices = await getPolymarketPrices(args.condition_id, { limit: args.limit || 200, interval: args.interval });
      return { meta, title: `${prices.market.title} · prices`, rows: prices.rows, preferredColumns: ["t", "p", "token_id"] };
    }
    case "polymarket.orderbook": {
      const book = await getPolymarketOrderbook(args.condition_id);
      return { meta, title: `${book.market.title} · book`, rows: book.rows, preferredColumns: ["outcome", "side", "price", "size"] };
    }
    case "polymarket.open_interest": {
      const oi = await getPolymarketOpenInterest(args.condition_id);
      return { meta, title: `Open interest · ${args.condition_id}`, rows: oi.rows, preferredColumns: ["value", "timestamp"] };
    }
    case "polymarket.trader_positions": {
      const trader = await getPolymarketTrader(args.proxy_wallet, { limit: args.limit || 50 });
      return {
        meta,
        title: `Positions · ${args.proxy_wallet}`,
        rows: trader.positions,
        preferredColumns: [
          "title",
          "outcome",
          "current_size",
          "current_value",
          "unrealized_pnl",
          "realized_pnl",
          "avg_price",
          "condition_id",
        ],
        chartView: "treemap",
      };
    }
    case "polymarket.trader_activity": {
      const trader = await getPolymarketTrader(args.proxy_wallet, { limit: args.limit || 50 });
      return {
        meta,
        title: `Activity · ${args.proxy_wallet}`,
        rows: trader.activity,
        preferredColumns: ["timestamp", "type", "side", "price", "size", "usdc_size", "title", "condition_id"],
        chartView: "activity",
      };
    }
    case "polymarket.trader_pnl": {
      const trader = await getPolymarketTrader(args.proxy_wallet, { limit: args.limit || 50 });
      return {
        meta,
        title: `PnL · ${args.proxy_wallet}`,
        rows: trader.pnl,
        preferredColumns: ["timestamp", "economic_pnl", "realized_pnl", "unrealized_pnl", "trade_count"],
        chartView: "portfolio",
      };
    }
    case "kalshi.market": {
      const kalshi = await getKalshiMarket(args.ticker);
      return { meta, title: `Kalshi · ${kalshi.market.ticker}`, rows: kalshi.rows, preferredColumns: ["ticker", "title", "yes_bid", "yes_ask", "volume", "open_interest"] };
    }
    case "lake.athena_polymarket_trades":
    case "lake.athena_kalshi_trades":
    case "lake.athena_markets":
      throw new Error("Athena lake dumps use prepare_full_pull (confirm + expensive). Prefer live market datasets first.");
    default:
      throw new Error(`Dataset ${meta.id} is not pullable yet (status=${meta.status}).`);
  }
}

export function catalogCapabilities() {
  const catalog = getFlowsCatalog();
  return {
    role: catalog.role,
    rule: "Never scrape Polymarket/Kalshi HTML when a Lychee tool/dataset exists. If a pull errors, fix ids — do not silently switch to outside scraping.",
    best_practices: catalog.best_practices,
    ids: catalog.ids,
    live_count: catalog.live_count,
    flows_hint: "Call list_research_flows for step-by-step paths; list_crazy_workflows to pitch ambitious sessions; list_datasets for pullable tables.",
    first_turn_hint:
      "Open-ended users: list_crazy_workflows → pitch 3 → wait for pick. Named market/wallet/theme: skip pitch and execute.",
    tools: [
      { name: "list_capabilities", stage: "orient", purpose: "Short catalog + best practices (+ action=platform)" },
      { name: "explain_lychee_platform", stage: "orient", purpose: "Attributes, filters, joins, Skill Score, news archive" },
      { name: "list_research_flows", stage: "orient", purpose: "Named composable research paths" },
      { name: "list_crazy_workflows", stage: "orient", purpose: "Ambitious workflows to pitch on first turn" },
      { name: "jarvis_on", stage: "orient", purpose: "Power-up Jarvis proactive mode (+ animation)" },
      { name: "jarvis_pulse", stage: "orient", purpose: "Unprompted interesting-market brief while Jarvis is on" },
      { name: "jarvis_research", stage: "analyze", purpose: "Fused pack (X + MCP): markets, lookalikes, whales, news, gated reply" },
      { name: "approve_pending", stage: "orient", purpose: "Approve/deny MCP confirmations when user says approve in chat" },
      { name: "list_pending_approvals", stage: "orient", purpose: "Show open confirmations" },
      { name: "list_datasets", stage: "orient", purpose: "Every dataset id + status (live/partial/next)" },
      { name: "list_realtime_feeds", stage: "orient", purpose: "Realtime/live feeds for bots + research" },
      { name: "get_most_active_markets", stage: "orient", purpose: "Rank Polymarket by 24h volume" },
      { name: "search_markets", stage: "orient", purpose: "Search Kalshi + Polymarket; pull hints (hottest → active)" },
      { name: "search_closed_markets", stage: "orient", purpose: "Settled markets with winner / yes_won" },
      { name: "get_lookalike_markets", stage: "orient", purpose: "Related deadlines / same-event contracts" },
      { name: "compare_venues", stage: "orient", purpose: "Kalshi ↔ Polymarket gap scan with pull hints" },
      { name: "preview_holders", stage: "sample", purpose: "Flattened holders" },
      { name: "preview_market_activity", stage: "sample", purpose: "Recent trades" },
      { name: "preview_prices", stage: "sample", purpose: "CLOB price history (callable — use it)" },
      { name: "preview_orderbook", stage: "sample", purpose: "CLOB book levels" },
      { name: "preview_open_interest", stage: "sample", purpose: "Open interest" },
      { name: "preview_trader", stage: "sample", purpose: "Full wallet records (open/closed/activity/PnL)" },
      { name: "pull_trader_bundle", stage: "ingest+compose", purpose: "Trader open+closed+activity+PnL → sheets+charts" },
      { name: "get_lychee_skill_score", stage: "analyze", purpose: "Lychee Skill Score −100…100 on finished positions" },
      { name: "analyze_trader_theme", stage: "analyze", purpose: "Theme hit-rate (Fed etc.) on settled markets" },
      { name: "search_news", stage: "sample", purpose: "News archive / Google / GDELT headlines for overlays" },
      { name: "preview_kalshi_market", stage: "sample", purpose: "Kalshi live market snapshot" },
      { name: "get_realtime_snapshot", stage: "sample", purpose: "Pollable live snapshot for trading bots" },
      { name: "pull_market_bundle", stage: "ingest+compose", purpose: "Prices+holders+trades → Lychee sheets+charts" },
      { name: "pull_and_compose", stage: "ingest+compose", purpose: "Any live dataset → sheet+chart" },
      { name: "run_recipe_holder_analysis", stage: "ingest+compose", purpose: "UI holder-analysis recipe cousin" },
      { name: "run_recipe_trade_history", stage: "ingest+compose", purpose: "Live trade-history recipe (Athena dump separate)" },
      { name: "analyze_holders", stage: "analyze", purpose: "Concentration, risk, trade hypotheses" },
      { name: "analyze_tape", stage: "analyze", purpose: "Tape stats + inference" },
      { name: "analyze_calibration", stage: "analyze", purpose: "Brier + reliability bands from forecast/outcome rows" },
      { name: "add_sheet_with_chart", stage: "compose", purpose: "Rows → Lychee sheet + chart" },
      { name: "add_insight_blocks", stage: "compose", purpose: "Narrative conclusions" },
      { name: "publish_project", stage: "publish", purpose: "Shareable research URL + OG image" },
    ],
  };
}
