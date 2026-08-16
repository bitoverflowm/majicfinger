/**
 * Polymarket Live — closed holder positions (Data API GET /closed-positions).
 */

/**
 * @typedef {{
 *   addresses: string;
 *   market: string;
 *   eventId: string;
 *   title: string;
 *   limit: number;
 *   offset: number;
 *   sortBy: string;
 *   sortDirection: string;
 * }} PolymarketClosedPositionsComposeState
 */

export const POLYMARKET_CLOSED_POSITIONS_ENDPOINT_ID = "getClosedPositions";

export const POLYMARKET_CLOSED_POSITIONS_COLUMNS = [
  { name: "proxyWallet", type: "string", description: "Holder proxy wallet address" },
  { name: "asset", type: "string", description: "Outcome token asset id" },
  { name: "conditionId", type: "string", description: "Market condition id" },
  { name: "avgPrice", type: "number", description: "Average entry price" },
  { name: "totalBought", type: "number", description: "Total tokens bought" },
  { name: "realizedPnl", type: "number", description: "Realized profit and loss" },
  { name: "curPrice", type: "number", description: "Final or current outcome price" },
  { name: "timestamp", type: "number", description: "Position close timestamp" },
  { name: "title", type: "string", description: "Market title" },
  { name: "slug", type: "string", description: "Market slug" },
  { name: "icon", type: "string", description: "Market icon URL" },
  { name: "eventSlug", type: "string", description: "Event slug" },
  { name: "outcome", type: "string", description: "Held outcome" },
  { name: "outcomeIndex", type: "number", description: "Outcome index" },
  { name: "oppositeOutcome", type: "string", description: "Opposite outcome label" },
  { name: "oppositeAsset", type: "string", description: "Opposite outcome token asset id" },
  { name: "endDate", type: "string", description: "Market end date" },
];

export const POLYMARKET_CLOSED_POSITIONS_DEFAULT_COLUMNS = [
  "proxyWallet",
  "title",
  "outcome",
  "avgPrice",
  "totalBought",
  "realizedPnl",
  "curPrice",
  "timestamp",
  "conditionId",
];

export const POLYMARKET_CLOSED_POSITIONS_SORT_OPTIONS = [
  "REALIZEDPNL",
  "TITLE",
  "PRICE",
  "AVGPRICE",
  "TIMESTAMP",
];

export function emptyPolymarketClosedPositionsComposeState() {
  return {
    addresses: "",
    market: "",
    eventId: "",
    title: "",
    limit: 10,
    offset: 0,
    sortBy: "REALIZEDPNL",
    sortDirection: "DESC",
  };
}

/** @param {unknown} raw */
export function normalizePolymarketClosedPositionsComposeState(raw) {
  const base = emptyPolymarketClosedPositionsComposeState();
  if (!raw || typeof raw !== "object") return base;
  const value = /** @type {Record<string, unknown>} */ (raw);
  const limit = Number(value.limit);
  const offset = Number(value.offset);
  const sortBy = String(value.sortBy || "").toUpperCase();
  const sortDirection = String(value.sortDirection || "").toUpperCase();
  return {
    addresses: String(value.addresses || ""),
    market: String(value.market || ""),
    eventId: String(value.eventId || ""),
    title: String(value.title || "").slice(0, 100),
    limit: Number.isFinite(limit) ? Math.min(50, Math.max(0, Math.floor(limit))) : 10,
    offset: Number.isFinite(offset) ? Math.min(100000, Math.max(0, Math.floor(offset))) : 0,
    sortBy: POLYMARKET_CLOSED_POSITIONS_SORT_OPTIONS.includes(sortBy)
      ? sortBy
      : "REALIZEDPNL",
    sortDirection: sortDirection === "ASC" ? "ASC" : "DESC",
  };
}

/** @param {PolymarketClosedPositionsComposeState} raw */
export function buildPolymarketClosedPositionsQueryValues(raw) {
  const state = normalizePolymarketClosedPositionsComposeState(raw);
  const market = state.market.trim();
  const eventId = state.eventId.trim();
  if (market && eventId) {
    throw new Error("Filter by condition IDs or event IDs, not both.");
  }
  const values = {
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
export function projectPolymarketClosedPosition(position, selectedColumns) {
  const source =
    position && typeof position === "object"
      ? /** @type {Record<string, unknown>} */ (position)
      : {};
  const selected = new Set(
    Array.isArray(selectedColumns) && selectedColumns.length
      ? selectedColumns
      : POLYMARKET_CLOSED_POSITIONS_DEFAULT_COLUMNS,
  );
  const row = {};
  for (const { name } of POLYMARKET_CLOSED_POSITIONS_COLUMNS) {
    if (selected.has(name)) row[name] = source[name] == null ? "" : source[name];
  }
  return row;
}
