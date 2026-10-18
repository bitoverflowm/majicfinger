/**
 * Which pull endpoints qualify for a realtime loop.
 *
 * Preview stays a one-shot snapshot. The dashboard reads `enabled` to decide
 * whether a sheet can be started and stopped as a live feed.
 *
 * `enabled` is true only when the legacy app already runs that loop:
 * - `api_poll` — each tick hits a Next API route (Kalshi). The public chart
 *   server tick uses the same routes.
 * - `client_websocket` — the browser opens the vendor socket. Our API is not
 *   on the live path. Polymarket still seeds the first rows through
 *   `/api/integrations/polymarket`.
 *
 * Snapshot endpoints are listed with `enabled: false` so a lookup is a
 * definite no, not a missing key.
 */

import { KALSHI_LIVE_CONNECT_ENDPOINTS } from "@/config/kalshiLiveConnect";
import { POLYMARKET_LIVE_CONNECT_ENDPOINTS } from "@/config/polymarketLiveConnect";
import { BINANCE_LIVE_SOURCES } from "@/lib/connectQueryComposeConfig";
import { CHAINLINK_FEEDS, CHAINLINK_LIVE_SOURCES } from "@/lib/chainlinkFeeds";
import { LIVE_FEED_REGISTRY } from "@/lib/liveFeeds/registry";
import { POLYMARKET_REALTIME_FEED_OPTIONS } from "@/lib/polymarketLive/polymarketRealtimeCompose";

/** @typedef {"rest_poll" | "websocket"} RealtimeTransport */
/** @typedef {"api_poll" | "client_websocket"} RealtimeLivePath */

/**
 * @typedef {object} RealtimeEndpointDef
 * @property {string} integration  Canonical id: kalshi-live | polymarket | chainlink | binance
 * @property {string} endpoint
 * @property {string} title
 * @property {RealtimeTransport | null} transport
 * @property {boolean} enabled
 * @property {RealtimeLivePath | null} livePath
 * @property {string | null} [apiRoute]  Next route used for each poll, or for the Polymarket seed
 * @property {string | null} [seedQuery]  Polymarket API `query` used to seed the sheet before the socket
 * @property {string | null} [socketUrl]
 * @property {string | null} [topic]
 * @property {string[]} [symbols]  Chainlink / Binance pairs. Lookups by symbol resolve to `prices`.
 * @property {string | null} [note]
 */

const POLYMARKET_CLOB_WS_URL = "wss://ws-subscriptions-clob.polymarket.com/ws/market";
const RTDS_WS_URL = "wss://ws-live-data.polymarket.com";

/** Connect-home ids and provenance ids that mean the same integration. */
const INTEGRATION_ALIASES = {
  "kalshi-live": "kalshi-live",
  kalshilive: "kalshi-live",
  polymarket: "polymarket",
  "polymarket-live": "polymarket",
  polymarketlive: "polymarket",
  chainlink: "chainlink",
  binance: "binance",
};

/** Kalshi poll routes the editor loop and the public chart tick both use. */
const KALSHI_POLL_API_ROUTES = {
  event_candlesticks: "/api/integrations/kalshi-live/events/candlesticks",
  candlesticks: "/api/integrations/kalshi-live/markets/candlesticks",
  trades: "/api/integrations/kalshi-live/markets/trades",
  orderbook: "/api/integrations/kalshi-live/markets/orderbook",
};

/**
 * Polymarket market-channel feeds the connect live session actually starts.
 * Playground query names are aliases of the same socket.
 * `new_market` and `market_resolved` stay off: the session never subscribes
 * with `custom_feature_enabled` for those events.
 *
 * @type {Record<string, { aliases: string[]; seedQuery: string | null; note?: string }>}
 */
const POLYMARKET_SOCKET_FEEDS = {
  book: {
    aliases: ["wsOrderbookSnapshot", "getOrderbooks"],
    seedQuery: "getOrderBooks",
  },
  price_change: {
    aliases: ["wsPrice", "getBatchPricesHistory"],
    seedQuery: "getBatchPricesHistory",
  },
  last_trade_price: {
    aliases: ["wsLastTradePrice", "getLastTradePrices", "getTradesByMarket"],
    seedQuery: "getBatchPricesHistory",
  },
  candlesticks: {
    aliases: [],
    seedQuery: "getBatchPricesHistory",
    note: "Client aggregates last-trade and price-change events into OHLC. There is no candle socket.",
  },
  tick_size_change: {
    aliases: ["wsTickSizeChange"],
    seedQuery: "getOrderBooks",
  },
  best_bid_ask: {
    aliases: ["wsBestBidAsk", "getMarketPrices", "getMidpointPrices", "getSpreads"],
    seedQuery: "getOrderBooks",
    note: "Subscribe sets custom_feature_enabled so the market channel emits best_bid_ask.",
  },
};

/** @type {Map<string, RealtimeEndpointDef>} */
const byCanonicalKey = new Map();
/** @type {Map<string, string>} lookup key → canonical key */
const aliasToCanonical = new Map();

/**
 * @param {string} integration
 * @returns {string}
 */
export function canonicalRealtimeIntegration(integration) {
  const raw = String(integration || "").trim();
  const key = raw.toLowerCase().replace(/_/g, "-");
  return INTEGRATION_ALIASES[key] || raw;
}

/**
 * @param {string} integration
 * @param {string} endpoint
 * @returns {string}
 */
export function realtimeRegistryKey(integration, endpoint) {
  return `${canonicalRealtimeIntegration(integration)}:${String(endpoint || "").trim()}`;
}

/**
 * @param {RealtimeEndpointDef} def
 * @param {string[]} [aliases]
 */
function registerEndpoint(def, aliases = []) {
  const key = realtimeRegistryKey(def.integration, def.endpoint);
  byCanonicalKey.set(key, def);
  aliasToCanonical.set(key, key);
  for (const alias of aliases) {
    const name = String(alias || "").trim();
    if (!name || name === def.endpoint) continue;
    aliasToCanonical.set(realtimeRegistryKey(def.integration, name), key);
  }
}

function registerKalshi() {
  /** @type {Set<string>} */
  const enabled = new Set();
  for (const def of Object.values(LIVE_FEED_REGISTRY || {})) {
    if (String(def?.integration || "") !== "kalshi-live") continue;
    const endpoint = String(def?.endpoint || "").trim();
    if (endpoint) enabled.add(endpoint);
  }

  /** @type {Set<string>} */
  const seen = new Set();
  for (const ep of KALSHI_LIVE_CONNECT_ENDPOINTS) {
    const endpoint = String(ep?.id || "").trim();
    if (!endpoint) continue;
    seen.add(endpoint);
    const on = enabled.has(endpoint);
    registerEndpoint({
      integration: "kalshi-live",
      endpoint,
      title: String(ep.title || endpoint),
      transport: on ? "rest_poll" : null,
      enabled: on,
      livePath: on ? "api_poll" : null,
      apiRoute: on ? KALSHI_POLL_API_ROUTES[endpoint] || null : null,
    });
  }

  for (const endpoint of enabled) {
    if (seen.has(endpoint)) continue;
    registerEndpoint({
      integration: "kalshi-live",
      endpoint,
      title: endpoint,
      transport: "rest_poll",
      enabled: true,
      livePath: "api_poll",
      apiRoute: KALSHI_POLL_API_ROUTES[endpoint] || null,
    });
  }
}

function registerPolymarket() {
  for (const ep of POLYMARKET_LIVE_CONNECT_ENDPOINTS) {
    if (ep?.hidden || ep?.wsType) continue;
    const endpoint = String(ep?.id || "").trim();
    if (!endpoint) continue;
    registerEndpoint({
      integration: "polymarket",
      endpoint,
      title: String(ep.title || endpoint),
      transport: null,
      enabled: false,
      livePath: null,
      note: "Snapshot pull. No poll loop and no socket.",
    });
  }

  for (const option of POLYMARKET_REALTIME_FEED_OPTIONS) {
    const endpoint = String(option?.id || "").trim();
    if (!endpoint) continue;
    const socket = POLYMARKET_SOCKET_FEEDS[endpoint];
    registerEndpoint(
      {
        integration: "polymarket",
        endpoint,
        title: String(option.label || endpoint),
        transport: socket ? "websocket" : null,
        enabled: !!socket,
        livePath: socket ? "client_websocket" : null,
        apiRoute: socket?.seedQuery ? "/api/integrations/polymarket" : null,
        seedQuery: socket?.seedQuery || null,
        socketUrl: socket ? POLYMARKET_CLOB_WS_URL : null,
        note:
          socket?.note ||
          (socket
            ? null
            : "Listed on the live session, but no verified socket handler is registered."),
      },
      socket?.aliases || [],
    );
  }

  registerEndpoint(
    {
      integration: "polymarket",
      endpoint: "new_market",
      title: "New market",
      transport: "websocket",
      enabled: false,
      livePath: null,
      socketUrl: POLYMARKET_CLOB_WS_URL,
      note: "Playground parses the event, but the live session does not subscribe with custom_feature_enabled.",
    },
    ["wsNewMarket"],
  );
  registerEndpoint(
    {
      integration: "polymarket",
      endpoint: "market_resolved",
      title: "Market resolved",
      transport: "websocket",
      enabled: false,
      livePath: null,
      socketUrl: POLYMARKET_CLOB_WS_URL,
      note: "Playground parses the event, but the live session does not subscribe with custom_feature_enabled.",
    },
    ["wsMarketResolved"],
  );
}

/**
 * @param {"chainlink" | "binance"} integration
 * @param {string} title
 * @param {string} topic
 * @param {{ id: string; title: string }[]} sources
 * @param {{ endpoint?: string, symbolAliases?: boolean }} [options]
 */
function registerDirectPriceStream(integration, title, topic, sources, { endpoint = "prices", symbolAliases = true } = {}) {
  const symbols = sources.map((source) => String(source.id || "").trim()).filter(Boolean);
  registerEndpoint(
    {
      integration,
      endpoint,
      title,
      transport: "websocket",
      enabled: true,
      livePath: "client_websocket",
      socketUrl: RTDS_WS_URL,
      topic,
      symbols,
      note: "Browser subscribes on the Polymarket real-time data socket. There is no Lychee API on the live path.",
    },
    symbolAliases ? symbols : [],
  );
}

registerKalshi();
registerPolymarket();
for (const feed of CHAINLINK_FEEDS) {
  registerDirectPriceStream("chainlink", feed.label, feed.topic, CHAINLINK_LIVE_SOURCES, {
    endpoint: feed.id,
    symbolAliases: feed.id === "prices",
  });
}
registerDirectPriceStream("binance", "Live prices", "crypto_prices", BINANCE_LIVE_SOURCES);

/** Canonical entries only. Symbol and playground aliases resolve through the lookup helpers. */
export const REALTIME_ENDPOINT_REGISTRY = Object.fromEntries(byCanonicalKey);

/**
 * @param {string} integration
 * @param {string} endpoint
 * @returns {RealtimeEndpointDef | null}
 */
export function getRealtimeEndpoint(integration, endpoint) {
  const key = aliasToCanonical.get(realtimeRegistryKey(integration, endpoint));
  if (!key) return null;
  return byCanonicalKey.get(key) || null;
}

/**
 * @param {string} integration
 * @param {string} endpoint
 * @returns {boolean}
 */
export function isRealtimeEnabled(integration, endpoint) {
  return !!getRealtimeEndpoint(integration, endpoint)?.enabled;
}

/**
 * @param {{ integration?: string; enabled?: boolean }} [filter]
 * @returns {RealtimeEndpointDef[]}
 */
export function listRealtimeEndpoints(filter = {}) {
  const integration = filter.integration
    ? canonicalRealtimeIntegration(filter.integration)
    : null;
  return [...byCanonicalKey.values()].filter((def) => {
    if (integration && def.integration !== integration) return false;
    if (filter.enabled === true || filter.enabled === false) {
      return def.enabled === filter.enabled;
    }
    return true;
  });
}
