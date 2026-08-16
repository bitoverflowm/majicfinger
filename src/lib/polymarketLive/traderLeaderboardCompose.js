export const POLYMARKET_TRADER_LEADERBOARD_ENDPOINT_ID = "getTraderLeaderboard";

export const POLYMARKET_TRADER_LEADERBOARD_CATEGORY_OPTIONS = [
  "OVERALL",
  "POLITICS",
  "SPORTS",
  "ESPORTS",
  "CRYPTO",
  "CULTURE",
  "MENTIONS",
  "WEATHER",
  "ECONOMICS",
  "TECH",
  "FINANCE",
];

export const POLYMARKET_TRADER_LEADERBOARD_TIME_PERIOD_OPTIONS = [
  "DAY",
  "WEEK",
  "MONTH",
  "ALL",
];

export const POLYMARKET_TRADER_LEADERBOARD_ORDER_OPTIONS = ["PNL", "VOL"];

export const POLYMARKET_TRADER_LEADERBOARD_COLUMNS = [
  { name: "rank", type: "string", description: "Leaderboard rank position" },
  { name: "proxyWallet", type: "string", description: "Trader proxy wallet address" },
  { name: "userName", type: "string", description: "Trader username" },
  { name: "vol", type: "number", description: "Trader volume for the selected period" },
  { name: "pnl", type: "number", description: "Trader profit and loss for the selected period" },
  { name: "profileImage", type: "string", description: "Trader profile image URL" },
  { name: "xUsername", type: "string", description: "Trader X username" },
  { name: "verifiedBadge", type: "boolean", description: "Whether the trader is verified" },
];

export const POLYMARKET_TRADER_LEADERBOARD_DEFAULT_COLUMNS =
  POLYMARKET_TRADER_LEADERBOARD_COLUMNS.map((column) => column.name);

export function emptyPolymarketTraderLeaderboardComposeState() {
  return {
    category: "OVERALL",
    timePeriod: "DAY",
    orderBy: "PNL",
    limit: 25,
    offset: 0,
    user: "",
    userName: "",
  };
}

function normalizeOption(raw, options, fallback) {
  const value = String(raw || "").trim().toUpperCase();
  return options.includes(value) ? value : fallback;
}

function normalizeInteger(raw, fallback, min, max) {
  const value = Math.floor(Number(raw));
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/** @param {unknown} raw */
export function normalizePolymarketTraderLeaderboardComposeState(raw) {
  const source =
    raw && typeof raw === "object" ? /** @type {Record<string, unknown>} */ (raw) : {};
  return {
    category: normalizeOption(
      source.category,
      POLYMARKET_TRADER_LEADERBOARD_CATEGORY_OPTIONS,
      "OVERALL",
    ),
    timePeriod: normalizeOption(
      source.timePeriod,
      POLYMARKET_TRADER_LEADERBOARD_TIME_PERIOD_OPTIONS,
      "DAY",
    ),
    orderBy: normalizeOption(source.orderBy, POLYMARKET_TRADER_LEADERBOARD_ORDER_OPTIONS, "PNL"),
    limit: normalizeInteger(source.limit, 25, 1, 50),
    offset: normalizeInteger(source.offset, 0, 0, 1000),
    user: String(source.user || "").trim(),
    userName: String(source.userName || "").trim(),
  };
}

/** @param {unknown} raw */
export function buildPolymarketTraderLeaderboardQueryValues(raw) {
  const state = normalizePolymarketTraderLeaderboardComposeState(raw);
  const values = {
    category: state.category,
    timePeriod: state.timePeriod,
    orderBy: state.orderBy,
    limit: String(state.limit),
    offset: String(state.offset),
  };
  if (state.user) values.user = state.user;
  if (state.userName) values.userName = state.userName;
  return values;
}

/**
 * @param {unknown} payload
 * @param {string[]} selectedColumns
 */
export function projectPolymarketTraderLeaderboardEntry(payload, selectedColumns) {
  const source =
    payload && typeof payload === "object"
      ? /** @type {Record<string, unknown>} */ (payload)
      : {};
  const selected = new Set(
    Array.isArray(selectedColumns) && selectedColumns.length
      ? selectedColumns
      : POLYMARKET_TRADER_LEADERBOARD_DEFAULT_COLUMNS,
  );
  const row = {};
  for (const { name } of POLYMARKET_TRADER_LEADERBOARD_COLUMNS) {
    if (selected.has(name)) row[name] = source[name] == null ? "" : source[name];
  }
  return row;
}
