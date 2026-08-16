import {
  ENDPOINTS,
  EVENTS_RESPONSE_FIELDS,
  MARKETS_RESPONSE_FIELDS,
  PRICES_HISTORY_RESPONSE_FIELDS,
  TRADES_RESPONSE_FIELDS,
} from "@/components/integrationsView/integrationPlayground/integrations/polymarket/config";
import {
  POLYMARKET_EVENTS_COMPOSE_COLUMNS,
  POLYMARKET_EVENTS_COMPOSE_ENDPOINT_ID,
} from "@/lib/polymarketLive/eventsCompose";
import {
  POLYMARKET_MARKETS_BY_EVENTS_COMPOSE_COLUMNS,
  POLYMARKET_MARKETS_BY_EVENTS_ENDPOINT_ID,
} from "@/lib/polymarketLive/marketsByEventsCompose";
import {
  POLYMARKET_MARKETS_COMPOSE_COLUMNS,
  POLYMARKET_MARKETS_COMPOSE_ENDPOINT_ID,
} from "@/lib/polymarketLive/marketsCompose";
import {
  POLYMARKET_HOLDERS_BY_MARKETS_COMPOSE_COLUMNS,
  POLYMARKET_HOLDERS_BY_MARKETS_ENDPOINT_ID,
} from "@/lib/polymarketLive/holdersByMarketsCompose";
import {
  POLYMARKET_OPEN_INTEREST_COMPOSE_COLUMNS,
  POLYMARKET_OPEN_INTEREST_COMPOSE_ENDPOINT_ID,
} from "@/lib/polymarketLive/openInterestCompose";
import {
  POLYMARKET_LIVE_EVENT_VOLUME_COMPOSE_COLUMNS,
  POLYMARKET_LIVE_EVENT_VOLUME_ENDPOINT_ID,
} from "@/lib/polymarketLive/liveEventVolumeCompose";
import {
  POLYMARKET_SAMPLING_MARKETS_COLUMNS,
  POLYMARKET_SAMPLING_MARKETS_ENDPOINT_ID,
} from "@/lib/polymarketLive/samplingMarketsCompose";
import {
  POLYMARKET_ORDERBOOKS_COMPOSE_COLUMNS,
  POLYMARKET_ORDERBOOKS_ENDPOINT_ID,
} from "@/lib/polymarketLive/orderbooksCompose";
import {
  POLYMARKET_MARKET_PRICES_COLUMNS,
  POLYMARKET_MARKET_PRICES_ENDPOINT_ID,
} from "@/lib/polymarketLive/marketPricesCompose";
import {
  POLYMARKET_MIDPOINT_PRICES_COLUMNS,
  POLYMARKET_MIDPOINT_PRICES_ENDPOINT_ID,
} from "@/lib/polymarketLive/midpointPricesCompose";
import {
  POLYMARKET_SPREADS_COLUMNS,
  POLYMARKET_SPREADS_ENDPOINT_ID,
} from "@/lib/polymarketLive/spreadsCompose";
import {
  POLYMARKET_LAST_TRADE_PRICES_COLUMNS,
  POLYMARKET_LAST_TRADE_PRICES_ENDPOINT_ID,
} from "@/lib/polymarketLive/lastTradePricesCompose";
import {
  POLYMARKET_PRICES_HISTORY_COLUMNS,
  POLYMARKET_PRICES_HISTORY_ENDPOINT_ID,
} from "@/lib/polymarketLive/pricesHistoryCompose";
import {
  POLYMARKET_PUBLIC_PROFILES_COLUMNS,
  POLYMARKET_PUBLIC_PROFILES_ENDPOINT_ID,
} from "@/lib/polymarketLive/publicProfilesCompose";
import {
  POLYMARKET_CURRENT_POSITIONS_COLUMNS,
  POLYMARKET_CURRENT_POSITIONS_ENDPOINT_ID,
} from "@/lib/polymarketLive/currentPositionsCompose";
import {
  POLYMARKET_CLOSED_POSITIONS_COLUMNS,
  POLYMARKET_CLOSED_POSITIONS_ENDPOINT_ID,
} from "@/lib/polymarketLive/closedPositionsCompose";
import {
  POLYMARKET_USER_ACTIVITY_COLUMNS,
  POLYMARKET_USER_ACTIVITY_ENDPOINT_ID,
} from "@/lib/polymarketLive/userActivityCompose";
import {
  POLYMARKET_HOLDER_POSITION_VALUE_COLUMNS,
  POLYMARKET_HOLDER_POSITION_VALUE_ENDPOINT_ID,
} from "@/lib/polymarketLive/holderPositionValueCompose";
import {
  POLYMARKET_HOLDER_TRADES_COLUMNS,
  POLYMARKET_HOLDER_TRADES_ENDPOINT_ID,
} from "@/lib/polymarketLive/holderTradesCompose";
import {
  POLYMARKET_HOLDER_TRADED_MARKETS_COLUMNS,
  POLYMARKET_HOLDER_TRADED_MARKETS_ENDPOINT_ID,
} from "@/lib/polymarketLive/holderTradedMarketsCompose";
import {
  POLYMARKET_TRADER_LEADERBOARD_COLUMNS,
  POLYMARKET_TRADER_LEADERBOARD_ENDPOINT_ID,
} from "@/lib/polymarketLive/traderLeaderboardCompose";

/**
 * Top-level Polymarket Live endpoint groups (hub column tags).
 * Order matches Polymarket API surface: markets → orderbooks → events → series →
 * holders → leaderboard → trades → live.
 */
export const POLYMARKET_LIVE_ENDPOINT_CATEGORIES = [
  { id: "markets", label: "Markets" },
  { id: "orderbooks", label: "Orderbooks" },
  { id: "events", label: "Events" },
  { id: "series", label: "Series" },
  { id: "holders", label: "Holders" },
  { id: "leaderboard", label: "Leaderboard" },
  { id: "trades", label: "Trades" },
  { id: "live", label: "Live" },
];

export const POLYMARKET_LIVE_DEFAULT_ENDPOINT_CATEGORY = "markets";

/** Legacy granular event/market endpoints — hidden in favor of compose flows. */
const HIDDEN_EVENT_ENDPOINT_IDS = new Set([
  "listEvents",
  "getEvent",
  "getEventBySlug",
  "getEventTags",
  "listMarkets",
  "getMarket",
  "getMarketBySlug",
  "getMarketByToken",
  "getMarketTags",
  "getTopHolders",
  "getOpenInterest",
  "getLiveVolume",
  "getTradesByMarket",
  "getTradesByUser",
  "getPricesHistory",
]);

/** @type {Record<string, string>} */
const ENDPOINT_CATEGORY_BY_QUERY = {
  listMarkets: "markets",
  getMarket: "markets",
  getMarketBySlug: "markets",
  getMarketTags: "markets",
  getOpenInterest: "markets",
  getLiveVolume: "markets",
  getPricesHistory: "trades",
  listEvents: "events",
  getEvent: "events",
  getEventBySlug: "events",
  getEventTags: "events",
  [POLYMARKET_EVENTS_COMPOSE_ENDPOINT_ID]: "events",
  [POLYMARKET_MARKETS_BY_EVENTS_ENDPOINT_ID]: "markets",
  [POLYMARKET_MARKETS_COMPOSE_ENDPOINT_ID]: "markets",
  [POLYMARKET_HOLDERS_BY_MARKETS_ENDPOINT_ID]: "holders",
  [POLYMARKET_OPEN_INTEREST_COMPOSE_ENDPOINT_ID]: "markets",
  [POLYMARKET_LIVE_EVENT_VOLUME_ENDPOINT_ID]: "events",
  [POLYMARKET_SAMPLING_MARKETS_ENDPOINT_ID]: "markets",
  [POLYMARKET_ORDERBOOKS_ENDPOINT_ID]: "orderbooks",
  [POLYMARKET_MARKET_PRICES_ENDPOINT_ID]: "markets",
  [POLYMARKET_MIDPOINT_PRICES_ENDPOINT_ID]: "orderbooks",
  [POLYMARKET_SPREADS_ENDPOINT_ID]: "orderbooks",
  [POLYMARKET_LAST_TRADE_PRICES_ENDPOINT_ID]: "trades",
  [POLYMARKET_PRICES_HISTORY_ENDPOINT_ID]: "trades",
  [POLYMARKET_PUBLIC_PROFILES_ENDPOINT_ID]: "holders",
  [POLYMARKET_CURRENT_POSITIONS_ENDPOINT_ID]: "holders",
  [POLYMARKET_CLOSED_POSITIONS_ENDPOINT_ID]: "holders",
  [POLYMARKET_USER_ACTIVITY_ENDPOINT_ID]: "holders",
  [POLYMARKET_HOLDER_POSITION_VALUE_ENDPOINT_ID]: "holders",
  [POLYMARKET_HOLDER_TRADES_ENDPOINT_ID]: "holders",
  [POLYMARKET_HOLDER_TRADED_MARKETS_ENDPOINT_ID]: "holders",
  [POLYMARKET_TRADER_LEADERBOARD_ENDPOINT_ID]: "leaderboard",
  getTopHolders: "holders",
  getTradesByMarket: "holders",
  getTradesByUser: "holders",
  wsPrice: "live",
  wsLastTradePrice: "live",
  wsOrderbookSnapshot: "live",
  wsTickSizeChange: "live",
  wsBestBidAsk: "live",
  wsNewMarket: "live",
  wsMarketResolved: "live",
};

/**
 * Placeholder endpoints for API areas not yet wired into Connect home pulls.
 * @type {Array<{ id: string; category: string; title: string; description: string; underConstruction: true }>}
 */
const PLACEHOLDER_ENDPOINTS = [
  {
    id: "listSeries",
    category: "series",
    title: "List series",
    description: "List series (grouped events) with optional filters.",
    underConstruction: true,
  },
  {
    id: "getSeries",
    category: "series",
    title: "Get series by ID",
    description: "Fetch a single series by ID, including nested events.",
    underConstruction: true,
  },
];

/**
 * Connect home — Polymarket Live endpoints (HTTP + live WebSocket, plus coming-soon stubs).
 * @type {Array<{
 *   id: string;
 *   category: string;
 *   title: string;
 *   description: string;
 *   underConstruction?: boolean;
 *   broken?: boolean;
 *   wsType?: boolean;
 * }>}
 */
export const POLYMARKET_LIVE_CONNECT_ENDPOINTS = [
  {
    id: POLYMARKET_MARKETS_COMPOSE_ENDPOINT_ID,
    category: "markets",
    title: "Get Market/Markets",
    description:
      "Discover market(s) with natural language, id, slug, or token — or list markets by volume, tag, dates, and other filters.",
  },
  {
    id: POLYMARKET_SAMPLING_MARKETS_ENDPOINT_ID,
    category: "markets",
    title: "Get all current tradable markets",
    description: "Feed of currently open and tradable markets.",
  },
  {
    id: POLYMARKET_ORDERBOOKS_ENDPOINT_ID,
    category: "orderbooks",
    title: "Orderbook(s)",
    description:
      "Discover market(s), then pull CLOB orderbooks — Buy, Sell, or both — with one sheet per market (optional metadata sheet first).",
  },
  {
    id: POLYMARKET_MARKET_PRICES_ENDPOINT_ID,
    category: "markets",
    title: "Market Price",
    description:
      "Discover one or many markets, then return one row per market with BUY and SELL prices in a single sheet.",
  },
  {
    id: POLYMARKET_MIDPOINT_PRICES_ENDPOINT_ID,
    category: "orderbooks",
    title: "Midpoint Prices",
    description:
      "Discover one or many markets, then return one midpoint-price row per market in a single sheet.",
  },
  {
    id: POLYMARKET_SPREADS_ENDPOINT_ID,
    category: "orderbooks",
    title: "Spreads",
    description:
      "Spread is the difference between the best ask and best bid prices for a given market",
  },
  {
    id: POLYMARKET_LAST_TRADE_PRICES_ENDPOINT_ID,
    category: "trades",
    title: "Last Trade Prices",
    description:
      "Last trade price and side for a specific Market outcome",
  },
  {
    id: POLYMARKET_PRICES_HISTORY_ENDPOINT_ID,
    category: "trades",
    title: "Trade History",
    description: "Get trade history by markets aka Price history",
  },
  {
    id: POLYMARKET_MARKETS_BY_EVENTS_ENDPOINT_ID,
    category: "markets",
    title: "Get markets by event(s)",
    description:
      "Find event(s), then extract their markets — all in one sheet, with event details, or one sheet per event.",
  },
  {
    id: POLYMARKET_EVENTS_COMPOSE_ENDPOINT_ID,
    category: "events",
    title: "Get Event/Events",
    description:
      "Discover event(s), search with natural language, id, slug, or list events that match your criteria by volume, tag, status, etc.",
  },
  {
    id: POLYMARKET_LIVE_EVENT_VOLUME_ENDPOINT_ID,
    category: "events",
    title: "Get live volume for event",
    description:
      "Find event(s), then pull live volume and per-market volume — one sheet, per event, or with event metadata first.",
  },
  {
    id: POLYMARKET_HOLDERS_BY_MARKETS_ENDPOINT_ID,
    category: "holders",
    title: "Get holders by market(s)",
    description:
      "Pick one or more markets, then pull top holders — with limit and min balance filters.",
  },
  {
    id: POLYMARKET_PUBLIC_PROFILES_ENDPOINT_ID,
    category: "holders",
    title: "Get public profile(s)",
    description:
      "Get public profiles directly by proxy wallet or user address — no market discovery required.",
  },
  {
    id: POLYMARKET_CURRENT_POSITIONS_ENDPOINT_ID,
    category: "holders",
    title: "Current Holder Positions",
    description:
      "Get current positions for one or more holder addresses, optionally filtered by markets, events, size, status, or title.",
  },
  {
    id: POLYMARKET_CLOSED_POSITIONS_ENDPOINT_ID,
    category: "holders",
    title: "Holder's Closed Positions",
    description:
      "Get closed positions for one or more holder addresses, optionally filtered by markets, events, or title.",
  },
  {
    id: POLYMARKET_USER_ACTIVITY_ENDPOINT_ID,
    category: "holders",
    title: "User Activity",
    description:
      "Get activity for one or more user addresses, filtered by markets, events, activity types, dates, or trade side.",
  },
  {
    id: POLYMARKET_HOLDER_POSITION_VALUE_ENDPOINT_ID,
    category: "holders",
    title: "Total Value of Holder's Positions",
    description:
      "Get the total value of positions for one or more holder addresses, optionally limited to specific markets.",
  },
  {
    id: POLYMARKET_HOLDER_TRADES_ENDPOINT_ID,
    category: "holders",
    title: "Holder Trades",
    description:
      "Get trades for one or more holder addresses, filtered by markets, events, side, amount, or time.",
  },
  {
    id: POLYMARKET_HOLDER_TRADED_MARKETS_ENDPOINT_ID,
    category: "holders",
    title: "Total Markets Traded",
    description: "Get the total number of markets each holder address has traded.",
  },
  {
    id: POLYMARKET_TRADER_LEADERBOARD_ENDPOINT_ID,
    category: "leaderboard",
    title: "Trader Leaderboard Rankings",
    description:
      "Rank traders by profit and loss or volume, filtered by category and time period.",
  },
  {
    id: POLYMARKET_OPEN_INTEREST_COMPOSE_ENDPOINT_ID,
    category: "markets",
    title: "Get Open Interest",
    description:
      "Search markets (or paste condition ids), then pull open interest for those markets.",
  },
  ...ENDPOINTS.map((ep) => {
    const category = ENDPOINT_CATEGORY_BY_QUERY[ep.query] || ep.group || "markets";
    const underConstruction = !!ep.wsType || !!ep.broken;
    return {
      id: ep.query,
      category,
      title: ep.name,
      description: ep.description,
      underConstruction,
      broken: !!ep.broken,
      wsType: !!ep.wsType,
      hidden: HIDDEN_EVENT_ENDPOINT_IDS.has(ep.query),
    };
  }),
  ...PLACEHOLDER_ENDPOINTS,
];

/** @param {string} categoryId */
export function getPolymarketLiveEndpointsForCategory(categoryId) {
  const cat = String(categoryId || POLYMARKET_LIVE_DEFAULT_ENDPOINT_CATEGORY).trim();
  return POLYMARKET_LIVE_CONNECT_ENDPOINTS.filter(
    (ep) => (ep.category || "markets") === cat && !ep.hidden,
  );
}

/**
 * @param {string} endpointQuery
 * @returns {{ name: string; type: string; description: string }[]}
 */
export function getPolymarketLiveColumnsForEndpoint(endpointQuery) {
  const id = String(endpointQuery || "").trim();
  if (id === POLYMARKET_EVENTS_COMPOSE_ENDPOINT_ID) {
    return POLYMARKET_EVENTS_COMPOSE_COLUMNS;
  }
  if (id === POLYMARKET_MARKETS_COMPOSE_ENDPOINT_ID) {
    return POLYMARKET_MARKETS_COMPOSE_COLUMNS;
  }
  if (id === POLYMARKET_MARKETS_BY_EVENTS_ENDPOINT_ID) {
    return POLYMARKET_MARKETS_BY_EVENTS_COMPOSE_COLUMNS;
  }
  if (id === POLYMARKET_HOLDERS_BY_MARKETS_ENDPOINT_ID) {
    return POLYMARKET_HOLDERS_BY_MARKETS_COMPOSE_COLUMNS;
  }
  if (id === POLYMARKET_OPEN_INTEREST_COMPOSE_ENDPOINT_ID) {
    return POLYMARKET_OPEN_INTEREST_COMPOSE_COLUMNS;
  }
  if (id === POLYMARKET_LIVE_EVENT_VOLUME_ENDPOINT_ID) {
    return POLYMARKET_LIVE_EVENT_VOLUME_COMPOSE_COLUMNS;
  }
  if (id === POLYMARKET_SAMPLING_MARKETS_ENDPOINT_ID) {
    return POLYMARKET_SAMPLING_MARKETS_COLUMNS;
  }
  if (id === POLYMARKET_ORDERBOOKS_ENDPOINT_ID) {
    return POLYMARKET_ORDERBOOKS_COMPOSE_COLUMNS;
  }
  if (id === POLYMARKET_MARKET_PRICES_ENDPOINT_ID) {
    return POLYMARKET_MARKET_PRICES_COLUMNS;
  }
  if (id === POLYMARKET_MIDPOINT_PRICES_ENDPOINT_ID) {
    return POLYMARKET_MIDPOINT_PRICES_COLUMNS;
  }
  if (id === POLYMARKET_SPREADS_ENDPOINT_ID) {
    return POLYMARKET_SPREADS_COLUMNS;
  }
  if (id === POLYMARKET_LAST_TRADE_PRICES_ENDPOINT_ID) {
    return POLYMARKET_LAST_TRADE_PRICES_COLUMNS;
  }
  if (id === POLYMARKET_PRICES_HISTORY_ENDPOINT_ID) {
    return POLYMARKET_PRICES_HISTORY_COLUMNS;
  }
  if (id === POLYMARKET_PUBLIC_PROFILES_ENDPOINT_ID) {
    return POLYMARKET_PUBLIC_PROFILES_COLUMNS;
  }
  if (id === POLYMARKET_CURRENT_POSITIONS_ENDPOINT_ID) {
    return POLYMARKET_CURRENT_POSITIONS_COLUMNS;
  }
  if (id === POLYMARKET_CLOSED_POSITIONS_ENDPOINT_ID) {
    return POLYMARKET_CLOSED_POSITIONS_COLUMNS;
  }
  if (id === POLYMARKET_USER_ACTIVITY_ENDPOINT_ID) {
    return POLYMARKET_USER_ACTIVITY_COLUMNS;
  }
  if (id === POLYMARKET_HOLDER_POSITION_VALUE_ENDPOINT_ID) {
    return POLYMARKET_HOLDER_POSITION_VALUE_COLUMNS;
  }
  if (id === POLYMARKET_HOLDER_TRADES_ENDPOINT_ID) {
    return POLYMARKET_HOLDER_TRADES_COLUMNS;
  }
  if (id === POLYMARKET_HOLDER_TRADED_MARKETS_ENDPOINT_ID) {
    return POLYMARKET_HOLDER_TRADED_MARKETS_COLUMNS;
  }
  if (id === POLYMARKET_TRADER_LEADERBOARD_ENDPOINT_ID) {
    return POLYMARKET_TRADER_LEADERBOARD_COLUMNS;
  }
  const ep = ENDPOINTS.find((e) => e.query === id);
  if (ep?.responseFields?.length) {
    return ep.responseFields.map((name) => ({
      name,
      type: "string",
      description: String(name || "")
        .replace(/([A-Z])/g, " $1")
        .trim(),
    }));
  }

  if (id === "getEventTags" || id === "getMarketTags") {
    return [
      { name: "id", type: "string", description: "Tag ID" },
      { name: "label", type: "string", description: "Tag label" },
      { name: "slug", type: "string", description: "Tag slug" },
      { name: "forceShow", type: "string", description: "Force show flag" },
      { name: "publishedAt", type: "string", description: "Published at" },
      { name: "createdBy", type: "string", description: "Created by" },
      { name: "updatedBy", type: "string", description: "Updated by" },
      { name: "createdAt", type: "string", description: "Created at" },
      { name: "updatedAt", type: "string", description: "Updated at" },
    ];
  }

  if (id === "getTopHolders" || id === POLYMARKET_HOLDERS_BY_MARKETS_ENDPOINT_ID) {
    return POLYMARKET_HOLDERS_BY_MARKETS_COMPOSE_COLUMNS;
  }

  if (id === "getOpenInterest" || id === POLYMARKET_OPEN_INTEREST_COMPOSE_ENDPOINT_ID) {
    return POLYMARKET_OPEN_INTEREST_COMPOSE_COLUMNS;
  }

  if (id === "getLiveVolume") {
    return [
      { name: "id", type: "string", description: "Event ID" },
      { name: "total", type: "string", description: "Total live volume" },
      { name: "markets", type: "string", description: "Per-market volume breakdown" },
    ];
  }

  if (
    id === "listEvents" ||
    id === "getEvent" ||
    id === "getEventBySlug"
  ) {
    return EVENTS_RESPONSE_FIELDS.map((name) => ({
      name,
      type: "string",
      description: name,
    }));
  }

  if (
    id === "listMarkets" ||
    id === "getMarket" ||
    id === "getMarketBySlug"
  ) {
    return MARKETS_RESPONSE_FIELDS.map((name) => ({
      name,
      type: "string",
      description: name,
    }));
  }

  if (id === "getPricesHistory") {
    return PRICES_HISTORY_RESPONSE_FIELDS.map((name) => ({
      name,
      type: "string",
      description: name,
    }));
  }

  if (id === "getTradesByMarket" || id === "getTradesByUser") {
    return TRADES_RESPONSE_FIELDS.map((name) => ({
      name,
      type: "string",
      description: name,
    }));
  }

  return [];
}
