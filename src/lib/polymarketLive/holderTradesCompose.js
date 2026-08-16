/**
 * Polymarket Live — holder trades (Data API GET /trades).
 */

export const POLYMARKET_HOLDER_TRADES_ENDPOINT_ID = "getHolderTrades";

export const POLYMARKET_HOLDER_TRADES_COLUMNS = [
  { name: "proxyWallet", type: "string", description: "Holder proxy wallet address" },
  { name: "side", type: "string", description: "Trade side" },
  { name: "asset", type: "string", description: "Outcome token asset id" },
  { name: "conditionId", type: "string", description: "Market condition id" },
  { name: "size", type: "number", description: "Token amount traded" },
  { name: "price", type: "number", description: "Trade price" },
  { name: "timestamp", type: "number", description: "Trade timestamp in epoch seconds" },
  { name: "title", type: "string", description: "Market title" },
  { name: "slug", type: "string", description: "Market slug" },
  { name: "icon", type: "string", description: "Market artwork URL" },
  { name: "eventSlug", type: "string", description: "Event slug" },
  { name: "outcome", type: "string", description: "Outcome label" },
  { name: "outcomeIndex", type: "number", description: "Outcome index" },
  { name: "name", type: "string", description: "Holder display name" },
  { name: "pseudonym", type: "string", description: "Holder pseudonym" },
  { name: "bio", type: "string", description: "Holder profile bio" },
  { name: "profileImage", type: "string", description: "Holder profile image URL" },
  { name: "profileImageOptimized", type: "string", description: "Optimized profile image URL" },
  { name: "transactionHash", type: "string", description: "Transaction hash" },
];

export const POLYMARKET_HOLDER_TRADES_DEFAULT_COLUMNS = [
  "proxyWallet",
  "timestamp",
  "title",
  "outcome",
  "side",
  "size",
  "price",
  "transactionHash",
  "conditionId",
];

export function emptyPolymarketHolderTradesComposeState() {
  return {
    addresses: "",
    market: "",
    eventId: "",
    takerOnly: true,
    filterType: "",
    filterAmount: "",
    side: "",
    start: "",
    end: "",
    limit: 100,
    offset: 0,
  };
}

/** @param {unknown} raw */
export function normalizePolymarketHolderTradesComposeState(raw) {
  const base = emptyPolymarketHolderTradesComposeState();
  if (!raw || typeof raw !== "object") return base;
  const value = /** @type {Record<string, unknown>} */ (raw);
  const limit = Number(value.limit);
  const offset = Number(value.offset);
  const filterType = String(value.filterType || "").toUpperCase();
  const side = String(value.side || "").toUpperCase();
  return {
    addresses: String(value.addresses || ""),
    market: String(value.market || ""),
    eventId: String(value.eventId || ""),
    takerOnly: value.takerOnly !== false,
    filterType: filterType === "CASH" || filterType === "TOKENS" ? filterType : "",
    filterAmount: String(value.filterAmount || ""),
    side: side === "BUY" || side === "SELL" ? side : "",
    start: String(value.start || ""),
    end: String(value.end || ""),
    limit: Number.isFinite(limit) ? Math.min(10000, Math.max(0, Math.floor(limit))) : 100,
    offset: Number.isFinite(offset) ? Math.min(10000, Math.max(0, Math.floor(offset))) : 0,
  };
}

/** @param {ReturnType<typeof emptyPolymarketHolderTradesComposeState>} raw */
export function buildPolymarketHolderTradesQueryValues(raw) {
  const state = normalizePolymarketHolderTradesComposeState(raw);
  const market = state.market.trim();
  const eventId = state.eventId.trim();
  if (market && eventId) {
    throw new Error("Filter by condition IDs or event IDs, not both.");
  }
  const filterAmount = state.filterAmount.trim();
  if ((state.filterType && !filterAmount) || (!state.filterType && filterAmount)) {
    throw new Error("Filter type and filter amount must be provided together.");
  }
  if (filterAmount && (!Number.isFinite(Number(filterAmount)) || Number(filterAmount) < 0)) {
    throw new Error("Filter amount must be zero or greater.");
  }
  const start = state.start.trim();
  const end = state.end.trim();
  if (start && (!/^\d+$/.test(start) || Number(start) < 0)) {
    throw new Error("Start must be an epoch timestamp in seconds.");
  }
  if (end && (!/^\d+$/.test(end) || Number(end) < 0)) {
    throw new Error("End must be an epoch timestamp in seconds.");
  }
  if (start && end && Number(end) <= Number(start)) {
    throw new Error("End must be after start.");
  }
  const values = {
    takerOnly: String(state.takerOnly),
    limit: String(state.limit),
    offset: String(state.offset),
  };
  if (market) values.market = market;
  if (eventId) values.eventId = eventId;
  if (state.filterType) values.filterType = state.filterType;
  if (filterAmount) values.filterAmount = filterAmount;
  if (state.side) values.side = state.side;
  if (start) values.start = start;
  if (end) values.end = end;
  return values;
}

/** @param {unknown} trade @param {string[]} selectedColumns */
export function projectPolymarketHolderTrade(trade, selectedColumns) {
  const source =
    trade && typeof trade === "object"
      ? /** @type {Record<string, unknown>} */ (trade)
      : {};
  const selected = new Set(
    Array.isArray(selectedColumns) && selectedColumns.length
      ? selectedColumns
      : POLYMARKET_HOLDER_TRADES_DEFAULT_COLUMNS,
  );
  const row = {};
  for (const { name } of POLYMARKET_HOLDER_TRADES_COLUMNS) {
    if (selected.has(name)) row[name] = source[name] == null ? "" : source[name];
  }
  return row;
}
