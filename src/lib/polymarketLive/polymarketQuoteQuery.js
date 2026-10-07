/**
 * Query controls for Polymarket market pulls that start from a picked market.
 * Outcome, side, depth, interval, and the trade window are the request.
 * They sit above the response columns and are not columns on the sheet.
 */

import { selectLastTradePriceOutcomeTokens } from "@/lib/polymarketLive/lastTradePricesCompose";

export const POLYMARKET_QUOTE_TABLES = [
  "getOrderbooks",
  "getMarketPrices",
  "getMidpointPrices",
  "getSpreads",
  "getLastTradePrices",
  "getBatchPricesHistory",
  "getTradesByMarket",
  "getOpenInterestCompose",
];

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
  ["", "Default"],
  ["1", "1 minute"],
  ["5", "5 minutes"],
  ["15", "15 minutes"],
  ["60", "1 hour"],
  ["240", "4 hours"],
  ["1440", "1 day"],
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
  value: "number",
  outcomeIndex: "number",
  min_order_size: "number",
  tick_size: "number",
  neg_risk: "boolean",
  timestamp: "date",
};

const DEFAULT_COLUMNS = {
  getOrderbooks: ["side", "price", "size", "outcome", "market_title", "last_trade_price"],
  getMarketPrices: ["market_title", "outcome", "buy_price", "sell_price", "token_id", "market_slug"],
  getMidpointPrices: ["market_title", "outcome", "midpoint_price", "token_id", "condition_id", "market_slug"],
  getSpreads: ["market_title", "outcome", "spread", "token_id", "condition_id", "market_slug"],
  getLastTradePrices: ["market_title", "outcome", "last_trade_price", "last_trade_side", "token_id", "market_slug"],
  getBatchPricesHistory: ["market_title", "outcome", "timestamp", "p", "t", "token_id"],
  getTradesByMarket: ["timestamp", "outcome", "side", "price", "size", "title"],
  getOpenInterestCompose: ["market_title", "value", "market", "market_slug"],
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

function historyControls() {
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
      description: "History window. A date range replaces this.",
    },
    {
      id: "time_range",
      title: "Date range",
      type: "date",
      queryOnly: true,
      control: "query-range",
      description: "Start and end. When both are set, they replace the interval.",
    },
    {
      id: "fidelity",
      title: "Fidelity",
      type: "text",
      queryOnly: true,
      control: "period",
      ariaLabel: "Fidelity",
      enumOptions: FIDELITY_OPTIONS,
      description: "Bucket size. Default follows the interval.",
    },
  ];
}

function tradeControls() {
  return [
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
      description: "Trades that take liquidity.",
    },
    {
      id: "time_range",
      title: "Date range",
      type: "date",
      queryOnly: true,
      control: "query-range",
      description: "Start and end of executed trades.",
    },
  ];
}

/**
 * @param {string} tableId
 * @param {Array<Record<string, unknown>>} columns
 */
export function polymarketQuoteAttributeColumns(tableId, columns) {
  if (!isPolymarketQuoteTable(tableId)) return columns || [];
  const shaped = (columns || []).map((column) => {
    const type = polymarketQuoteColumnType(column.id) || column.type;
    const next = { ...column, type };
    if (column.id === "side" || column.id === "last_trade_side") next.enumOptions = SIDE_ENUM;
    if (column.id === "timestamp") next.dateEpoch = "unix";
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
      {
        id: "depth",
        title: "Depth",
        type: "number",
        queryOnly: true,
        control: "depth",
        description: "Price levels on each side. Blank keeps 100.",
      },
      ...shaped,
    ];
  }
  if (tableId === "getMarketPrices" || tableId === "getMidpointPrices" || tableId === "getSpreads" || tableId === "getLastTradePrices") {
    return [outcomeControl("Yes, No, or both outcomes."), ...shaped];
  }
  if (tableId === "getBatchPricesHistory") return [...historyControls(), ...shaped];
  if (tableId === "getTradesByMarket") return [...tradeControls(), ...shaped];
  return shaped;
}

/**
 * @param {string} tableId
 */
export function defaultPolymarketQuoteFilters(tableId) {
  if (tableId === "getOrderbooks") {
    return {
      quote_outcome: { value: "both" },
      book_side: { value: "both" },
      depth: { value: "20" },
    };
  }
  if (tableId === "getMarketPrices" || tableId === "getMidpointPrices" || tableId === "getSpreads" || tableId === "getLastTradePrices") {
    return { quote_outcome: { value: "both" } };
  }
  if (tableId === "getBatchPricesHistory") {
    return {
      quote_outcome: { value: "yes" },
      interval: { value: "1d" },
      fidelity: { value: "" },
      time_range: { from: "", to: "", preset: "" },
    };
  }
  if (tableId === "getTradesByMarket") {
    return {
      trade_side: { value: "" },
      taker_only: { include: ["true"] },
      time_range: { from: "", to: "", preset: "" },
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
    parts.depth = String(source.depth?.value || "");
  }
  if (tableId === "getBatchPricesHistory") {
    parts.interval = String(source.interval?.value || "");
    parts.fidelity = String(source.fidelity?.value || "");
    parts.from = String(source.time_range?.from || "");
    parts.to = String(source.time_range?.to || "");
    parts.limit = polymarketQuoteTarget(rowLimit, planLimit, 50, 2000);
  }
  if (tableId === "getTradesByMarket") {
    parts.side = String(source.trade_side?.value || "");
    parts.taker = Array.isArray(source.taker_only?.include) ? source.taker_only.include.join(",") : "";
    parts.from = String(source.time_range?.from || "");
    parts.to = String(source.time_range?.to || "");
    parts.limit = polymarketQuoteTarget(rowLimit, planLimit, 50, 10000);
  }
  return JSON.stringify(parts);
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

/**
 * Blank keeps 100 levels on each side. A number is capped at 100.
 * @param {Record<string, any>} filters
 */
export function polymarketBookDepth(filters) {
  const raw = String(filters?.depth?.value ?? "").trim();
  if (!raw) return 100;
  const depth = Number(raw);
  if (!Number.isFinite(depth) || depth <= 0) return 100;
  return Math.min(100, Math.floor(depth));
}

/**
 * @param {unknown} book
 * @param {number} depth
 */
export function sliceBookLevels(book, depth) {
  if (!book || typeof book !== "object") return book;
  const source = /** @type {Record<string, unknown>} */ (book);
  const keep = Number.isFinite(depth) && depth > 0 ? depth : 100;
  return {
    ...source,
    bids: Array.isArray(source.bids) ? source.bids.slice(0, keep) : source.bids,
    asks: Array.isArray(source.asks) ? source.asks.slice(0, keep) : source.asks,
  };
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
 */
export function polymarketHistoryBody(filters) {
  const start = dayUnix(filters?.time_range?.from, "start");
  const end = dayUnix(filters?.time_range?.to, "end");
  /** @type {Record<string, string | number>} */
  const body = {};
  if (start && end && end > start) {
    body.start_ts = start;
    body.end_ts = end;
  } else {
    const interval = String(filters?.interval?.value || "1d").trim();
    if (interval) body.interval = interval;
  }
  const fidelity = Number(filters?.fidelity?.value);
  if (Number.isFinite(fidelity) && fidelity > 0) body.fidelity = Math.floor(fidelity);
  return body;
}

/**
 * @param {Record<string, any>} filters
 */
export function polymarketTradeQuery(filters) {
  const side = String(filters?.trade_side?.value || "").trim().toUpperCase();
  const include = Array.isArray(filters?.taker_only?.include) ? filters.taker_only.include : [];
  const start = dayUnix(filters?.time_range?.from, "start");
  const end = dayUnix(filters?.time_range?.to, "end");
  /** @type {Record<string, string>} */
  const params = {};
  if (side === "BUY" || side === "SELL") params.side = side;
  if (include.length === 1) params.takerOnly = include[0] === "true" ? "true" : "false";
  if (start) params.start = String(start);
  if (end) params.end = String(end);
  return params;
}

/**
 * @param {{ tokenIds?: string[]; outcomes?: string[] }} market
 * @param {"yes" | "no" | "both"} outcome
 */
export function polymarketQuoteTokens(market, outcome) {
  return selectLastTradePriceOutcomeTokens([market], outcome);
}
