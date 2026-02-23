/**
 * Polymarket endpoint config: query, name, description, group, and params.
 * listQuery = call this query first to populate dropdown (value from id, label from title/name + id).
 */
export const POLYMARKET_GROUPS = {
  events: "Events",
  markets: "Markets",
  trades: "Trades",
};

/** Trade response fields from https://docs.polymarket.com/api-reference/core/get-trades-for-a-user-or-markets */
export const TRADES_RESPONSE_FIELDS = [
  "proxyWallet", "side", "asset", "conditionId", "size", "price", "timestamp",
  "title", "slug", "icon", "eventSlug", "outcome", "outcomeIndex", "name",
  "pseudonym", "bio", "profileImage", "profileImageOptimized", "transactionHash",
];

/** Event response fields (List events) — top-level + flattened nested keys from gamma-api.polymarket.com/events */
export const EVENTS_RESPONSE_FIELDS = [
  "id", "ticker", "slug", "title", "subtitle", "description", "resolutionSource",
  "startDate", "creationDate", "endDate", "image", "icon", "active", "closed", "archived", "new", "featured", "restricted",
  "liquidity", "volume", "openInterest", "sortBy", "category", "subcategory", "isTemplate", "templateVariables",
  "published_at", "createdBy", "updatedBy", "createdAt", "updatedAt", "commentsEnabled", "competitive",
  "volume24hr", "volume1wk", "volume1mo", "volume1yr", "featuredImage", "disqusThread", "parentEvent",
  "enableOrderBook", "liquidityAmm", "liquidityClob", "negRisk", "negRiskMarketID", "negRiskFeeBips", "commentCount",
  "imageOptimized_id", "imageOptimized_imageUrlSource", "imageOptimized_imageUrlOptimized", "imageOptimized_imageSizeKbSource",
  "imageOptimized_imageSizeKbOptimized", "imageOptimized_imageOptimizedComplete", "imageOptimized_imageOptimizedLastUpdated",
  "imageOptimized_relID", "imageOptimized_field", "imageOptimized_relname",
  "iconOptimized_id", "iconOptimized_imageUrlSource", "iconOptimized_imageUrlOptimized", "iconOptimized_imageSizeKbSource",
  "iconOptimized_imageSizeKbOptimized", "iconOptimized_imageOptimizedComplete", "iconOptimized_imageOptimizedLastUpdated",
  "iconOptimized_relID", "iconOptimized_field", "iconOptimized_relname",
  "featuredImageOptimized_id", "featuredImageOptimized_imageUrlSource", "featuredImageOptimized_imageUrlOptimized",
  "featuredImageOptimized_imageSizeKbSource", "featuredImageOptimized_imageSizeKbOptimized",
  "featuredImageOptimized_imageOptimizedComplete", "featuredImageOptimized_imageOptimizedLastUpdated",
  "featuredImageOptimized_relID", "featuredImageOptimized_field", "featuredImageOptimized_relname",
  "subEvents", "markets", "series", "categories", "collections", "tags",
  "cyom", "closedTime", "showAllOutcomes", "showMarketImages", "automaticallyResolved", "enableNegRisk", "automaticallyActive",
  "eventDate", "startTime", "eventWeek", "seriesSlug", "score", "elapsed", "period", "live", "ended", "finishedTimestamp",
  "gmpChartMode", "eventCreators", "tweetCount", "chats", "featuredOrder", "estimateValue", "cantEstimate", "estimatedValue",
  "templates", "spreadsMainLine", "totalsMainLine", "carouselMap", "pendingDeployment", "deploying",
  "deployingTimestamp", "scheduledDeploymentTimestamp", "gameStatus",
];

export const ENDPOINTS = [
  // Events
  {
    query: "listEvents",
    name: "List events",
    description: "Fetch events with optional filters (limit, offset, active, closed, dates, etc.).",
    group: "events",
    responseFields: EVENTS_RESPONSE_FIELDS,
    params: [
      { key: "limit", label: "Limit", required: false, type: "number", default: 20, hint: "Range >= 0" },
      { key: "offset", label: "Offset", required: false, type: "number", default: 0, hint: "Range >= 0" },
      { key: "order", label: "Order", required: false, type: "text", hint: "Comma-separated fields to order by" },
      { key: "ascending", label: "Ascending", required: false, type: "boolean", default: "" },
      { key: "id", label: "Event ID(s)", required: false, type: "text", hint: "Comma-separated event IDs" },
      { key: "tag_id", label: "Tag ID", required: false, type: "number" },
      { key: "exclude_tag_id", label: "Exclude tag ID(s)", required: false, type: "text", hint: "Comma-separated tag IDs to exclude" },
      { key: "slug", label: "Slug(s)", required: false, type: "text", hint: "Comma-separated event slugs" },
      { key: "tag_slug", label: "Tag slug", required: false, type: "text" },
      { key: "related_tags", label: "Related tags", required: false, type: "boolean", default: "" },
      { key: "active", label: "Active only", required: false, type: "boolean", default: "" },
      { key: "archived", label: "Archived only", required: false, type: "boolean", default: "" },
      { key: "featured", label: "Featured only", required: false, type: "boolean", default: "" },
      { key: "cyom", label: "CYOM", required: false, type: "boolean", default: "" },
      { key: "include_chat", label: "Include chat", required: false, type: "boolean", default: "" },
      { key: "include_template", label: "Include template", required: false, type: "boolean", default: "" },
      { key: "recurrence", label: "Recurrence", required: false, type: "text" },
      { key: "closed", label: "Closed only", required: false, type: "boolean", default: "" },
      { key: "liquidity_min", label: "Liquidity min", required: false, type: "number" },
      { key: "liquidity_max", label: "Liquidity max", required: false, type: "number" },
      { key: "volume_min", label: "Volume min", required: false, type: "number" },
      { key: "volume_max", label: "Volume max", required: false, type: "number" },
      { key: "start_date_min", label: "Start date min", required: false, type: "text", hint: "ISO date-time" },
      { key: "start_date_max", label: "Start date max", required: false, type: "text", hint: "ISO date-time" },
      { key: "end_date_min", label: "End date min", required: false, type: "text", hint: "ISO date-time" },
      { key: "end_date_max", label: "End date max", required: false, type: "text", hint: "ISO date-time" },
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
  {
    query: "getTopHolders",
    name: "Get top holders for markets",
    description: "Top holders per market. Requires condition IDs from List markets (conditionId).",
    group: "markets",
    params: [
      { key: "market", label: "Condition ID(s)", required: true, type: "text", hint: "Comma-separated condition IDs from List markets" },
      { key: "limit", label: "Limit per token", required: false, type: "number", default: 20 },
      { key: "minBalance", label: "Min balance", required: false, type: "number", default: 1 },
    ],
  },
  {
    query: "getOpenInterest",
    name: "Get open interest",
    description: "Open interest; optional market condition IDs.",
    group: "markets",
    params: [
      { key: "market", label: "Condition ID(s)", required: false, type: "text", hint: "Comma-separated; omit for all" },
    ],
  },
  {
    query: "getLiveVolume",
    name: "Get live volume for an event",
    description: "Live volume for an event. Requires event ID (from List events).",
    group: "markets",
    params: [
      { key: "id", label: "Event ID", required: true, type: "text", listQuery: "listEvents", listLabelKey: "title", listValueKey: "id" },
    ],
  },
  // Trades (Data API: https://data-api.polymarket.com/api-reference/core/get-trades-for-a-user-or-markets) — under construction
  {
    query: "getTradesByMarket",
    name: "Get trades by market",
    description: "Get trades for one or more markets (condition IDs). Use List markets to pick a market, or enter condition ID(s) comma-separated.",
    group: "trades",
    broken: true,
    responseFields: TRADES_RESPONSE_FIELDS,
    params: [
      { key: "market", label: "Condition ID(s)", required: true, type: "text", listQuery: "listMarkets", listLabelKey: "question", listValueKey: "conditionId", hint: "Comma-separated condition IDs from List markets" },
      { key: "limit", label: "Limit", required: false, type: "number", default: 100 },
      { key: "offset", label: "Offset", required: false, type: "number", default: 0 },
      { key: "side", label: "Side", required: false, type: "text", hint: "BUY or SELL" },
    ],
  },
  {
    query: "getTradesByUser",
    name: "Get trades by user",
    description: "Get trades for a user (wallet address). Enter a 0x-prefixed Ethereum address.",
    group: "trades",
    broken: true,
    responseFields: TRADES_RESPONSE_FIELDS,
    params: [
      { key: "user", label: "User (wallet address)", required: true, type: "text", hint: "0x-prefixed address (40 hex chars)" },
      { key: "limit", label: "Limit", required: false, type: "number", default: 100 },
      { key: "offset", label: "Offset", required: false, type: "number", default: 0 },
      { key: "side", label: "Side", required: false, type: "text", hint: "BUY or SELL" },
    ],
  },
];
