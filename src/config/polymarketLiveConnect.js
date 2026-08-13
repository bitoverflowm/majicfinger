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

/**
 * Top-level Polymarket Live endpoint groups (hub column tags).
 * Order matches Polymarket API surface: markets → events → series → holders →
 * builders → sports → combos → live.
 */
export const POLYMARKET_LIVE_ENDPOINT_CATEGORIES = [
  { id: "markets", label: "Markets" },
  { id: "events", label: "Events" },
  { id: "series", label: "Series" },
  { id: "holders", label: "Holders" },
  { id: "builders", label: "Builders" },
  { id: "sports", label: "Sports" },
  { id: "combos", label: "Combos" },
  { id: "live", label: "Live" },
];

export const POLYMARKET_LIVE_DEFAULT_ENDPOINT_CATEGORY = "markets";

/** Legacy granular event endpoints — hidden from hub in favor of Get Event/Events. */
const HIDDEN_EVENT_ENDPOINT_IDS = new Set([
  "listEvents",
  "getEvent",
  "getEventBySlug",
  "getEventTags",
]);

/** @type {Record<string, string>} */
const ENDPOINT_CATEGORY_BY_QUERY = {
  listMarkets: "markets",
  getMarket: "markets",
  getMarketBySlug: "markets",
  getMarketTags: "markets",
  getOpenInterest: "markets",
  getLiveVolume: "markets",
  getPricesHistory: "markets",
  listEvents: "events",
  getEvent: "events",
  getEventBySlug: "events",
  getEventTags: "events",
  [POLYMARKET_EVENTS_COMPOSE_ENDPOINT_ID]: "events",
  [POLYMARKET_MARKETS_BY_EVENTS_ENDPOINT_ID]: "markets",
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
  {
    id: "builderLeaderboard",
    category: "builders",
    title: "Builder leaderboard",
    description: "Aggregated builder volume and rankings across Polymarket.",
    underConstruction: true,
  },
  {
    id: "builderVolume",
    category: "builders",
    title: "Daily builder volume",
    description: "Daily builder volume time-series for routed order flow.",
    underConstruction: true,
  },
  {
    id: "sportsMetadata",
    category: "sports",
    title: "Sports metadata",
    description: "Sports leagues and metadata used to discover sports markets.",
    underConstruction: true,
  },
  {
    id: "sportsMarketTypes",
    category: "sports",
    title: "Sports market types",
    description: "Valid sports market types (spreads, totals, moneyline, etc.).",
    underConstruction: true,
  },
  {
    id: "listTeams",
    category: "sports",
    title: "List teams",
    description: "Sports teams metadata for filtering and labeling markets.",
    underConstruction: true,
  },
  {
    id: "getComboMarkets",
    category: "combos",
    title: "Combo markets",
    description: "Active markets that can be used as combo legs, ordered by volume.",
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
  if (id === POLYMARKET_MARKETS_BY_EVENTS_ENDPOINT_ID) {
    return POLYMARKET_MARKETS_BY_EVENTS_COMPOSE_COLUMNS;
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

  if (id === "getTopHolders") {
    return [
      { name: "token", type: "string", description: "Token / outcome identifier" },
      { name: "proxyWallet", type: "string", description: "Holder wallet" },
      { name: "amount", type: "string", description: "Position size" },
      { name: "name", type: "string", description: "Display name" },
      { name: "pseudonym", type: "string", description: "Pseudonym" },
      { name: "bio", type: "string", description: "Profile bio" },
      { name: "profileImage", type: "string", description: "Profile image URL" },
    ];
  }

  if (id === "getOpenInterest") {
    return [
      { name: "market", type: "string", description: "Condition ID" },
      { name: "value", type: "string", description: "Open interest value" },
    ];
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
