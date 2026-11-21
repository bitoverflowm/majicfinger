/**
 * Live War Room activity: recent Polymarket/Kalshi trades + news headlines.
 * Kept bounded so the globe and pane stay dense without flooding the map.
 */

import { getNewsPulseFeed } from "@/lib/newsPulse";
import { kalshiLiveUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";
import {
  NEWS_ACTIVITY_CAP,
  SOURCE_TIMEOUT_MS,
  TRADE_ACTIVITY_CAP,
} from "./constants";
import { locateMarket, pointGeometry } from "./geography";
import { warRoomMarketId, warRoomSignalId } from "./ids";

const POLY_DATA_API = (
  process.env.POLYMARKET_DATA_API_URL || "https://data-api.polymarket.com"
)
  .trim()
  .replace(/\/$/, "");

function toNum(raw) {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function isoMaybe(value, fallback) {
  const n = Date.parse(String(value || ""));
  return Number.isFinite(n) ? new Date(n).toISOString() : fallback;
}

async function fetchJson(url, label) {
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(SOURCE_TIMEOUT_MS),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${label} ${res.status}`);
  return body;
}

/**
 * @param {string} observedTs
 */
async function fetchPolymarketTrades(observedTs) {
  const body = await fetchJson(
    `${POLY_DATA_API}/trades?${new URLSearchParams({ limit: String(TRADE_ACTIVITY_CAP) })}`,
    "polymarket-trades",
  );
  const rows = Array.isArray(body) ? body : Array.isArray(body?.trades) ? body.trades : [];
  /** @type {Array<Record<string, unknown>>} */
  const out = [];
  for (const row of rows) {
    const conditionId = String(row.conditionId || row.condition_id || "").trim();
    const tx = String(row.transactionHash || row.id || row.proxyWallet || "").trim();
    if (!conditionId || !tx) continue;
    const title = String(row.title || row.slug || "Polymarket trade");
    const price = toNum(row.price);
    const size = toNum(row.size);
    const notional =
      price != null && size != null ? Number((price * size).toFixed(2)) : toNum(row.usdAmount) || toNum(row.amount);
    const side = String(row.side || row.type || "").toLowerCase();
    const occurredAt = isoMaybe(row.timestamp ? Number(row.timestamp) * 1000 : row.createdAt, observedTs);
    const geo = locateMarket({ title });
    const marketId = warRoomMarketId("polymarket", conditionId);
    out.push({
      id: warRoomSignalId("fill", "polymarket", tx.slice(0, 24)),
      kind: "fill",
      source: "polymarket",
      venue: "polymarket",
      marketId,
      title,
      summary:
        notional != null
          ? `${side === "sell" ? "Sold" : "Bought"} $${Math.round(notional).toLocaleString()}${
              price != null ? ` @ ${Math.round(price * 100)}¢` : ""
            }`
          : "Polymarket trade",
      occurredAt,
      observedAt: observedTs,
      geometry: pointGeometry(geo, tx) || null,
      region: geo?.region || null,
      data: {
        notionalUsd: notional,
        price,
        size,
        side,
        outcome: row.outcome || null,
      },
    });
  }
  return out;
}

/**
 * @param {Array<Record<string, unknown>>} markets
 * @param {string} observedTs
 */
async function fetchKalshiTrades(markets, observedTs) {
  const tickers = (markets || [])
    .filter((m) => m?.venue === "kalshi" && m?.venueMarketId)
    .slice(0, 4)
    .map((m) => String(m.venueMarketId));
  if (!tickers.length) return [];

  const batches = await Promise.all(
    tickers.map(async (ticker) => {
      try {
        const body = await fetchJson(
          `${kalshiLiveUrl("markets/trades")}?${new URLSearchParams({
            ticker,
            limit: "8",
          })}`,
          `kalshi-trades-${ticker}`,
        );
        return { ticker, trades: Array.isArray(body?.trades) ? body.trades : [] };
      } catch {
        return { ticker, trades: [] };
      }
    }),
  );

  /** @type {Array<Record<string, unknown>>} */
  const out = [];
  for (const batch of batches) {
    const market = (markets || []).find((m) => String(m.venueMarketId) === batch.ticker);
    for (const row of batch.trades) {
      const tradeId = String(row.trade_id || row.id || `${batch.ticker}-${row.created_time}`).trim();
      if (!tradeId) continue;
      const price = toNum(row.yes_price_dollars ?? row.yes_price) ?? (toNum(row.yes_price) != null ? toNum(row.yes_price) / 100 : null);
      const count = toNum(row.count) ?? toNum(row.count_fp);
      const notional = price != null && count != null ? Number((price * count).toFixed(2)) : null;
      const occurredAt = isoMaybe(row.created_time, observedTs);
      const geometry = market?.geometry || pointGeometry(locateMarket({
        seriesTicker: market?.seriesTicker,
        title: market?.title,
      }), tradeId);
      out.push({
        id: warRoomSignalId("fill", "kalshi", tradeId),
        kind: "fill",
        source: "kalshi",
        venue: "kalshi",
        marketId: market?.id || warRoomMarketId("kalshi", batch.ticker),
        title: String(market?.title || batch.ticker),
        summary:
          notional != null
            ? `Traded $${Math.round(notional).toLocaleString()}${price != null ? ` @ ${Math.round(price * 100)}¢` : ""}`
            : "Kalshi trade",
        occurredAt,
        observedAt: observedTs,
        geometry: geometry || null,
        region: market?.region || null,
        data: { notionalUsd: notional, price, size: count, side: row.taker_side || null },
      });
    }
  }
  return out;
}

/**
 * @param {string} observedTs
 */
async function fetchNewsActivity(observedTs) {
  try {
    const feed = await getNewsPulseFeed();
    const items = Array.isArray(feed?.items) ? feed.items : [];
    /** @type {Array<Record<string, unknown>>} */
    const out = [];
    for (const item of items.slice(0, NEWS_ACTIVITY_CAP)) {
      const id = String(item.id || "").trim();
      const title = String(item.headline || item.title || "").trim();
      if (!id || !title) continue;
      const geo = locateMarket({ title });
      const linked = Array.isArray(item.markets) ? item.markets[0] : null;
      const venue = String(linked?.venue || "").toLowerCase();
      const polyCondition = linked?.condition_id || linked?.conditionId || null;
      const marketId =
        venue === "kalshi" && linked?.ticker
          ? warRoomMarketId("kalshi", linked.ticker)
          : venue === "polymarket" && polyCondition
            ? warRoomMarketId("polymarket", polyCondition)
            : null;
      const occurredAt = isoMaybe(item.t, observedTs);
      const snippet = String(item.snippet || item.summary || "").trim();
      out.push({
        id: warRoomSignalId("headline", "news", id),
        kind: "headline",
        source: String(item.source || "news"),
        venue: "news",
        marketId,
        title,
        summary: snippet && snippet !== title ? snippet : title,
        occurredAt,
        observedAt: observedTs,
        geometry: pointGeometry(geo, id),
        region: geo?.region || null,
        sourceUrl: item.url || null,
        data: {
          publisher: item.source || null,
          markets: item.markets || [],
          snippet: snippet && snippet !== title ? snippet : null,
        },
      });
    }
    return { items: out, status: items.length ? "ok" : "empty" };
  } catch (err) {
    return {
      items: [],
      status: "error",
      error: String(err?.message || err),
    };
  }
}

/**
 * @param {{ markets?: Array<Record<string, unknown>>; observedTs?: string }} [opts]
 */
export async function fetchWarRoomActivity(opts = {}) {
  const observedTs = opts.observedTs || new Date().toISOString();
  const markets = Array.isArray(opts.markets) ? opts.markets : [];

  const [polyR, kalshiR, newsR] = await Promise.allSettled([
    fetchPolymarketTrades(observedTs),
    fetchKalshiTrades(markets, observedTs),
    fetchNewsActivity(observedTs),
  ]);

  const trades = [
    ...(polyR.status === "fulfilled" ? polyR.value : []),
    ...(kalshiR.status === "fulfilled" ? kalshiR.value : []),
  ]
    .sort((a, b) => Date.parse(String(b.occurredAt || 0)) - Date.parse(String(a.occurredAt || 0)))
    .slice(0, TRADE_ACTIVITY_CAP);

  const news =
    newsR.status === "fulfilled"
      ? newsR.value
      : { items: [], status: "error", error: String(newsR.reason?.message || newsR.reason) };

  const activity = [...trades, ...(news.items || [])].sort(
    (a, b) => Date.parse(String(b.occurredAt || 0)) - Date.parse(String(a.occurredAt || 0)),
  );

  return {
    activity,
    freshness: {
      trades: {
        asOf: observedTs,
        status: trades.length ? "ok" : polyR.status === "rejected" && kalshiR.status === "rejected" ? "error" : "empty",
        ageMs: 0,
      },
      news: {
        asOf: observedTs,
        status: news.status || "idle",
        ageMs: 0,
        ...(news.error ? { error: news.error } : {}),
      },
    },
  };
}
