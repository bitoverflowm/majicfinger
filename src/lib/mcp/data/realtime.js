import { listRealtimeEndpoints, getRealtimeEndpoint } from "@/lib/realtime/endpointRegistry";
import { LIVE_FEED_REGISTRY } from "@/lib/liveFeeds/registry";
import {
  getPolymarketOrderbook,
  getPolymarketPrices,
  getPolymarketTradesPreview,
  getKalshiMarket,
} from "@/lib/mcp/data/providers";
import { kalshiLiveUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";

/**
 * Catalog of Lychee realtime / live paths agents (and bots) can use.
 * Serverless MCP cannot hold vendor websockets open; bots should poll snapshots
 * or consume published live embeds. Webhooks are next.
 */
export function catalogRealtimeFeeds() {
  const polymarket = listRealtimeEndpoints({ integration: "polymarket" }).map((row) => ({
    id: `polymarket:${row.endpoint}`,
    venue: "polymarket",
    endpoint: row.endpoint,
    transport: row.transport,
    live_path: row.livePath,
    socket_url: row.socketUrl || null,
    mcp_tool: "get_realtime_snapshot",
    bot_mode: row.livePath === "client_websocket" ? "poll_snapshot_or_browser_ws" : "poll_snapshot",
    note: row.note || "",
  }));

  const kalshi = Object.entries(LIVE_FEED_REGISTRY).map(([id, def]) => ({
    id,
    venue: "kalshi",
    endpoint: def.endpoint,
    transport: def.transport,
    poll_interval_ms: def.defaultPollIntervalMs,
    mcp_tool: "get_realtime_snapshot",
    bot_mode: "poll_snapshot",
    note: "Lychee live feeds are REST-poll in-product; MCP returns snapshots for bot loops.",
  }));

  return {
    role: "Realtime for research + bots",
    constraint:
      "MCP over Streamable HTTP cannot keep a vendor websocket open for you. For trading bots: poll get_realtime_snapshot on an interval, or open the vendor socket yourself using the socket_url we return. Lychee charts/embeds stay the human UI.",
    bot_pattern: [
      "1) Call list_realtime_feeds",
      "2) Loop: get_realtime_snapshot({ feed, condition_id|ticker }) every N seconds",
      "3) Drive your bot off the snapshot JSON (never scrape HTML)",
      "4) Optional: land a research project with pull_and_compose for the human side",
      "5) Next: signed webhook / SSE push (catalogued, not live yet)",
    ],
    feeds: [...polymarket, ...kalshi],
  };
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.json();
}

/**
 * One-shot snapshot for a live feed — suitable for bot polling via MCP.
 */
export async function getRealtimeSnapshot({
  feed = "",
  condition_id = "",
  ticker = "",
  limit = 50,
} = {}) {
  const id = String(feed || "").trim().toLowerCase();
  const as_of = new Date().toISOString();

  if (id === "polymarket:trades" || id === "trades" || id === "polymarket.trades") {
    if (!condition_id) throw new Error("condition_id required for polymarket trades snapshot");
    const trades = await getPolymarketTradesPreview(condition_id, { limit });
    return {
      feed: "polymarket:trades",
      as_of,
      bot_poll_hint_ms: 5000,
      condition_id,
      rows: trades.rows.slice(0, limit),
      count: trades.trade_count,
      source: trades.source,
    };
  }

  if (id === "polymarket:orderbook" || id === "orderbook" || id === "polymarket.orderbook") {
    if (!condition_id) throw new Error("condition_id required for polymarket orderbook snapshot");
    const book = await getPolymarketOrderbook(condition_id);
    return {
      feed: "polymarket:orderbook",
      as_of,
      bot_poll_hint_ms: 2000,
      condition_id,
      rows: book.rows,
      count: book.count,
      source: book.source,
      vendor_socket: getRealtimeEndpoint("polymarket", "book")?.socketUrl || null,
    };
  }

  if (id === "polymarket:prices" || id === "prices" || id === "polymarket.prices") {
    if (!condition_id) throw new Error("condition_id required for polymarket prices snapshot");
    const prices = await getPolymarketPrices(condition_id, { limit, interval: "1h" });
    const last = prices.rows.slice(-5);
    return {
      feed: "polymarket:prices",
      as_of,
      bot_poll_hint_ms: 5000,
      condition_id,
      last_points: last,
      count: prices.count,
      source: prices.source,
      vendor_socket: getRealtimeEndpoint("polymarket", "price_change")?.socketUrl || null,
    };
  }

  if (id === "kalshi:market" || id === "kalshi.market" || id.startsWith("kalshi-live:")) {
    if (!ticker) throw new Error("ticker required for Kalshi snapshot");
    const market = await getKalshiMarket(ticker);
    let trades = null;
    if (id.includes("trades")) {
      try {
        trades = await fetchJson(
          kalshiLiveUrl(`markets/trades?ticker=${encodeURIComponent(ticker)}&limit=${Math.min(100, limit)}`),
        );
      } catch {
        trades = null;
      }
    }
    return {
      feed: id.startsWith("kalshi") ? id : "kalshi:market",
      as_of,
      bot_poll_hint_ms: 5000,
      ticker,
      market: market.market,
      trades: trades?.trades || trades || null,
      source: market.source,
    };
  }

  throw new Error(
    `Unknown feed "${feed}". Call list_realtime_feeds. Common: polymarket:trades, polymarket:orderbook, polymarket:prices, kalshi:market`,
  );
}
