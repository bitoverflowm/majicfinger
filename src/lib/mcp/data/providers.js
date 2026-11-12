import { fetchKalshiLiveSearchSuggestions } from "@/lib/kalshiLive/kalshiLiveSearchSuggestions";
import { orderProfileSuggestions } from "@/lib/polymarketLive/polymarketPublicSearch";

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

export async function searchKalshi(query, { limit = 12 } = {}) {
  const q = String(query || "").trim();
  if (q.length < 2) return [];
  const { suggestions } = await fetchKalshiLiveSearchSuggestions(q, {
    limit: Math.min(40, Math.max(1, limit)),
  });
  return (suggestions || []).slice(0, limit).map((item) => ({
    venue: "kalshi",
    ticker: item.ticker,
    title: item.title,
    event_ticker: item.eventTicker || null,
    status: item.status || null,
    close_time: item.closeTime || null,
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
    // Fallback: markets text search via /markets?slug_contains style isn't always available; use events.
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
      }));
  }

  const events = Array.isArray(body?.events) ? body.events : [];
  const markets = Array.isArray(body?.markets) ? body.markets : [];
  const profiles = Array.isArray(body?.profiles) ? body.profiles : [];

  const mapped = [
    ...markets.map((m) => ({
      venue: "polymarket",
      entity: "market",
      id: String(m.id || ""),
      slug: m.slug || null,
      title: m.question || m.title || "",
      condition_id: m.conditionId || m.condition_id || null,
      volume: m.volumeNum ?? m.volume ?? null,
    })),
    ...events.map((ev) => ({
      venue: "polymarket",
      entity: "event",
      id: String(ev.id || ""),
      slug: ev.slug || null,
      title: ev.title || "",
      volume: ev.volume ?? null,
      condition_id: Array.isArray(ev.markets) ? ev.markets[0]?.conditionId || null : null,
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

export async function getPolymarketHolders(conditionId, { limit = 25, includePnl = true } = {}) {
  const condition = String(conditionId || "").trim();
  if (!condition) throw new Error("condition_id required");
  const cap = includePnl ? 100 : 1000;
  const params = new URLSearchParams();
  params.set("condition", condition);
  params.set("limit", String(Math.min(cap, Math.max(1, limit))));
  if (includePnl) params.set("include_pnl", "true");
  const body = await fetchJson(`${DATA_API_BASE}/v2/holders?${params}`);
  const rows = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
  return {
    condition_id: condition,
    count: rows.length,
    preview: rows.slice(0, Math.min(25, limit)).map((row) => ({
      proxy_wallet: row.proxyWallet || row.user || row.address || null,
      name: row.name || row.pseudonym || null,
      amount: row.amount ?? row.balance ?? null,
      outcome: row.outcome || row.outcomeIndex || null,
      pnl: row.pnl ?? row.realizedPnl ?? null,
    })),
    note: "Preview only — full holder sheets belong in a Lychee project, not chat dumps.",
  };
}

export async function getPolymarketTradesPreview(conditionId, { limit = 25 } = {}) {
  const condition = String(conditionId || "").trim();
  if (!condition) throw new Error("condition_id required");
  const params = new URLSearchParams();
  params.set("condition", condition);
  params.set("limit", String(Math.min(100, Math.max(1, limit))));
  const body = await fetchJson(`${DATA_API_BASE}/v2/trades?${params}`);
  const rows = Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
  const prices = rows.map((r) => Number(r.price)).filter((n) => Number.isFinite(n));
  const sizes = rows.map((r) => Number(r.size ?? r.amount)).filter((n) => Number.isFinite(n));
  const avg = prices.length ? prices.reduce((a, b) => a + b, 0) / prices.length : null;
  const vol = sizes.length ? sizes.reduce((a, b) => a + b, 0) : null;
  return {
    condition_id: condition,
    trade_count_preview: rows.length,
    avg_price: avg,
    size_sum_preview: vol,
    preview: rows.slice(0, Math.min(25, limit)).map((row) => ({
      side: row.side || null,
      price: row.price ?? null,
      size: row.size ?? row.amount ?? null,
      timestamp: row.timestamp || row.createdAt || row.time || null,
      proxy_wallet: row.proxyWallet || row.user || null,
    })),
    starter_insight: {
      avg_price: avg,
      recent_trade_count: rows.length,
      note: rows.length
        ? "Recent tape sampled. Dig into holders or cross-venue gaps next, then compose a dashboard."
        : "No recent trades in this sample window.",
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
        ? "Start with a filtered sample and charts before materializing the full pull."
        : "Sample size looks reasonable for a first pass.",
  };
}
