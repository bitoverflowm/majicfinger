import { ATHENA_SUBSCRIBER_QUERY_ROW_LIMIT } from "@/config/dataLakeParquetSamples";

/**
 * Recipes pull a market's full trade history on every plan, signed in or not, because downloads
 * stay blocked. Only one query shape is lifted: every trade for one Kalshi ticker, no aggregates.
 */
export const RECIPE_TRADE_HISTORY = "kalshiTradeHistory";
export const RECIPE_TRADE_ROW_LIMIT = ATHENA_SUBSCRIBER_QUERY_ROW_LIMIT;

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

export function isRecipeTradeHistoryQuery(body) {
  if (!body || typeof body !== "object" || body.recipe !== RECIPE_TRADE_HISTORY) return false;
  if (String(body.lake || "").toLowerCase() !== "kalshi") return false;
  if (String(body.table || "").toLowerCase() !== "trades") return false;
  if (String(body.queryType || "").toLowerCase() !== "compose") return false;
  if (body.randomSample != null) return false;
  return isSingleTickerFilter(body.filters) && isPlainTradeSelect(body.compose);
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
