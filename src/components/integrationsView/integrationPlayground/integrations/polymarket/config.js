/**
 * Polymarket endpoint config: query, name, description, group, and params.
 * listQuery = call this query first to populate dropdown (value from id, label from title/name + id).
 */
export const POLYMARKET_GROUPS = {
  events: "Events",
  markets: "Markets",
  core: "Core",
  misc: "Misc",
};

export const ENDPOINTS = [
  // Events
  {
    query: "listEvents",
    name: "List events",
    description: "Fetch events with optional filters (limit, offset, active, closed, dates, etc.).",
    group: "events",
    params: [
      { key: "limit", label: "Limit", required: false, type: "number", default: 20 },
      { key: "offset", label: "Offset", required: false, type: "number", default: 0 },
      { key: "active", label: "Active only", required: false, type: "boolean", default: "" },
      { key: "closed", label: "Closed only", required: false, type: "boolean", default: "" },
      { key: "featured", label: "Featured only", required: false, type: "boolean", default: "" },
    ],
  },
  {
    query: "getEvent",
    name: "Get event by ID",
    description: "Get a single event by ID. Use List events to get IDs, or pull list below.",
    group: "events",
    params: [
      { key: "id", label: "Event ID", required: true, type: "text", listQuery: "listEvents", listLabelKey: "title", listValueKey: "id" },
    ],
  },
  {
    query: "getEventBySlug",
    name: "Get event by slug",
    description: "Get a single event by URL slug (e.g. from event page URL).",
    group: "events",
    params: [
      { key: "slug", label: "Event slug", required: true, type: "text" },
    ],
  },
  {
    query: "getEventTags",
    name: "Get event tags",
    description: "Get tags for an event. Requires event ID (from List events or Get event by ID).",
    group: "events",
    params: [
      { key: "id", label: "Event ID", required: true, type: "text", listQuery: "listEvents", listLabelKey: "title", listValueKey: "id" },
    ],
  },
  // Markets
  {
    query: "listMarkets",
    name: "List markets",
    description: "Fetch markets with optional filters.",
    group: "markets",
    params: [
      { key: "limit", label: "Limit", required: false, type: "number", default: 20 },
      { key: "offset", label: "Offset", required: false, type: "number", default: 0 },
      { key: "closed", label: "Closed only", required: false, type: "boolean", default: "" },
    ],
  },
  {
    query: "getMarket",
    name: "Get market by ID",
    description: "Get a single market by ID. Use List markets to get IDs, or pull list below.",
    group: "markets",
    params: [
      { key: "id", label: "Market ID", required: true, type: "text", listQuery: "listMarkets", listLabelKey: "question", listValueKey: "id" },
    ],
  },
  {
    query: "getMarketBySlug",
    name: "Get market by slug",
    description: "Get a single market by URL slug.",
    group: "markets",
    params: [
      { key: "slug", label: "Market slug", required: true, type: "text" },
    ],
  },
  {
    query: "getMarketTags",
    name: "Get market tags by ID",
    description: "Get tags for a market. Requires market ID (from List markets or Get market by ID).",
    group: "markets",
    params: [
      { key: "id", label: "Market ID", required: true, type: "text", listQuery: "listMarkets", listLabelKey: "question", listValueKey: "id" },
    ],
  },
  // Core (Data API)
  {
    query: "getTopHolders",
    name: "Get top holders for markets",
    description: "Top holders per market. Requires condition IDs from List markets (conditionId).",
    group: "core",
    params: [
      { key: "market", label: "Condition ID(s)", required: true, type: "text", hint: "Comma-separated condition IDs from List markets" },
      { key: "limit", label: "Limit per token", required: false, type: "number", default: 20 },
      { key: "minBalance", label: "Min balance", required: false, type: "number", default: 1 },
    ],
  },
  // Misc (Data API)
  {
    query: "getOpenInterest",
    name: "Get open interest",
    description: "Open interest; optional market condition IDs.",
    group: "misc",
    params: [
      { key: "market", label: "Condition ID(s)", required: false, type: "text", hint: "Comma-separated; omit for all" },
    ],
  },
  {
    query: "getLiveVolume",
    name: "Get live volume for an event",
    description: "Live volume for an event. Requires event ID (from List events).",
    group: "misc",
    params: [
      { key: "id", label: "Event ID", required: true, type: "text", listQuery: "listEvents", listLabelKey: "title", listValueKey: "id" },
    ],
  },
];
