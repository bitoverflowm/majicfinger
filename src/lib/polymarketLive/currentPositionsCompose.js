/**
 * Polymarket Live — current holder positions (Data API GET /positions).
 */

/**
 * @typedef {{
 *   addresses: string;
 *   market: string;
 *   eventId: string;
 *   sizeThreshold: number;
 *   redeemable: boolean;
 *   mergeable: boolean;
 *   includeArchived: boolean;
 *   limit: number;
 *   offset: number;
 *   sortBy: string;
 *   sortDirection: string;
 *   title: string;
 * }} PolymarketCurrentPositionsComposeState
 */

export const POLYMARKET_CURRENT_POSITIONS_ENDPOINT_ID = "getCurrentPositions";

export const POLYMARKET_CURRENT_POSITIONS_COLUMNS = [
  { name: "proxyWallet", type: "string", description: "Holder proxy wallet address" },
  { name: "asset", type: "string", description: "Outcome token asset id" },
  { name: "conditionId", type: "string", description: "Market condition id" },
  { name: "size", type: "number", description: "Current position size" },
  { name: "avgPrice", type: "number", description: "Average entry price" },
  { name: "initialValue", type: "number", description: "Fee-exclusive initial value" },
  { name: "grossInitialValue", type: "number", description: "Initial value including attributed buy fees" },
  { name: "entryFeesUsdc", type: "number", description: "Attributed buy fees in USDC" },
  { name: "currentValue", type: "number", description: "Current position value" },
  { name: "cashPnl", type: "number", description: "Cash profit and loss" },
  { name: "percentPnl", type: "number", description: "Percentage profit and loss" },
  { name: "totalBought", type: "number", description: "Total tokens bought" },
  { name: "realizedPnl", type: "number", description: "Realized profit and loss" },
  { name: "percentRealizedPnl", type: "number", description: "Realized profit and loss percentage" },
  { name: "curPrice", type: "number", description: "Current outcome price" },
  { name: "redeemable", type: "boolean", description: "Whether the position is redeemable" },
  { name: "mergeable", type: "boolean", description: "Whether the position is mergeable" },
  { name: "title", type: "string", description: "Market title" },
  { name: "slug", type: "string", description: "Market slug" },
  { name: "icon", type: "string", description: "Market icon URL" },
  { name: "eventSlug", type: "string", description: "Event slug" },
  { name: "outcome", type: "string", description: "Held outcome" },
  { name: "outcomeIndex", type: "number", description: "Outcome index" },
  { name: "oppositeOutcome", type: "string", description: "Opposite outcome label" },
  { name: "oppositeAsset", type: "string", description: "Opposite outcome token asset id" },
  { name: "endDate", type: "string", description: "Market end date" },
  { name: "negativeRisk", type: "boolean", description: "Whether the market uses negative risk" },
];

export const POLYMARKET_CURRENT_POSITIONS_DEFAULT_COLUMNS = [
  "proxyWallet",
  "title",
  "outcome",
  "size",
  "avgPrice",
  "curPrice",
  "currentValue",
  "cashPnl",
  "percentPnl",
  "redeemable",
  "conditionId",
];

export const POLYMARKET_CURRENT_POSITIONS_SORT_OPTIONS = [
  "CURRENT",
  "INITIAL",
  "TOKENS",
  "CASHPNL",
  "PERCENTPNL",
  "TITLE",
  "RESOLVING",
  "PRICE",
  "AVGPRICE",
];

export function emptyPolymarketCurrentPositionsComposeState() {
  return {
    addresses: "",
    market: "",
    eventId: "",
    sizeThreshold: 1,
    redeemable: false,
    mergeable: false,
    includeArchived: false,
    limit: 100,
    offset: 0,
    sortBy: "TOKENS",
    sortDirection: "DESC",
    title: "",
  };
}

/** @param {unknown} raw */
export function normalizePolymarketCurrentPositionsComposeState(raw) {
  const base = emptyPolymarketCurrentPositionsComposeState();
  if (!raw || typeof raw !== "object") return base;
  const value = /** @type {Record<string, unknown>} */ (raw);
  const sizeThreshold = Number(value.sizeThreshold);
  const limit = Number(value.limit);
  const offset = Number(value.offset);
  const sortBy = String(value.sortBy || "").toUpperCase();
  const sortDirection = String(value.sortDirection || "").toUpperCase();
  return {
    addresses: String(value.addresses || ""),
    market: String(value.market || ""),
    eventId: String(value.eventId || ""),
    sizeThreshold: Number.isFinite(sizeThreshold) && sizeThreshold >= 0 ? sizeThreshold : 1,
    redeemable: value.redeemable === true,
    mergeable: value.mergeable === true,
    includeArchived: value.includeArchived === true,
    limit: Number.isFinite(limit) ? Math.min(500, Math.max(0, Math.floor(limit))) : 100,
    offset: Number.isFinite(offset) ? Math.min(10000, Math.max(0, Math.floor(offset))) : 0,
    sortBy: POLYMARKET_CURRENT_POSITIONS_SORT_OPTIONS.includes(sortBy) ? sortBy : "TOKENS",
    sortDirection: sortDirection === "ASC" ? "ASC" : "DESC",
    title: String(value.title || "").slice(0, 100),
  };
}

/** @param {PolymarketCurrentPositionsComposeState} raw */
export function buildPolymarketCurrentPositionsQueryValues(raw) {
  const state = normalizePolymarketCurrentPositionsComposeState(raw);
  const market = state.market.trim();
  const eventId = state.eventId.trim();
  if (market && eventId) {
    throw new Error("Filter by condition IDs or event IDs, not both.");
  }
  const values = {
    sizeThreshold: String(state.sizeThreshold),
    redeemable: String(state.redeemable),
    mergeable: String(state.mergeable),
    includeArchived: String(state.includeArchived),
    limit: String(state.limit),
    offset: String(state.offset),
    sortBy: state.sortBy,
    sortDirection: state.sortDirection,
  };
  if (market) values.market = market;
  if (eventId) values.eventId = eventId;
  if (state.title.trim()) values.title = state.title.trim();
  return values;
}

/** @param {unknown} position @param {string[]} selectedColumns */
export function projectPolymarketCurrentPosition(position, selectedColumns) {
  const source =
    position && typeof position === "object"
      ? /** @type {Record<string, unknown>} */ (position)
      : {};
  const selected = new Set(
    Array.isArray(selectedColumns) && selectedColumns.length
      ? selectedColumns
      : POLYMARKET_CURRENT_POSITIONS_DEFAULT_COLUMNS,
  );
  const row = {};
  for (const { name } of POLYMARKET_CURRENT_POSITIONS_COLUMNS) {
    if (selected.has(name)) row[name] = source[name] == null ? "" : source[name];
  }
  return row;
}
