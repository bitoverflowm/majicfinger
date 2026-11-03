import { ATHENA_SUBSCRIBER_QUERY_ROW_LIMIT } from "@/config/dataLakeParquetSamples";

/**
 * Recipes pull a market's full trade history on every plan, signed in or not, because downloads
 * stay blocked. Only two query shapes are lifted, each for one market and with no aggregates:
 * every trade for one Kalshi ticker, and every fill for one Polymarket market's outcome tokens.
 */
export const RECIPE_TRADE_HISTORY = "kalshiTradeHistory";
export const RECIPE_POLYMARKET_TRADE_HISTORY = "polymarketTradeHistory";
export const RECIPE_TRADE_ROW_LIMIT = ATHENA_SUBSCRIBER_QUERY_ROW_LIMIT;

/** A Polymarket market has one token per outcome, and every CLOB market is binary. */
const POLYMARKET_MARKET_TOKENS = 2;

function onlyKeys(value, allowed) {
  return value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).every((key) => allowed.includes(key));
}

function isSingleTickerFilter(filters) {
  if (!onlyKeys(filters, ["and", "or"])) return false;
  if (Array.isArray(filters.or) && filters.or.length) return false;
  const and = Array.isArray(filters.and) ? filters.and : [];
  if (and.length !== 1) return false;
  const [rule] = and;
  return (
    onlyKeys(rule, ["column", "kind", "op", "value"]) &&
    rule.column === "ticker" &&
    rule.op === "eq" &&
    typeof rule.value === "string" &&
    rule.value.trim().length > 0
  );
}

function isPlainTradeSelect(compose) {
  if (!onlyKeys(compose, ["select", "groupByAliases", "orderBy"])) return false;
  if (Array.isArray(compose.groupByAliases) && compose.groupByAliases.length) return false;
  const select = Array.isArray(compose.select) ? compose.select : [];
  if (!select.length) return false;
  if (!select.every((entry) => onlyKeys(entry, ["column", "alias"]) && typeof entry.column === "string")) return false;
  const orderBy = Array.isArray(compose.orderBy) ? compose.orderBy : [];
  return orderBy.every((entry) => onlyKeys(entry, ["alias", "direction"]));
}

/** Exchange-taker fills left out, then any fill whose maker or taker asset is one of the market's tokens. */
function isSingleMarketTokenFilter(filters) {
  if (!onlyKeys(filters, ["and", "or"])) return false;
  const and = Array.isArray(filters.and) ? filters.and : [];
  if (and.length !== 1) return false;
  const [exchanges] = and;
  if (
    !onlyKeys(exchanges, ["column", "kind", "op", "value"]) ||
    exchanges.column !== "taker" ||
    exchanges.op !== "not_in" ||
    typeof exchanges.value !== "string"
  ) {
    return false;
  }
  const or = Array.isArray(filters.or) ? filters.or : [];
  if (!or.length) return false;
  const tokens = new Set();
  for (const rule of or) {
    if (!onlyKeys(rule, ["column", "kind", "op", "value"])) return false;
    if (rule.column !== "maker_asset_id" && rule.column !== "taker_asset_id") return false;
    if (rule.op !== "eq" || typeof rule.value !== "string" || !/^\d{2,}$/.test(rule.value)) return false;
    tokens.add(rule.value);
  }
  return tokens.size <= POLYMARKET_MARKET_TOKENS;
}

function isPlainFillSelect(compose) {
  if (!onlyKeys(compose, ["select", "joins", "groupByAliases", "orderBy"])) return false;
  if (Array.isArray(compose.groupByAliases) && compose.groupByAliases.length) return false;
  const joins = Array.isArray(compose.joins) ? compose.joins : [];
  if (joins.length !== 1) return false;
  const [join] = joins;
  if (
    !onlyKeys(join, ["table", "joinType", "on"]) ||
    join.table !== "blocks" ||
    join.joinType !== "left" ||
    !onlyKeys(join.on, ["leftColumn", "rightColumn"]) ||
    join.on.leftColumn !== "block_number" ||
    join.on.rightColumn !== "block_number"
  ) {
    return false;
  }
  const select = Array.isArray(compose.select) ? compose.select : [];
  if (!select.length) return false;
  const plain = (entry) =>
    onlyKeys(entry, ["column", "alias", "sourceTable"]) &&
    typeof entry.column === "string" &&
    (entry.sourceTable == null || entry.sourceTable === "blocks");
  if (!select.every(plain)) return false;
  const orderBy = Array.isArray(compose.orderBy) ? compose.orderBy : [];
  return orderBy.every((entry) => onlyKeys(entry, ["alias", "direction"]));
}

function isPolymarketTradeHistoryQuery(body) {
  if (String(body.lake || "").toLowerCase() !== "polymarket") return false;
  return isSingleMarketTokenFilter(body.filters) && isPlainFillSelect(body.compose);
}

function isKalshiTradeHistoryQuery(body) {
  if (String(body.lake || "").toLowerCase() !== "kalshi") return false;
  return isSingleTickerFilter(body.filters) && isPlainTradeSelect(body.compose);
}

export function isRecipeTradeHistoryQuery(body) {
  if (!body || typeof body !== "object") return false;
  if (String(body.table || "").toLowerCase() !== "trades") return false;
  if (String(body.queryType || "").toLowerCase() !== "compose") return false;
  if (body.randomSample != null) return false;
  if (body.recipe === RECIPE_TRADE_HISTORY) return isKalshiTradeHistoryQuery(body);
  if (body.recipe === RECIPE_POLYMARKET_TRADE_HISTORY) return isPolymarketTradeHistoryQuery(body);
  return false;
}

/** Lifts the plan's row caps for a recipe's trade history query. Any other query keeps `access`. */
export function recipeLakeAccess(body, access) {
  if (!isRecipeTradeHistoryQuery(body)) return access;
  const base = access && typeof access === "object" ? access : {};
  return {
    ...base,
    maxSelectRows: Math.max(Number(base.maxSelectRows) || 0, RECIPE_TRADE_ROW_LIMIT),
    maxComposeRows: Math.max(Number(base.maxComposeRows) || 0, RECIPE_TRADE_ROW_LIMIT),
  };
}
