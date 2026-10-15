/**
 * Query controls for Polymarket market pulls that start from a picked market.
 * Outcome, side, interval, and the trade window are the request.
 * Orderbook depth is not an API parameter. The book comes back whole.
 * They sit above the response columns and are not columns on the sheet.
 */

import { selectLastTradePriceOutcomeTokens } from "@/lib/polymarketLive/lastTradePricesCompose";

export const POLYMARKET_QUOTE_TABLES = [
  "getOrderbooks",
  "getMarketPrices",
  "getMidpointPrices",
  "getSpreads",
  "getTickSize",
  "getLastTradePrices",
  "getBatchPricesHistory",
  "getTokenPriceHistory",
  "getTradesByMarket",
  "getOpenInterestCompose",
  "getHoldersByMarkets",
];

/** CLOB and Data API both reject an explicit window longer than this. */
export const POLYMARKET_PRICES_HISTORY_MAX_SPAN_SEC = 15 * 24 * 3600;

/** Presets whose window fits inside the 15-day start/end cap. */
export const POLYMARKET_TOKEN_HISTORY_PRESET_IDS = ["past-24h", "past-3d", "past-7d"];

const OUTCOME_OPTIONS = [
  ["both", "Yes and No"],
  ["yes", "Yes"],
  ["no", "No"],
];

const INTERVAL_OPTIONS = [
  ["1h", "1 hour"],
  ["6h", "6 hours"],
  ["1d", "1 day"],
  ["1w", "1 week"],
  ["1m", "1 month"],
  ["all", "All"],
  ["max", "Max"],
];

const FIDELITY_OPTIONS = [
  ["1", "Minute"],
  ["60", "Hourly"],
  ["1440", "Daily"],
];

const TRADE_SIDE_OPTIONS = [
  ["", "Any"],
  ["BUY", "Buy"],
  ["SELL", "Sell"],
];

const YES_NO = [
  ["true", "Yes"],
  ["false", "No"],
];

const SIDE_ENUM = [
  ["BUY", "Buy"],
  ["SELL", "Sell"],
];

const COLUMN_TYPES = {
  price: "number",
  size: "number",
  buy_price: "number",
  sell_price: "number",
  midpoint_price: "number",
  spread: "number",
  last_trade_price: "number",
  p: "number",
  t: "number",
  price: "number",
  resolution_seconds: "number",
  value: "number",
  outcomeIndex: "number",
  min_order_size: "number",
  tick_size: "number",
  minimum_tick_size: "number",
  neg_risk: "boolean",
  timestamp: "date",
  amount: "number",
  outcome_index: "number",
  display_username_public: "boolean",
  verified: "boolean",
  avg_price: "number",
  entry_cost_usdc: "number",
  current_price: "number",
  current_value: "number",
  realized_pnl: "number",
  unrealized_pnl: "number",
  total_pnl: "number",
};

const DEFAULT_COLUMNS = {
  getOrderbooks: ["side", "price", "size", "outcome", "market_title", "last_trade_price"],
  getMarketPrices: ["market_title", "outcome", "buy_price", "sell_price", "token_id", "market_slug"],
  getMidpointPrices: ["market_title", "outcome", "midpoint_price", "token_id", "condition_id", "market_slug"],
  getSpreads: ["market_title", "outcome", "spread", "token_id", "condition_id", "market_slug"],
  getTickSize: ["market_title", "outcome", "minimum_tick_size", "token_id", "condition_id", "market_slug"],
  getLastTradePrices: ["market_title", "outcome", "last_trade_price", "last_trade_side", "token_id", "market_slug"],
  getBatchPricesHistory: ["market_title", "outcome", "timestamp", "p", "t", "token_id"],
  getTokenPriceHistory: ["market_title", "outcome", "observed_at", "price", "resolution_seconds", "timestamp"],
  getTradesByMarket: ["observed_at", "outcome", "side", "price", "size", "title"],
  getOpenInterestCompose: ["market_title", "value", "market", "market_slug"],
  getHoldersByMarkets: ["market_title", "outcome", "name", "amount", "proxy_wallet", "pseudonym"],
};

/**
 * @param {string} tableId
 */
export function isPolymarketQuoteTable(tableId) {
  return POLYMARKET_QUOTE_TABLES.includes(String(tableId || ""));
}

/**
 * @param {string} tableId
 * @returns {string[]}
 */
export function polymarketQuoteDefaultColumns(tableId) {
  return DEFAULT_COLUMNS[tableId] || [];
}

/**
 * @param {string} columnId
 * @returns {string}
 */
export function polymarketQuoteColumnType(columnId) {
  return COLUMN_TYPES[columnId] || "";
}

function outcomeControl(description) {
  return {
    id: "quote_outcome",
    title: "Outcome",
    type: "text",
    queryOnly: true,
    control: "period",
    ariaLabel: "Outcome",
    enumOptions: OUTCOME_OPTIONS,
    description,
  };
}

/**
 * Smallest fidelity, in minutes, that this interval actually serves.
 * 1 week rejects anything under 5. 1 month rejects anything under 10.
 * All and max accept a finer value and then serve 10 minutes anyway.
 * A start/end window accepts 1 minute through the 15-day cap.
 * @param {unknown} interval
 * @param {boolean} hasRange
 */
export function polymarketHistoryFidelityFloor(interval, hasRange) {
  if (hasRange) return 1;
  const value = String(interval || "").trim().toLowerCase();
  if (value === "1w") return 5;
  if (value === "1m" || value === "all" || value === "max") return 10;
  return 1;
}

/**
 * @param {unknown} interval
 * @param {boolean} hasRange
 */
export function polymarketHistoryFidelityOptions(interval, hasRange) {
  const floor = polymarketHistoryFidelityFloor(interval, hasRange);
  return FIDELITY_OPTIONS.filter((option) => Number(option[0]) >= floor);
}

/**
 * A price-history pull uses an interval or a start and end, and the fidelity
 * has to be one this window can actually serve.
 * @param {Record<string, any> | null | undefined} previous
 * @param {Record<string, any> | null | undefined} next
 */
export function exclusivePriceHistoryFilters(previous, next) {
  const before = previous || {};
  const incoming = next || {};
  const beforeRange = before.time_range || {};
  const incomingRange = incoming.time_range || {};
  const rangeOn = Boolean(incomingRange.from && incomingRange.to);
  const rangeChanged =
    rangeOn &&
    (incomingRange.from !== beforeRange.from ||
      incomingRange.to !== beforeRange.to ||
      String(incomingRange.preset || "") !== String(beforeRange.preset || ""));
  const intervalChanged =
    String(incoming.interval?.value || "") !== String(before.interval?.value || "") &&
    String(incoming.interval?.value || "") !== "";
  let settled = incoming;
  if (intervalChanged && !rangeChanged) {
    settled = { ...settled, time_range: { from: "", to: "", preset: "" } };
  } else if (rangeOn) {
    settled = { ...settled, interval: { value: "" } };
  }
  const hasRange = Boolean(settled.time_range?.from && settled.time_range?.to);
  const options = polymarketHistoryFidelityOptions(String(settled.interval?.value || "1d"), hasRange)
    .map(([value]) => value)
    .filter(Boolean);
  const fidelity = String(settled.fidelity?.value || "");
  if (options.includes(fidelity)) return settled;
  return { ...settled, fidelity: { ...(settled.fidelity || {}), value: options[0] || "1440" } };
}

/**
 * @param {Record<string, any>} [filters]
 */
function historyHasRange(filters) {
  return Boolean(filters?.time_range?.from && filters?.time_range?.to);
}

/**
 * @param {Record<string, any>} [filters]
 */
function historyControls(filters) {
  const interval = String(filters?.interval?.value || "1d");
  return [
    outcomeControl("Yes, No, or both outcome tokens."),
    {
      id: "interval",
      title: "Interval",
      type: "text",
      queryOnly: true,
      control: "period",
      ariaLabel: "Interval",
      enumOptions: INTERVAL_OPTIONS,
      description: "A preset time range looking backward from now. 1 day is the last 24 hours, 1 week is the last week, and max is all available history.",
    },
    {
      id: "time_range",
      title: "Date range",
      type: "date",
      queryOnly: true,
      control: "query-range",
      description: "A specific start and end datetime, supplied as Unix timestamps in seconds. Dates before this market was created stay unavailable.",
    },
    {
      id: "fidelity",
      title: "Fidelity",
      type: "text",
      queryOnly: true,
      control: "period",
      ariaLabel: "Fidelity",
      enumOptions: polymarketHistoryFidelityOptions(interval, historyHasRange(filters)),
      description: "The spacing of each price point: minute, hourly, or daily.",
    },
  ];
}

/**
 * Smallest bucket, in seconds, that this token-history window accepts.
 * A start/end window accepts 1 minute. 1 week floors at 5 minutes.
 * 1 month, all, and max floor at 10 minutes.
 * @param {unknown} interval
 * @param {boolean} hasRange
 */
export function polymarketTokenBucketFloor(interval, hasRange) {
  if (hasRange) return 60;
  const value = String(interval || "").trim().toLowerCase();
  if (value === "1w") return 300;
  if (value === "1m" || value === "all" || value === "max") return 600;
  return 60;
}

const TOKEN_BUCKET_OPTIONS = [
  ["", "Default"],
  ["60", "1 minute"],
  ["300", "5 minutes"],
  ["600", "10 minutes"],
  ["1800", "30 minutes"],
  ["10800", "3 hours"],
  ["43200", "12 hours"],
  ["86400", "1 day"],
];

/** Max and all only reach past 30 days at these widths. */
const WHOLE_LIFE_BUCKETS = new Set(["", "10800", "43200", "86400"]);

/**
 * How far back each fine width is kept. Coarser widths are kept for good.
 * These are the documented minimums, in seconds.
 */
const TOKEN_BUCKET_RETENTION_SEC = {
  60: 7 * 86400,
  300: 60 * 86400,
  600: 60 * 86400,
  1800: 90 * 86400,
};

function tokenBucketReaches(seconds, windowStart) {
  const kept = TOKEN_BUCKET_RETENTION_SEC[seconds];
  if (!kept || !(Number(windowStart) > 0)) return true;
  return Math.floor(Date.now() / 1000) - Number(windowStart) <= kept;
}

/**
 * Widths this window can actually serve. A width finer than the data kept
 * for the window's start comes back empty, so it is not offered.
 * @param {unknown} interval
 * @param {boolean} hasRange
 * @param {boolean} hasAsOf
 * @param {number} [windowStart] epoch seconds
 */
export function polymarketTokenBucketOptions(interval, hasRange, hasAsOf, windowStart) {
  if (hasAsOf) return [["", "Default"]];
  const value = String(interval || "").trim().toLowerCase();
  if (!hasRange && (value === "max" || value === "all")) {
    return TOKEN_BUCKET_OPTIONS.filter((option) => WHOLE_LIFE_BUCKETS.has(option[0]));
  }
  const floor = polymarketTokenBucketFloor(interval, hasRange);
  return TOKEN_BUCKET_OPTIONS.filter(
    (option) => !option[0] || (Number(option[0]) >= floor && tokenBucketReaches(Number(option[0]), windowStart)),
  );
}

/**
 * Where this token-history window starts, in epoch seconds. 0 when unknown or unbounded.
 * @param {Record<string, any>} [filters]
 * @param {{ closed?: boolean; endedAt?: number; startedAt?: number } | null} [market]
 */
export function polymarketTokenHistoryWindowStart(filters, market) {
  let params;
  try {
    params = polymarketTokenHistoryParams({ ...(filters || {}), bucket_seconds: { value: "" } }, market);
  } catch {
    return 0;
  }
  if (params.start) return Number(params.start);
  const span = INTERVAL_SPAN_SEC[params.interval];
  return span ? Math.floor(Date.now() / 1000) - span : 0;
}

/**
 * @param {Record<string, any>} [filters]
 * @param {{ closed?: boolean; endedAt?: number; startedAt?: number } | null} [market]
 */
function tokenHistoryControls(filters, market) {
  const interval = String(filters?.interval?.value || "1d");
  const hasRange = historyHasRange(filters);
  const hasAsOf = Boolean(String(filters?.as_of?.value || "").trim());
  return [
    outcomeControl("Yes, No, or both outcome tokens."),
    {
      id: "interval",
      title: "Interval",
      type: "text",
      queryOnly: true,
      control: "period",
      ariaLabel: "Interval",
      enumOptions: INTERVAL_OPTIONS,
      description: "A window looking back from now, or from when a closed market stopped trading. All and max cover the market's whole life. Shorter intervals on a closed market stop at 15 days.",
    },
    {
      id: "time_range",
      title: "Date range",
      type: "date",
      queryOnly: true,
      control: "query-range",
      rangePresetIds: POLYMARKET_TOKEN_HISTORY_PRESET_IDS,
      rangeMaxDays: 15,
      description: "A start and end date, at most 15 days apart, inside the market's life. Use max for anything longer.",
    },
    {
      id: "bucket_seconds",
      title: "Bucket",
      type: "text",
      queryOnly: true,
      control: "period",
      ariaLabel: "Bucket",
      enumOptions: polymarketTokenBucketOptions(interval, hasRange, hasAsOf, polymarketTokenHistoryWindowStart(filters, market)),
      description: "The width of each point. Default lets Polymarket pick one that fits the window. Fine widths are kept only for recent weeks, so older windows offer coarser ones.",
    },
    {
      id: "as_of",
      title: "As of",
      type: "date",
      queryOnly: true,
      control: "query-instant",
      description: "One price: the last one at or before the end of this day.",
    },
  ];
}

/**
 * A token-history pull uses exactly one window: an interval, a date range, or an as-of day.
 * The one just changed wins. The bucket has to be one that window can serve.
 * @param {Record<string, any> | null | undefined} previous
 * @param {Record<string, any> | null | undefined} next
 * @param {{ closed?: boolean; endedAt?: number; startedAt?: number } | null} [market]
 */
export function exclusiveTokenHistoryFilters(previous, next, market) {
  const before = previous || {};
  const incoming = next || {};
  const range = incoming.time_range || {};
  const beforeRange = before.time_range || {};
  const rangeOn = Boolean(range.from && range.to);
  const asOf = String(incoming.as_of?.value || "").trim();
  const interval = String(incoming.interval?.value || "").trim();
  const asOfChanged = Boolean(asOf) && asOf !== String(before.as_of?.value || "").trim();
  const rangeChanged =
    rangeOn &&
    (range.from !== beforeRange.from || range.to !== beforeRange.to || String(range.preset || "") !== String(beforeRange.preset || ""));
  const intervalChanged = Boolean(interval) && interval !== String(before.interval?.value || "").trim();
  const winner = asOfChanged
    ? "as_of"
    : rangeChanged
      ? "range"
      : intervalChanged
        ? "interval"
        : asOf
          ? "as_of"
          : rangeOn
            ? "range"
            : "interval";
  const noRange = { from: "", to: "", preset: "" };
  let settled = incoming;
  if (winner === "as_of") settled = { ...settled, interval: { value: "" }, time_range: noRange };
  else if (winner === "range") settled = { ...settled, interval: { value: "" }, as_of: { value: "" } };
  else settled = { ...settled, time_range: noRange, as_of: { value: "" } };
  const options = polymarketTokenBucketOptions(
    String(settled.interval?.value || "1d"),
    historyHasRange(settled),
    Boolean(String(settled.as_of?.value || "").trim()),
    polymarketTokenHistoryWindowStart(settled, market),
  ).map(([value]) => value);
  const bucket = String(settled.bucket_seconds?.value || "");
  if (options.includes(bucket)) return settled;
  return { ...settled, bucket_seconds: { value: "" } };
}

export const TOKEN_PRICE_HISTORY_COLUMNS = [
  { name: "market_id", type: "string", description: "Gamma market id" },
  { name: "market_title", type: "string", description: "Market question / title" },
  { name: "market_slug", type: "string", description: "Market slug" },
  { name: "condition_id", type: "string", description: "Market condition id" },
  { name: "token_id", type: "string", description: "CLOB outcome token / asset id" },
  { name: "outcome", type: "string", description: "Selected outcome label" },
  { name: "observed_at", type: "string", description: "When this price was observed, in UTC" },
  { name: "price", type: "number", description: "Price from 0 to 1" },
  { name: "resolution_seconds", type: "number", description: "Width of the window this price was observed in. 0 is an exact tick." },
  { name: "timestamp", type: "string", description: "That same observation time, in epoch seconds" },
];

export const TICK_SIZE_COLUMNS = [
  { name: "market_id", type: "string", description: "Market id" },
  { name: "market_title", type: "string", description: "Market question" },
  { name: "market_slug", type: "string", description: "Market slug" },
  { name: "condition_id", type: "string", description: "Market condition id" },
  { name: "token_id", type: "string", description: "CLOB outcome token" },
  { name: "outcome", type: "string", description: "Selected outcome label" },
  { name: "minimum_tick_size", type: "number", description: "Smallest price step for this outcome" },
];

export const TRADE_COLUMNS = [
  { name: "market_id", type: "string", description: "Market id" },
  { name: "market_title", type: "string", description: "Market question" },
  { name: "market_slug", type: "string", description: "Market slug" },
  { name: "title", type: "string", description: "Market question on the trade" },
  { name: "slug", type: "string", description: "Market slug on the trade" },
  { name: "event_slug", type: "string", description: "Parent event slug" },
  { name: "condition_id", type: "string", description: "Market condition id" },
  { name: "token_id", type: "string", description: "CLOB outcome token that traded" },
  { name: "outcome", type: "string", description: "Outcome that traded" },
  { name: "outcome_index", type: "number", description: "Index of that outcome. 999 means it could not be labeled." },
  { name: "side", type: "string", description: "BUY or SELL, from the wallet that filled" },
  { name: "price", type: "number", description: "Execution price per share" },
  { name: "size", type: "number", description: "Filled quantity in shares" },
  { name: "observed_at", type: "string", description: "When the trade settled, in UTC" },
  { name: "timestamp", type: "string", description: "That same settlement time, in epoch seconds" },
  { name: "proxy_wallet", type: "string", description: "Wallet that filled the trade" },
  { name: "name", type: "string", description: "Display name of that wallet" },
  { name: "pseudonym", type: "string", description: "Generated handle when the wallet has no display name" },
  { name: "transaction_hash", type: "string", description: "Hash of the settling transaction" },
];

export const HOLDER_COLUMNS = [
  { name: "market_title", type: "string", description: "Market question" },
  { name: "outcome", type: "string", description: "Outcome this holder is in" },
  { name: "name", type: "string", description: "Display name of that wallet" },
  { name: "amount", type: "number", description: "Shares held. With profit on, this is the size of that side." },
  { name: "proxy_wallet", type: "string", description: "Wallet that holds the position" },
  { name: "pseudonym", type: "string", description: "Generated handle when the wallet has no display name" },
  { name: "market_id", type: "string", description: "Market id" },
  { name: "market_slug", type: "string", description: "Market slug" },
  { name: "condition_id", type: "string", description: "Market condition id" },
  { name: "token_id", type: "string", description: "Outcome token this position is in" },
  { name: "outcome_index", type: "number", description: "Index of that outcome. 999 means it could not be labeled." },
  { name: "bio", type: "string", description: "Profile bio" },
  { name: "display_username_public", type: "boolean", description: "Whether the display name is public" },
  { name: "profile_image", type: "string", description: "Profile image URL" },
  { name: "profile_image_optimized", type: "string", description: "Optimized profile image. This endpoint leaves it empty." },
  { name: "verified", type: "boolean", description: "Whether the profile is verified" },
  { name: "avg_price", type: "number", description: "Average entry price. Present when profit is included." },
  { name: "entry_cost_usdc", type: "number", description: "Cost of the position in USDC. Present when profit is included." },
  { name: "current_price", type: "number", description: "Current price of the outcome. Present when profit is included." },
  { name: "current_value", type: "number", description: "Current value of the position. Present when profit is included." },
  { name: "realized_pnl", type: "number", description: "Profit already taken. Present when profit is included." },
  { name: "unrealized_pnl", type: "number", description: "Profit still in the position. Present when profit is included." },
  { name: "total_pnl", type: "number", description: "Realized plus unrealized profit. Present when profit is included." },
];

function holderControls() {
  return [
    outcomeControl("Yes, No, or both outcomes."),
    {
      id: "min_balance",
      title: "Minimum balance",
      type: "number",
      queryOnly: true,
      control: "query-number",
      ariaLabel: "Minimum balance",
      description: "Smallest position to include, in shares. Blank uses 0.",
    },
    {
      id: "include_pnl",
      title: "Include profit",
      type: "boolean",
      queryOnly: true,
      enumOptions: YES_NO,
      description: "Adds average price, entry cost, current value, and profit. At most 100 holders per outcome.",
    },
  ];
}

function tradeControls() {
  return [
    outcomeControl("Yes, No, or both outcomes."),
    {
      id: "time_range",
      title: "Date range",
      type: "date",
      queryOnly: true,
      control: "query-range",
      description:
        "Trades settled from the start of the first day through the end of the last. Blank is every trade, newest first. A market's feed reaches back three years. With a wallet set it reaches the whole history.",
    },
    {
      id: "trade_user",
      title: "Wallet",
      type: "text",
      queryOnly: true,
      control: "query-text",
      ariaLabel: "Trader wallet",
      description: "Only this wallet's trades in the market. A 0x address of 40 hex characters.",
    },
    {
      id: "trade_side",
      title: "Side",
      type: "text",
      queryOnly: true,
      control: "period",
      ariaLabel: "Trade side",
      enumOptions: TRADE_SIDE_OPTIONS,
      description: "Buy, sell, or either.",
    },
    {
      id: "taker_only",
      title: "Taker only",
      type: "boolean",
      queryOnly: true,
      enumOptions: YES_NO,
      description: "Each fill once, on the side that took liquidity.",
    },
    {
      id: "filter_type",
      title: "Size unit",
      type: "text",
      queryOnly: true,
      control: "period",
      ariaLabel: "Trade size unit",
      enumOptions: [
        ["TOKENS", "Shares"],
        ["CASH", "Cash"],
      ],
      description: "Whether the minimum size is counted in shares or in cash.",
    },
    {
      id: "filter_amount",
      title: "Minimum size",
      type: "number",
      queryOnly: true,
      control: "query-number",
      ariaLabel: "Minimum trade size",
      description: "Smallest trade to include. Blank uses 0.01.",
    },
  ];
}

/**
 * @param {string} tableId
 * @param {Array<Record<string, unknown>>} columns
 * @param {Record<string, any>} [filters]
 * @param {{ closed?: boolean; endedAt?: number; startedAt?: number } | null} [market]
 */
export function polymarketQuoteAttributeColumns(tableId, columns, filters, market) {
  if (!isPolymarketQuoteTable(tableId)) return columns || [];
  const shaped = (columns || []).map((column) => {
    const mapped = polymarketQuoteColumnType(column.id);
    const type = column.type === "text" ? "text" : mapped || column.type;
    const next = { ...column, type };
    if (column.id === "side" || column.id === "last_trade_side") next.enumOptions = SIDE_ENUM;
    if (column.id === "timestamp" && type !== "text") next.dateEpoch = "unix";
    return next;
  });
  if (tableId === "getOrderbooks") {
    return [
      outcomeControl("Yes, No, or both books."),
      {
        id: "book_side",
        title: "Side",
        type: "text",
        queryOnly: true,
        control: "period",
        ariaLabel: "Book side",
        enumOptions: [
          ["both", "Buy and Sell"],
          ["buy", "Buy"],
          ["sell", "Sell"],
        ],
        description: "Bid levels, ask levels, or both.",
      },
      ...shaped,
    ];
  }
  if (tableId === "getMarketPrices" || tableId === "getMidpointPrices" || tableId === "getSpreads" || tableId === "getTickSize" || tableId === "getLastTradePrices") {
    return [outcomeControl("Yes, No, or both outcomes."), ...shaped];
  }
  if (tableId === "getBatchPricesHistory") return [...historyControls(filters), ...shaped];
  if (tableId === "getTokenPriceHistory") return [...tokenHistoryControls(filters, market), ...shaped];
  if (tableId === "getTradesByMarket") return [...tradeControls(), ...shaped];
  if (tableId === "getHoldersByMarkets") return [...holderControls(), ...shaped];
  return shaped;
}

/**
 * Filters for a sheet joined onto a market from another pull.
 * Price history covers the market's whole life, one point per day.
 * Token price history covers the whole life of both outcomes.
 * Trade history is every trade on both outcomes, with no date window and no size floor.
 * @param {string} tableId
 */
export function polymarketJoinQuoteFilters(tableId) {
  const filters = defaultPolymarketQuoteFilters(tableId);
  if (tableId === "getBatchPricesHistory") {
    return { ...filters, interval: { value: "max" }, fidelity: { value: "1440" } };
  }
  if (tableId === "getTokenPriceHistory") {
    return { ...filters, quote_outcome: { value: "both" }, interval: { value: "max" } };
  }
  if (tableId === "getTradesByMarket") {
    return { ...filters, quote_outcome: { value: "both" }, filter_amount: { value: "0" } };
  }
  return filters;
}

/**
 * @param {string} tableId
 */
export function defaultPolymarketQuoteFilters(tableId) {
  if (tableId === "getOrderbooks") {
    return {
      quote_outcome: { value: "both" },
      book_side: { value: "both" },
    };
  }
  if (tableId === "getMarketPrices" || tableId === "getMidpointPrices" || tableId === "getSpreads" || tableId === "getTickSize" || tableId === "getLastTradePrices") {
    return { quote_outcome: { value: "both" } };
  }
  if (tableId === "getBatchPricesHistory") {
    return {
      quote_outcome: { value: "yes" },
      interval: { value: "1d" },
      fidelity: { value: "1" },
      time_range: { from: "", to: "", preset: "" },
    };
  }
  if (tableId === "getTokenPriceHistory") {
    return {
      quote_outcome: { value: "yes" },
      interval: { value: "1d" },
      bucket_seconds: { value: "" },
      time_range: { from: "", to: "", preset: "" },
      as_of: { value: "" },
    };
  }
  if (tableId === "getTradesByMarket") {
    return {
      quote_outcome: { value: "both" },
      time_range: { from: "", to: "", preset: "" },
      trade_user: { value: "" },
      trade_side: { value: "" },
      taker_only: { include: ["true"] },
      filter_type: { value: "TOKENS" },
      filter_amount: { value: "" },
    };
  }
  if (tableId === "getHoldersByMarkets") {
    return {
      quote_outcome: { value: "both" },
      min_balance: { value: "" },
      include_pnl: { include: ["false"] },
    };
  }
  return {};
}

/**
 * @param {unknown} rowLimit
 * @param {unknown} planLimit
 * @param {number} fallback
 * @param {number} cap
 */
export function polymarketQuoteTarget(rowLimit, planLimit, fallback = 50, cap = 10000) {
  const requested = Number(rowLimit);
  const plan = Number(planLimit);
  const asked = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : fallback;
  const planCap = Number.isFinite(plan) && plan > 0 ? plan : cap;
  return Math.max(1, Math.min(cap, planCap, asked));
}

/**
 * @param {string} tableId
 * @param {Record<string, any>} filters
 * @param {unknown} rowLimit
 * @param {unknown} planLimit
 */
export function polymarketQuoteRequestKey(tableId, filters, rowLimit, planLimit) {
  if (!isPolymarketQuoteTable(tableId) || tableId === "getOpenInterestCompose") return "";
  const source = filters || {};
  /** @type {Record<string, string | number>} */
  const parts = { outcome: String(source.quote_outcome?.value || "") };
  if (tableId === "getOrderbooks") {
    parts.side = String(source.book_side?.value || "");
  }
  if (tableId === "getBatchPricesHistory") {
    parts.interval = String(source.interval?.value || "");
    parts.fidelity = String(source.fidelity?.value || "");
    parts.from = String(source.time_range?.from || "");
    parts.to = String(source.time_range?.to || "");
    parts.limit = polymarketQuoteTarget(rowLimit, planLimit, 50, 2000);
  }
  if (tableId === "getTokenPriceHistory") {
    parts.interval = String(source.interval?.value || "");
    parts.bucket = String(source.bucket_seconds?.value || "");
    parts.from = String(source.time_range?.from || "");
    parts.to = String(source.time_range?.to || "");
    parts.asOf = String(source.as_of?.value || "");
    parts.limit = polymarketQuoteTarget(rowLimit, planLimit, 50, 10000);
  }
  if (tableId === "getTradesByMarket") {
    parts.side = String(source.trade_side?.value || "");
    parts.taker = Array.isArray(source.taker_only?.include) ? source.taker_only.include.join(",") : "";
    parts.unit = String(source.filter_type?.value || "");
    parts.min = String(source.filter_amount?.value || "");
    parts.from = String(source.time_range?.from || "");
    parts.to = String(source.time_range?.to || "");
    parts.preset = String(source.time_range?.preset || "");
    parts.user = polymarketTradeUser(source);
    parts.limit = polymarketQuoteTarget(rowLimit, planLimit, 50, 10000);
  }
  if (tableId === "getHoldersByMarkets") {
    parts.min = String(source.min_balance?.value || "");
    parts.pnl = Array.isArray(source.include_pnl?.include) ? source.include_pnl.include.join(",") : "";
    parts.limit = polymarketHolderLimit(source, rowLimit, planLimit);
  }
  return JSON.stringify(parts);
}

/**
 * Include profit asks for one extra set of columns and caps the page at 100.
 * @param {Record<string, any>} filters
 */
export function polymarketHolderPnl(filters) {
  const include = Array.isArray(filters?.include_pnl?.include) ? filters.include_pnl.include : [];
  return include.length === 1 && include[0] === "true";
}

/**
 * @param {Record<string, any>} filters
 * @returns {Record<string, string>}
 */
export function polymarketHolderQuery(filters) {
  const amount = String(filters?.min_balance?.value ?? "").trim();
  /** @type {Record<string, string>} */
  const params = {};
  if (amount !== "" && Number.isFinite(Number(amount)) && Number(amount) >= 0) params.min_balance = amount;
  if (polymarketHolderPnl(filters)) params.include_pnl = "true";
  return params;
}

/**
 * Holders per outcome token. Profit pages stop at 100. Every other page stops at 1000.
 * @param {Record<string, any>} filters
 * @param {unknown} rowLimit
 * @param {unknown} planLimit
 */
export function polymarketHolderLimit(filters, rowLimit, planLimit) {
  const cap = polymarketHolderPnl(filters) ? 100 : 1000;
  return polymarketQuoteTarget(rowLimit, planLimit, 50, cap);
}

/**
 * @param {Record<string, any>} filters
 * @returns {"yes" | "no" | "both"}
 */
export function polymarketQuoteOutcome(filters) {
  const value = String(filters?.quote_outcome?.value || "both").trim().toLowerCase();
  if (value === "yes" || value === "no") return value;
  return "both";
}

/**
 * @param {Record<string, any>} filters
 * @returns {"both" | "buy" | "sell"}
 */
export function polymarketBookSide(filters) {
  const value = String(filters?.book_side?.value || "both").trim().toLowerCase();
  if (value === "buy" || value === "sell") return value;
  return "both";
}

const INTERVAL_SPAN_SEC = {
  "1h": 3600,
  "6h": 6 * 3600,
  "1d": 86400,
  "1w": 7 * 86400,
  "1m": 30 * 86400,
};

const PRESET_SPAN_SEC = {
  "past-24h": 86400,
  "past-3d": 3 * 86400,
  "past-7d": 7 * 86400,
  "past-month": 30 * 86400,
};

/**
 * When the market has already stopped trading, history ends there.
 * An end date still in the future belongs to an open market.
 * @param {{ closed?: boolean; endedAt?: number } | null | undefined} market
 * @returns {number | null}
 */
export function polymarketMarketEndedAt(market) {
  if (!market || market.closed === false) return null;
  const seconds = Number(market.endedAt);
  if (!Number.isFinite(seconds) || seconds <= 0) return null;
  const ended = Math.floor(seconds);
  if (ended * 1000 > Date.now()) return null;
  return ended;
}

/**
 * Calendar day of the close, for the date shortcuts in the builder.
 * @param {{ closed?: boolean; endedAt?: number } | null | undefined} market
 * @returns {string}
 */
export function polymarketMarketAnchorDate(market) {
  const ended = polymarketMarketEndedAt(market);
  if (!ended) return "";
  return new Date(ended * 1000).toISOString().slice(0, 10);
}

/**
 * A window that ends when this market stopped, capped for the token-history endpoint.
 * @param {{ closed?: boolean; endedAt?: number; startedAt?: number } | null | undefined} market
 * @param {string} interval
 * @param {number} [cap]
 * @returns {{ start: number; end: number } | null}
 */
function marketLifeWindow(market, interval, cap) {
  const ended = polymarketMarketEndedAt(market);
  if (!ended) return null;
  const started = Number(market?.startedAt);
  const hasStart = Number.isFinite(started) && started > 0 && started < ended;
  const span = interval === "all" || interval === "max"
    ? (hasStart ? ended - started : 365 * 86400)
    : INTERVAL_SPAN_SEC[interval];
  if (!span) return null;
  const width = cap ? Math.min(span, cap) : span;
  const start = Math.max(hasStart ? started : 0, ended - width);
  return { start, end: ended };
}

function dayUnix(iso, edge) {
  const [year, month, day] = String(iso || "").split("-").map(Number);
  if (!year || !month || !day) return null;
  const date = edge === "end" ? new Date(year, month - 1, day, 23, 59, 59) : new Date(year, month - 1, day, 0, 0, 0);
  const seconds = Math.floor(date.getTime() / 1000);
  return Number.isFinite(seconds) ? seconds : null;
}

/**
 * @param {Record<string, any>} filters
 * @param {{ closed?: boolean; endedAt?: number; startedAt?: number } | null} [market]
 */
export function polymarketHistoryBody(filters, market) {
  const preset = String(filters?.time_range?.preset || "");
  const ended = polymarketMarketEndedAt(market);
  const presetSpan = PRESET_SPAN_SEC[preset];
  const explicitStart = dayUnix(filters?.time_range?.from, "start");
  const explicitEnd = dayUnix(filters?.time_range?.to, "end");
  const hasExplicitRange = Boolean(explicitStart && explicitEnd && explicitEnd > explicitStart);
  const interval = String(filters?.interval?.value || "1d").trim();
  /** @type {Record<string, string | number>} */
  const body = {};
  if (preset && ended && presetSpan) {
    body.start_ts = Math.max(0, ended - presetSpan);
    body.end_ts = ended;
  } else if (hasExplicitRange) {
    body.start_ts = explicitStart;
    body.end_ts = explicitEnd;
  } else {
    const life = marketLifeWindow(market, interval);
    if (life) {
      body.start_ts = life.start;
      body.end_ts = life.end;
    } else if (interval) {
      body.interval = interval;
    }
  }
  const derived = body.start_ts != null && Boolean(ended) && !hasExplicitRange;
  const floor = polymarketHistoryFidelityFloor(interval, hasExplicitRange && !derived);
  const asked = Number(filters?.fidelity?.value);
  const fidelity = Number.isFinite(asked) && asked > 0 ? Math.floor(asked) : 0;
  const used = fidelity > 0 ? Math.max(fidelity, floor) : derived ? Math.max(floor, 1) : floor > 1 ? floor : 0;
  if (used > 0) body.fidelity = used;
  return body;
}

/**
 * One window per request: as_of, or start with an optional end, or interval.
 * A closed market's interval ends when that market stopped trading.
 * All and max already serve the market's whole life, open or closed.
 * A bucket finer than the data kept for this window is left to the server.
 * @param {Record<string, any>} filters
 * @param {{ closed?: boolean; endedAt?: number; startedAt?: number } | null} [market]
 * @returns {Record<string, string>}
 */
export function polymarketTokenHistoryParams(filters, market) {
  const asOf = dayUnix(filters?.as_of?.value, "end");
  const start = dayUnix(filters?.time_range?.from, "start");
  const end = dayUnix(filters?.time_range?.to, "end");
  const interval = String(filters?.interval?.value || "1d").trim();
  const preset = String(filters?.time_range?.preset || "");
  const ended = polymarketMarketEndedAt(market);
  const presetSpan = PRESET_SPAN_SEC[preset];
  /** @type {Record<string, string>} */
  const params = {};
  if (asOf) {
    params.as_of = String(asOf);
    return params;
  }
  const now = Math.floor(Date.now() / 1000);
  const hasExplicitRange = Boolean(start && (!end || end > start));
  if (preset && ended && presetSpan) {
    const width = Math.min(presetSpan, POLYMARKET_PRICES_HISTORY_MAX_SPAN_SEC);
    params.start = String(Math.max(0, ended - width));
    params.end = String(ended);
  } else if (hasExplicitRange) {
    const windowEnd = end && end > start ? end : now;
    if (windowEnd - start > POLYMARKET_PRICES_HISTORY_MAX_SPAN_SEC) {
      throw new Error("A start and end window can cover at most 15 days. Use the 1 month or max interval for a longer history.");
    }
    params.start = String(start);
    if (end && end > start) params.end = String(end);
  } else if (interval === "max" || interval === "all") {
    params.interval = interval;
  } else {
    const life = marketLifeWindow(market, interval, POLYMARKET_PRICES_HISTORY_MAX_SPAN_SEC);
    if (life) {
      params.start = String(life.start);
      params.end = String(life.end);
    } else if (interval) {
      params.interval = interval;
    }
  }
  const derived = Boolean(params.start) && !hasExplicitRange;
  const floor = polymarketTokenBucketFloor(interval, Boolean(params.start) && !derived);
  const asked = Number(filters?.bucket_seconds?.value);
  if (Number.isFinite(asked) && asked > 0) {
    const bucket = Math.max(60, floor, Math.min(86400, Math.floor(asked)));
    const windowStart = params.start ? Number(params.start) : INTERVAL_SPAN_SEC[params.interval] ? now - INTERVAL_SPAN_SEC[params.interval] : 0;
    const wholeLife = Boolean(params.interval) && (params.interval === "max" || params.interval === "all");
    const served = wholeLife ? WHOLE_LIFE_BUCKETS.has(String(bucket)) : tokenBucketReaches(bucket, windowStart);
    if (served) params.bucket_seconds = String(bucket);
  }
  return params;
}

/** A market's trade feed serves this far back. With a wallet set, it serves the whole history. */
export const POLYMARKET_MARKET_TRADES_MAX_AGE_SEC = 3 * 365 * 86400;

/**
 * @param {Record<string, any> | null | undefined} filters
 * @returns {string}
 */
export function polymarketTradeUser(filters) {
  const value = String(filters?.trade_user?.value || "").trim();
  return /^0x[0-9a-fA-F]{40}$/.test(value) ? value.toLowerCase() : "";
}

/**
 * The trade window in epoch seconds, or null for every trade.
 * A preset is an exact span ending now, or when a closed market stopped trading.
 * The full-history chip is the same as no window.
 * @param {Record<string, any> | null | undefined} filters
 * @param {{ closed?: boolean; endedAt?: number } | null} [market]
 * @param {number} [nowSec]
 * @returns {{ start: number; end: number } | null}
 */
export function polymarketTradeWindow(filters, market, nowSec = Math.floor(Date.now() / 1000)) {
  const range = filters?.time_range || {};
  const preset = String(range.preset || "");
  if (preset === "market-life") return null;
  const presetSpan = PRESET_SPAN_SEC[preset];
  if (presetSpan) {
    const end = polymarketMarketEndedAt(market) || nowSec;
    return { start: Math.max(1, end - presetSpan), end };
  }
  const start = dayUnix(range.from, "start");
  const end = dayUnix(range.to, "end");
  if (!start || !end || end < start) return null;
  return { start, end };
}

/**
 * Request parameters for one market's trades.
 * Polymarket only honors start and end alongside a wallet. Without one, the loader
 * applies the window while paging (the feed is newest first).
 * @param {Record<string, any>} filters
 * @param {{ closed?: boolean; endedAt?: number } | null} [market]
 */
export function polymarketTradeQuery(filters, market) {
  const side = String(filters?.trade_side?.value || "").trim().toUpperCase();
  const include = Array.isArray(filters?.taker_only?.include) ? filters.taker_only.include : [];
  const unit = String(filters?.filter_type?.value || "").trim().toUpperCase();
  const amount = String(filters?.filter_amount?.value ?? "").trim();
  const user = polymarketTradeUser(filters);
  /** @type {Record<string, string>} */
  const params = {};
  if (side === "BUY" || side === "SELL") params.side = side;
  if (include.length === 1) params.taker_only = include[0] === "true" ? "true" : "false";
  if (unit === "CASH" || unit === "TOKENS") params.filter_type = unit;
  if (amount !== "" && Number.isFinite(Number(amount)) && Number(amount) >= 0) params.filter_amount = amount;
  if (user) {
    const window = polymarketTradeWindow(filters, market);
    params.user = user;
    params.start = String(window ? window.start : 1);
    if (window) params.end = String(window.end);
  }
  return params;
}

/**
 * @param {{ tokenIds?: string[]; outcomes?: string[] }} market
 * @param {"yes" | "no" | "both"} outcome
 */
export function polymarketQuoteTokens(market, outcome) {
  return selectLastTradePriceOutcomeTokens([market], outcome);
}
