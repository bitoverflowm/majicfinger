/**
 * Polymarket Live — user activity (Data API GET /activity).
 */

export const POLYMARKET_USER_ACTIVITY_ENDPOINT_ID = "getUserActivity";

export const POLYMARKET_USER_ACTIVITY_TYPES = [
  "TRADE",
  "SPLIT",
  "MERGE",
  "REDEEM",
  "REWARD",
  "CONVERSION",
  "DEPOSIT",
  "WITHDRAWAL",
  "YIELD",
  "MAKER_REBATE",
  "TAKER_REBATE",
  "REFERRAL_REWARD",
];

export const POLYMARKET_USER_ACTIVITY_COLUMNS = [
  { name: "proxyWallet", type: "string", description: "User proxy wallet address" },
  { name: "timestamp", type: "number", description: "Activity timestamp in epoch seconds" },
  { name: "conditionId", type: "string", description: "Market condition id" },
  { name: "type", type: "string", description: "Activity type" },
  { name: "size", type: "number", description: "Token amount" },
  { name: "usdcSize", type: "number", description: "USDC amount" },
  { name: "transactionHash", type: "string", description: "Transaction hash" },
  { name: "price", type: "number", description: "Activity price" },
  { name: "asset", type: "string", description: "Outcome token asset id" },
  { name: "side", type: "string", description: "Trade side" },
  { name: "outcomeIndex", type: "number", description: "Outcome index" },
  { name: "title", type: "string", description: "Market title" },
  { name: "slug", type: "string", description: "Market slug" },
  { name: "icon", type: "string", description: "Market artwork URL" },
  { name: "eventSlug", type: "string", description: "Event slug" },
  { name: "outcome", type: "string", description: "Outcome label" },
  { name: "name", type: "string", description: "User display name" },
  { name: "pseudonym", type: "string", description: "User pseudonym" },
  { name: "bio", type: "string", description: "User profile bio" },
  { name: "profileImage", type: "string", description: "User profile image URL" },
  { name: "profileImageOptimized", type: "string", description: "Optimized profile image URL" },
  { name: "isCombo", type: "boolean", description: "Whether this activity belongs to a combo" },
];

export const POLYMARKET_USER_ACTIVITY_DEFAULT_COLUMNS = [
  "proxyWallet",
  "timestamp",
  "type",
  "title",
  "outcome",
  "side",
  "size",
  "usdcSize",
  "price",
  "transactionHash",
  "conditionId",
];

export function emptyPolymarketUserActivityComposeState() {
  return {
    addresses: "",
    market: "",
    eventId: "",
    types: [],
    excludeDepositsWithdrawals: true,
    start: "",
    end: "",
    limit: 100,
    offset: 0,
    sortBy: "TIMESTAMP",
    sortDirection: "DESC",
    side: "",
  };
}

/** @param {unknown} raw */
export function normalizePolymarketUserActivityComposeState(raw) {
  const base = emptyPolymarketUserActivityComposeState();
  if (!raw || typeof raw !== "object") return base;
  const value = /** @type {Record<string, unknown>} */ (raw);
  const limit = Number(value.limit);
  const offset = Number(value.offset);
  const sortBy = String(value.sortBy || "").toUpperCase();
  const sortDirection = String(value.sortDirection || "").toUpperCase();
  const side = String(value.side || "").toUpperCase();
  return {
    addresses: String(value.addresses || ""),
    market: String(value.market || ""),
    eventId: String(value.eventId || ""),
    types: Array.isArray(value.types)
      ? [...new Set(value.types.map((type) => String(type).toUpperCase()))].filter((type) =>
          POLYMARKET_USER_ACTIVITY_TYPES.includes(type),
        )
      : [],
    excludeDepositsWithdrawals: value.excludeDepositsWithdrawals !== false,
    start: String(value.start || ""),
    end: String(value.end || ""),
    limit: Number.isFinite(limit) ? Math.min(500, Math.max(0, Math.floor(limit))) : 100,
    offset: Number.isFinite(offset) ? Math.min(5000, Math.max(0, Math.floor(offset))) : 0,
    sortBy: ["TIMESTAMP", "TOKENS", "CASH"].includes(sortBy) ? sortBy : "TIMESTAMP",
    sortDirection: sortDirection === "ASC" ? "ASC" : "DESC",
    side: side === "BUY" || side === "SELL" ? side : "",
  };
}

/** @param {ReturnType<typeof emptyPolymarketUserActivityComposeState>} raw */
export function buildPolymarketUserActivityQueryValues(raw) {
  const state = normalizePolymarketUserActivityComposeState(raw);
  const market = state.market.trim();
  const eventId = state.eventId.trim();
  if (market && eventId) {
    throw new Error("Filter by condition IDs or event IDs, not both.");
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
    excludeDepositsWithdrawals: String(state.excludeDepositsWithdrawals),
    limit: String(state.limit),
    offset: String(state.offset),
    sortBy: state.sortBy,
    sortDirection: state.sortDirection,
  };
  if (market) values.market = market;
  if (eventId) values.eventId = eventId;
  if (state.types.length) values.type = state.types.join(",");
  if (start) values.start = start;
  if (end) values.end = end;
  if (state.side) values.side = state.side;
  return values;
}

/** @param {unknown} activity @param {string[]} selectedColumns */
export function projectPolymarketUserActivity(activity, selectedColumns) {
  const source =
    activity && typeof activity === "object"
      ? /** @type {Record<string, unknown>} */ (activity)
      : {};
  const selected = new Set(
    Array.isArray(selectedColumns) && selectedColumns.length
      ? selectedColumns
      : POLYMARKET_USER_ACTIVITY_DEFAULT_COLUMNS,
  );
  const row = {};
  for (const { name } of POLYMARKET_USER_ACTIVITY_COLUMNS) {
    if (selected.has(name)) row[name] = source[name] == null ? "" : source[name];
  }
  return row;
}
