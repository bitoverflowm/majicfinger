/**
 * Default preview pulls for the build workspace.
 * One table is loaded at a time, capped at 50 rows. Types are a first pass.
 */
import { fetchAthenaLakeSample } from "@/lib/dataLake/fetchAthenaSample";
import { getColumnMetaForLakeTable, isDateLikeColumnName } from "@/lib/dataLake/lakeTableColumns";
import { flattenKalshiHistoricalV2CandlestickGroups } from "@/lib/kalshiHistoricalV2/normalizeHistoricalCandlestickRow";
import { KALSHI_HISTORICAL_V2_TRADES_COLUMNS } from "@/lib/kalshiHistoricalV2/historicalTradesColumns";
import {
  getKalshiLiveColumnsForEndpoint,
  getKalshiLiveRealtimeEndpointIds,
  KALSHI_LIVE_CONNECT_ENDPOINTS,
  KALSHI_LIVE_ENDPOINT_CATEGORIES,
} from "@/config/kalshiLiveConnect";
import { KALSHI_CANDLESTICK_MAX_CANDLES, clampCandlestickWindowToKalshiCap } from "@/lib/kalshiLive/candlestickCompose";
import { KALSHI_LIVE_CANDLESTICK_COLUMNS } from "@/lib/kalshiLive/candlesticksColumns";
import { flattenKalshiLiveCandlestickGroups } from "@/lib/kalshiLive/normalizeCandlestickRow";
import { KALSHI_LIVE_MARKETS_COLUMNS } from "@/lib/kalshiLive/marketsColumns";
import { normalizeKalshiLiveMarketRow } from "@/lib/kalshiLive/normalizeMarketRow";
import { normalizeKalshiLiveSeriesRow } from "@/lib/kalshiLive/normalizeSeriesRow";
import { normalizeKalshiLiveTradeRow } from "@/lib/kalshiLive/normalizeTradeRow";
import { normalizeKalshiLiveOrderbook } from "@/lib/kalshiLive/normalizeOrderbookRow";
import { normalizeKalshiLiveEventRow } from "@/lib/kalshiLive/normalizeEventRow";
import { projectKalshiLiveEventForecastRows } from "@/lib/kalshiLive/normalizeEventForecastRow";
import { inferSeriesTickerFromEvent } from "@/lib/kalshiLive/eventCandlesticksCompose";
import { buildKalshiLiveMultivariateEventsDiscoveryQueryParams } from "@/lib/kalshiLive/multivariateEventsDiscovery";
import { normalizeKalshiLiveLeaderboardRow } from "@/lib/kalshiLive/normalizeLeaderboardRow";
import { normalizeKalshiLiveHolderProfileRow } from "@/lib/kalshiLive/normalizeHolderProfileRow";
import { normalizeKalshiLiveHolderTradeRow } from "@/lib/kalshiLive/normalizeHolderTradeRow";
import {
  normalizeKalshiLiveSearchTradersRow,
  projectKalshiLiveSearchTradersRows,
} from "@/lib/kalshiLive/normalizeSearchTradersRow";
import { getKalshiLiveSearchTradersColumns } from "@/lib/kalshiLive/searchTradersColumns";
import { MARKETS_RESPONSE_FIELDS } from "@/components/integrationsView/integrationPlayground/integrations/polymarket/config";
import {
  POLYMARKET_BLOCKS_CONNECT_COLUMNS,
  POLYMARKET_MARKETS_CONNECT_COLUMNS,
  POLYMARKET_TRADES_CONNECT_COLUMNS,
} from "@/lib/polymarketConnectColumns";

export const PREVIEW_ROW_CAP = 50;

function kalshiLiveSource() {
  const realtime = getKalshiLiveRealtimeEndpointIds();
  const tables = {};
  for (const endpoint of KALSHI_LIVE_CONNECT_ENDPOINTS) {
    tables[endpoint.id] = {
      label: endpoint.title,
      description: endpoint.description,
      group: endpoint.category || "markets",
      realtime: realtime.has(endpoint.id),
    };
  }
  return {
    name: "Kalshi Live",
    defaultGroup: "markets",
    defaultTable: "markets",
    groups: KALSHI_LIVE_ENDPOINT_CATEGORIES,
    tables,
  };
}

export const BUILD_SOURCES = {
  kalshiHistorical: {
    name: "Kalshi Historical",
    defaultTable: "markets",
    flow: {
      lakeId: "kalshi",
      venue: "kalshi",
      historical: true,
      guidedTables: ["markets", "trades"],
      priceScale: "cents",
      priceColumns: ["last_price", "yes_bid", "yes_price", "no_price"],
      join: "ticker",
    },
    tables: {
      markets: {
        label: "Markets search",
        description: "Each row represents a Kalshi market contract.",
      },
      trades: {
        label: "Trades search",
        description: "Each row is a fill from the historical tape.",
      },
    },
  },
  kalshiHistoricalV2: {
    name: "Kalshi Historical v2",
    defaultTable: "markets",
    tables: {
      markets: {
        label: "Markets search",
        description: "Recent Kalshi contracts up to the live cutoff.",
      },
      trades: {
        label: "Trades search",
        description: "Recent fills up to the live cutoff.",
      },
      candlesticks: {
        label: "Candlesticks search",
        description: "One-minute candles for a recent Kalshi market, up to the live cutoff.",
      },
    },
  },
  kalshiLive: kalshiLiveSource(),
  polymarketHistorical: {
    name: "Polymarket Historical",
    defaultTable: "markets",
    flow: {
      lakeId: "polymarket",
      venue: "polymarket",
      historical: true,
      guidedTables: ["markets", "trades", "blocks"],
      priceScale: "decimal",
      priceColumns: [],
      join: "outcomeToken",
    },
    tables: {
      markets: {
        label: "Markets search",
        description: "Each row is a Polymarket prediction market.",
      },
      trades: {
        label: "Trades search",
        description: "Each row is an OrderFilled event from the Polygon blockchain.",
      },
      blocks: {
        label: "Blocks search",
        description: "Each row maps a Polygon block number to its timestamp.",
      },
    },
  },
  polymarket: {
    name: "Polymarket Live",
    defaultTable: "markets",
    tables: {
      markets: {
        label: "Markets search",
        description: "Live Polymarket markets, busiest volume first.",
      },
    },
  },
  chainlink: {
    name: "Chainlink",
    defaultTable: "prices",
    tables: {
      prices: {
        label: "Live prices",
        description: "Latest Chainlink oracle answer for each pair.",
      },
    },
  },
  binance: {
    name: "Binance",
    defaultTable: "prices",
    tables: {
      prices: {
        label: "Live prices",
        description: "Latest Binance price for each pair on the live feed.",
      },
    },
  },
};

const TITLE = {
  ticker: "Ticker",
  title: "Title",
  question: "Question",
  status: "Status",
  last_price: "Last price",
  yes_bid: "Yes bid",
  yes_ask: "Yes ask",
  volume: "Volume",
  liquidity: "Liquidity",
  close_time: "Close time",
  closed: "Closed",
  outcome_prices: "Outcome prices",
  end_date: "End date",
  id: "Id",
  condition_id: "Condition id",
  slug: "Slug",
  outcomes: "Outcomes",
  clob_token_ids: "CLOB token ids",
  active: "Active",
  created_at: "Created at",
  market_maker_address: "Market maker",
  block_number: "Block number",
  transaction_hash: "Transaction",
  log_index: "Log index",
  order_hash: "Order hash",
  maker_asset_id: "Maker asset",
  taker_asset_id: "Taker asset",
  timestamp: "Timestamp",
  _fetched_at: "Fetched at",
  _contract: "Contract",
  count: "Size",
  yes_price: "Yes price",
  no_price: "No price",
  created_time: "Created time",
  taker_side: "Side",
  maker: "Maker",
  taker: "Taker",
  maker_amount: "Maker amount",
  taker_amount: "Taker amount",
  fee: "Fee",
  name: "Name",
  symbol: "Symbol",
  price: "Price",
  updated: "Updated",
};

function titleFor(id) {
  if (TITLE[id]) return TITLE[id];
  return String(id)
    .replace(/_/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function column(id, type, scale, defaultOn = true, description = "") {
  return { id, title: titleFor(id), type, defaultOn, description, ...(scale ? { scale } : {}) };
}

const KALSHI_HISTORICAL_MARKET_FIELDS = [
  ["ticker", "text", "Ticker", "Unique market identifier (e.g., PRES-2024-DJT)"],
  ["kalshi_event_ticker_category", "text", "Event ticker simplified", "Simplified ticker parsed from event_ticker."],
  ["event_ticker", "text", "Event ticker", "Parent event identifier, used for categorization."],
  ["kalshi_taxonomy_category", "text", "Category", "Market category bucket (Sports, Weather, Politics, Crypto, …)."],
  ["market_type", "text", "Market type", "Market type (typically binary)."],
  ["title", "text", "Title", "Human-readable market title."],
  ["yes_sub_title", "text", "Yes sub title", "Label for the Yes outcome."],
  ["no_sub_title", "text", "No sub title", "Label for the No outcome."],
  ["status", "text", "Status", "Market status: open, closed, finalized."],
  ["yes_bid", "number", "Yes bid", "Best bid price for Yes contracts (cents, 1–99)."],
  ["yes_ask", "number", "Yes ask", "Best ask price for Yes contracts (cents, 1–99)."],
  ["no_bid", "number", "No bid", "Best bid price for No contracts (cents, 1–99)."],
  ["no_ask", "number", "No ask", "Best ask price for No contracts (cents, 1–99)."],
  ["last_price", "number", "Last price", "Last traded price (cents, 1–99)."],
  ["volume", "number", "Volume", "Total contracts traded."],
  ["volume_24h", "number", "Volume 24h", "Contracts traded in the last 24 hours."],
  ["open_interest", "number", "Open interest", "Outstanding contracts."],
  ["result", "text", "Result", "Market outcome: yes, no, or empty if unresolved."],
  ["created_time", "date", "Created time", "When the market was created."],
  ["open_time", "date", "Open time", "When trading opened."],
  ["close_time", "date", "Close time", "When trading closed."],
  ["_fetched_at", "date", "Fetched at", "When this record was fetched."],
];

const KALSHI_HISTORICAL_MARKET_DEFAULTS = new Set([
  "ticker",
  "title",
  "status",
  "last_price",
  "yes_bid",
  "volume",
  "close_time",
]);

function kalshiHistoricalMarketColumns() {
  return KALSHI_HISTORICAL_MARKET_FIELDS.map(([id, type, title, description]) => ({
    id,
    title,
    type,
    description,
    defaultOn: KALSHI_HISTORICAL_MARKET_DEFAULTS.has(id),
    ...(LAKE_CENTS.has(id) ? { scale: "cents" } : {}),
  }));
}

/** Every Kalshi Historical market attribute the trades join can bring in. */
export function kalshiHistoricalMarketColumnList() {
  return kalshiHistoricalMarketColumns();
}

const KALSHI_HISTORICAL_TRADE_FIELDS = [
  ["trade_id", "text", "Trade id", "Unique trade identifier."],
  ["ticker", "text", "Ticker", "Market ticker this trade belongs to."],
  ["count", "number", "Size", "Number of contracts traded."],
  ["yes_price", "number", "Yes price", "Yes contract price (cents, 1–99)."],
  ["no_price", "number", "No price", "No contract price (cents, 1–99), always 100 − yes price."],
  ["taker_side", "text", "Side", "Which side the taker bought: yes or no."],
  ["created_time", "date", "Created time", "When the trade occurred."],
  ["_fetched_at", "date", "Fetched at", "When this record was fetched."],
];

const KALSHI_HISTORICAL_TRADE_DEFAULTS = new Set([
  "trade_id",
  "ticker",
  "count",
  "yes_price",
  "no_price",
  "taker_side",
  "created_time",
  "_fetched_at",
]);

function kalshiHistoricalTradeColumns() {
  return KALSHI_HISTORICAL_TRADE_FIELDS.map(([id, type, title, description]) => ({
    id,
    title,
    type,
    description,
    defaultOn: KALSHI_HISTORICAL_TRADE_DEFAULTS.has(id),
    ...(LAKE_CENTS.has(id) ? { scale: "cents" } : {}),
  }));
}

function kalshiHistoricalColumns(table) {
  return table === "trades" ? kalshiHistoricalTradeColumns() : kalshiHistoricalMarketColumns();
}

const LAKE_COMPUTED = new Set(["kalshi_event_ticker_category", "kalshi_taxonomy_category"]);
const LAKE_CENTS = new Set(["last_price", "yes_bid", "yes_ask", "no_bid", "no_ask", "yes_price", "no_price"]);

function uiType(rawType, name) {
  const type = String(rawType || "").toLowerCase();
  if (type === "boolean") return "boolean";
  if (type === "timestamp" || (type !== "string" && isDateLikeColumnName(name))) return "date";
  if (type === "string") {
    if (isDateLikeColumnName(name)) return "date";
    return "text";
  }
  if (type === "bigint" || type === "int" || type === "double" || type === "number") return "number";
  return "text";
}

function catalogColumns(meta, defaults, { cents = false } = {}) {
  const on = new Set(defaults);
  return meta.map((entry) => {
    const id = entry.name;
    const scale = cents && LAKE_CENTS.has(id) ? "cents" : undefined;
    return column(id, uiType(entry.type, id), scale, on.has(id));
  });
}

function lakeColumns(lake, table, defaults) {
  const meta = getColumnMetaForLakeTable(lake, table).filter((entry) => !LAKE_COMPUTED.has(entry.name));
  return catalogColumns(meta, defaults, { cents: lake === "kalshi" });
}

const POLYMARKET_CONNECT_COLUMNS = {
  markets: POLYMARKET_MARKETS_CONNECT_COLUMNS,
  trades: POLYMARKET_TRADES_CONNECT_COLUMNS,
  blocks: POLYMARKET_BLOCKS_CONNECT_COLUMNS,
};

const POLYMARKET_HISTORICAL_DEFAULTS = {
  markets: new Set(["question", "volume", "liquidity", "outcome_prices", "closed", "end_date"]),
  trades: new Set(["timestamp", "maker", "taker", "maker_amount", "taker_amount", "fee"]),
  blocks: new Set(["block_number", "timestamp"]),
};

/** Epoch unit the Attributes date filter should send. Kalshi dates stay nanoseconds. */
const POLYMARKET_DATE_EPOCH = {
  markets: { end_date: "unix", created_at: "unix", _fetched_at: "ns" },
  trades: { timestamp: "unix", _fetched_at: "ns" },
  blocks: { timestamp: "iso" },
};

function polymarketHistoricalColumns(table) {
  const key = table === "trades" || table === "blocks" ? table : "markets";
  const described = new Map(POLYMARKET_CONNECT_COLUMNS[key].map((entry) => [entry.name, entry.description]));
  const defaults = POLYMARKET_HISTORICAL_DEFAULTS[key];
  const epochs = POLYMARKET_DATE_EPOCH[key];
  return getColumnMetaForLakeTable("polymarket", key).map((entry) => {
    const dateEpoch = epochs[entry.name];
    return {
      id: entry.name,
      title: titleFor(entry.name),
      type: dateEpoch ? "date" : uiType(entry.type, entry.name),
      description: described.get(entry.name) || "",
      defaultOn: defaults.has(entry.name),
      ...(dateEpoch ? { dateEpoch } : {}),
    };
  });
}

export function polymarketHistoricalColumnList(table) {
  return polymarketHistoricalColumns(table);
}

/** Outcome token ids stored on a market's clob_token_ids or a trade's asset id. USDC (0) is not a market. */
export function polymarketTokenIds(value) {
  const seen = new Set();
  const ids = [];
  for (const match of String(value ?? "").matchAll(/\d{2,}/g)) {
    const id = match[0];
    if (id === "0" || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function cellValue(value) {
  if (value == null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

function projectRows(columns, records) {
  return records.slice(0, PREVIEW_ROW_CAP).map((record) => {
    const row = {};
    for (const entry of columns) row[entry.id] = cellValue(record?.[entry.id]);
    return row;
  });
}

const POLYMARKET_LIVE_NUMBER = /volume|liquidity|fee|price|spread|score|bound|size|tick|delay|liveness|change|line|reward|bond/i;
const POLYMARKET_LIVE_BOOL = new Set([
  "active",
  "closed",
  "new",
  "featured",
  "archived",
  "restricted",
  "wideFormat",
  "ready",
  "funded",
  "acceptingOrders",
  "notificationsEnabled",
  "commentsEnabled",
  "hasReviewedDates",
  "readyForCron",
  "automaticallyResolved",
  "automaticallyActive",
  "clearBookOnStart",
  "manualActivation",
  "negRiskOther",
  "pendingDeployment",
  "deploying",
  "rfqEnabled",
  "enableOrderBook",
  "fpmmLive",
  "winner",
]);

function polymarketLiveColumns(defaults) {
  const on = new Set(defaults);
  return MARKETS_RESPONSE_FIELDS.map((name) => {
    let type = "text";
    if (POLYMARKET_LIVE_BOOL.has(name)) type = "boolean";
    else if (isDateLikeColumnName(name)) type = "date";
    else if (POLYMARKET_LIVE_NUMBER.test(name)) type = "number";
    return column(name, type, undefined, on.has(name));
  });
}

const pullCache = new Map();
const countCache = new Map();
const countValues = new Map();

const EXACT_UNIVERSE = {
  kalshiHistorical: "kalshi",
  polymarketHistorical: "polymarket",
};

export const APPROXIMATE_UNIVERSE = 1_000_000;

export function usesExactUniverse(integrationId) {
  return Boolean(EXACT_UNIVERSE[integrationId]);
}

function num(raw) {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (raw == null || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

async function getJson(url) {
  const res = await fetch(url, { credentials: "same-origin" });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Pull failed");
  return json;
}

async function postAthena(body) {
  const res = await fetch("/api/data-lake/athena-query", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || "Pull failed");
  const columns = json.columns || [];
  return (json.rows || []).map((cells) => {
    const row = {};
    columns.forEach((name, index) => {
      row[name] = cells[index];
    });
    return row;
  });
}

function lakeHistoricalCompose({ lake, table, columns, predicates, sortKeys, fallback }) {
  const and = Array.isArray(predicates) ? predicates : Array.isArray(predicates?.and) ? predicates.and : [];
  const or = Array.isArray(predicates) ? [] : Array.isArray(predicates?.or) ? predicates.or : [];
  const orderBy = Array.isArray(sortKeys) && sortKeys.length
    ? sortKeys
        .filter((sort) => columns.some((column) => column.id === sort.columnId))
        .map((sort) => ({ alias: sort.columnId, direction: sort.direction === "asc" ? "asc" : "desc" }))
    : [fallback];
  return {
    columns,
    request: {
      lake,
      table,
      queryType: "compose",
      limit: PREVIEW_ROW_CAP,
      caseSensitive: false,
      filters: and.length || or.length ? { and, or } : null,
      compose: {
        select: columns.map((entry) => ({ column: entry.id, alias: entry.id })),
        groupByAliases: [],
        orderBy: orderBy.length ? orderBy : [fallback],
      },
    },
  };
}

function kalshiHistoricalCompose(table, predicates, sortKeys) {
  const trades = table === "trades";
  return lakeHistoricalCompose({
    lake: "kalshi",
    table: trades ? "trades" : "markets",
    columns: kalshiHistoricalColumns(table),
    predicates,
    sortKeys,
    fallback: trades ? { alias: "created_time", direction: "desc" } : { alias: "volume", direction: "desc" },
  });
}

function polymarketHistoricalCompose(table, predicates, sortKeys) {
  const key = table === "trades" || table === "blocks" ? table : "markets";
  const fallback =
    key === "trades"
      ? { alias: "timestamp", direction: "desc" }
      : key === "blocks"
        ? { alias: "block_number", direction: "desc" }
        : { alias: "volume", direction: "desc" };
  return lakeHistoricalCompose({
    lake: "polymarket",
    table: key,
    columns: polymarketHistoricalColumns(key),
    predicates,
    sortKeys,
    fallback,
  });
}

function kalshiHistoricalMarketsCompose(predicates, sortKeys) {
  return kalshiHistoricalCompose("markets", predicates, sortKeys);
}

async function kalshiHistoricalMarkets() {
  const { columns, request } = kalshiHistoricalMarketsCompose();
  const rows = await postAthena(request);
  return {
    columns,
    rows: rows.slice(0, PREVIEW_ROW_CAP),
    capped: rows.length >= PREVIEW_ROW_CAP,
  };
}

/**
 * The compose body Next and Save search lock in.
 * Preview fetches stay capped at PREVIEW_ROW_CAP; this request uses the import limit
 * and the columns the user left visible (plus any column used to sort).
 */
function finishHistoricalRequest({ columns, request, sortKeys, columnIds, limit }) {
  const wanted = new Set(Array.isArray(columnIds) ? columnIds : []);
  for (const sort of Array.isArray(sortKeys) ? sortKeys : []) {
    if (sort?.columnId) wanted.add(sort.columnId);
  }
  const selectColumns = wanted.size ? columns.filter((column) => wanted.has(column.id)) : columns;
  const select = (selectColumns.length ? selectColumns : columns).map((entry) => ({
    column: entry.id,
    alias: entry.id,
  }));
  const rowLimit = Number(limit);
  return {
    ...request,
    limit: Number.isFinite(rowLimit) && rowLimit > 0 ? Math.floor(rowLimit) : request.limit,
    compose: {
      ...request.compose,
      select,
    },
  };
}

export function buildKalshiHistoricalRequest({ table = "markets", predicates, sortKeys, columnIds, limit } = {}) {
  const { columns, request } = kalshiHistoricalCompose(table, predicates, sortKeys);
  return finishHistoricalRequest({ columns, request, sortKeys, columnIds, limit });
}

export function buildPolymarketHistoricalRequest({ table = "markets", predicates, sortKeys, columnIds, limit } = {}) {
  const { columns, request } = polymarketHistoricalCompose(table, predicates, sortKeys);
  return finishHistoricalRequest({ columns, request, sortKeys, columnIds, limit });
}

const KALSHI_TRADE_PREVIEW_FIELDS = ["created_time", "ticker", "taker_side", "yes_price", "no_price", "count"];

function rowsFromAthenaCells(result, limit) {
  const names = result?.columns || [];
  const cap = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : Infinity;
  return (result?.rows || []).slice(0, cap).map((cells) => {
    const row = {};
    names.forEach((name, index) => {
      row[name] = cells[index];
    });
    return row;
  });
}

/**
 * Trades for one market ticker. Preview calls omit `limit` and stay at PREVIEW_ROW_CAP.
 * Save and run passes the plan row cap so Elite gets the full pull and other tiers
 * stop at their sheet cap.
 */
export function loadKalshiHistoricalTradesForTicker(ticker, limit = PREVIEW_ROW_CAP, options = {}) {
  const catalog = lakeColumns("kalshi", "trades", KALSHI_TRADE_PREVIEW_FIELDS);
  const columns = KALSHI_TRADE_PREVIEW_FIELDS.map((id) => catalog.find((entry) => entry.id === id)).filter(Boolean);
  const rowLimit = Math.max(1, Math.floor(Number(limit) || PREVIEW_ROW_CAP));
  const request = {
    lake: "kalshi",
    table: "trades",
    queryType: "compose",
    limit: rowLimit,
    caseSensitive: false,
    filters: {
      and: [{ column: "ticker", kind: "string", op: "eq", value: String(ticker || "") }],
    },
    compose: {
      select: columns.map((entry) => ({ column: entry.id, alias: entry.id })),
      groupByAliases: [],
      orderBy: [{ alias: "created_time", direction: "desc" }],
    },
  };
  const maxWaitMs = rowLimit > PREVIEW_ROW_CAP ? 600000 : 180000;
  return fetchAthenaLakeSample(request, { maxWaitMs, pollIntervalMs: 800, onPhase: options.onPhase }).then((result) => ({
    columns,
    rows: rowsFromAthenaCells(result, rowLimit),
    request,
  }));
}

/**
 * Market metadata for the tickers in a trades pull. One row per ticker.
 * Large ticker lists are queried in chunks so the IN list stays valid.
 */
export async function loadKalshiHistoricalMarketsForTickers(tickers, options = {}) {
  const unique = [];
  const seen = new Set();
  for (const raw of tickers || []) {
    const ticker = String(raw || "").trim();
    if (!ticker || seen.has(ticker)) continue;
    seen.add(ticker);
    unique.push(ticker);
  }
  const columns = kalshiHistoricalMarketColumns();
  if (!unique.length) return { columns, rows: [] };
  const rows = [];
  const seenRow = new Set();
  const chunkSize = 40;
  for (let start = 0; start < unique.length; start += chunkSize) {
    const chunk = unique.slice(start, start + chunkSize);
    const value = chunk.map((ticker) => `"${ticker.replace(/"/g, "")}"`).join(", ");
    const request = {
      lake: "kalshi",
      table: "markets",
      queryType: "compose",
      limit: chunk.length,
      caseSensitive: false,
      filters: {
        and: [{ column: "ticker", kind: "string", op: "in", value }],
      },
      compose: {
        select: columns.map((entry) => ({ column: entry.id, alias: entry.id })),
        groupByAliases: [],
        orderBy: [{ alias: "volume", direction: "desc" }],
      },
    };
    const result = await fetchAthenaLakeSample(request, {
      maxWaitMs: unique.length > chunkSize ? 600000 : 180000,
      pollIntervalMs: 800,
      onPhase: (info) => options.onPhase?.({ ...info, chunk: Math.floor(start / chunkSize) + 1, chunks: Math.ceil(unique.length / chunkSize) }),
    });
    for (const row of rowsFromAthenaCells(result, chunk.length)) {
      const ticker = String(row.ticker || "").trim();
      if (ticker && seenRow.has(ticker)) continue;
      if (ticker) seenRow.add(ticker);
      rows.push(row);
    }
  }
  return {
    columns,
    rows,
    request: {
      lake: "kalshi",
      table: "markets",
      queryType: "compose",
      limit: unique.length,
      caseSensitive: false,
      filters: {
        and: [{ column: "ticker", kind: "string", op: "in", value: unique.map((ticker) => `"${ticker.replace(/"/g, "")}"`).join(", ") }],
      },
      compose: {
        select: columns.map((entry) => ({ column: entry.id, alias: entry.id })),
        groupByAliases: [],
        orderBy: [{ alias: "volume", direction: "desc" }],
      },
    },
  };
}

/** Run a locked compose request. Preview stays on its own 50-row fetch. */
export function loadAthenaComposeRows(request, options = {}) {
  const rowLimit = Number(request?.limit);
  const cap = Number.isFinite(rowLimit) && rowLimit > 0 ? Math.floor(rowLimit) : undefined;
  return fetchAthenaLakeSample(cap ? { ...request, limit: cap } : request, {
    maxWaitMs: 600000,
    pollIntervalMs: 800,
    onPhase: options.onPhase,
  }).then((result) => ({ rows: rowsFromAthenaCells(result, cap) }));
}

export function buildKalshiHistoricalMarketsRequest(args = {}) {
  return buildKalshiHistoricalRequest({ ...args, table: "markets" });
}

function loadLakeHistoricalPreview(compose) {
  return fetchAthenaLakeSample(compose.request, { maxWaitMs: 180000, pollIntervalMs: 800 }).then((result) => {
    const names = result.columns || [];
    const rows = (result.rows || []).map((cells) => {
      const row = {};
      names.forEach((name, index) => {
        row[name] = cells[index];
      });
      return row;
    });
    return { rows: rows.slice(0, PREVIEW_ROW_CAP) };
  });
}

function polymarketTradeColumns() {
  return polymarketHistoricalColumns("trades").filter((column) => column.defaultOn);
}

/**
 * Trades for one Polymarket market. A fill matches when the maker or taker asset
 * is one of that market's outcome token ids.
 */
export function loadPolymarketHistoricalTradesForTokens(tokens, limit = PREVIEW_ROW_CAP, options = {}) {
  const columns = polymarketTradeColumns();
  const unique = [];
  const seen = new Set();
  for (const raw of tokens || []) {
    for (const token of polymarketTokenIds(raw)) {
      if (seen.has(token)) continue;
      seen.add(token);
      unique.push(token);
    }
  }
  const rowLimit = Math.max(1, Math.floor(Number(limit) || PREVIEW_ROW_CAP));
  if (!unique.length) return Promise.resolve({ columns, rows: [] });
  const or = unique.slice(0, 24).flatMap((token) => [
    { column: "maker_asset_id", kind: "string", op: "eq", value: token },
    { column: "taker_asset_id", kind: "string", op: "eq", value: token },
  ]);
  const request = {
    lake: "polymarket",
    table: "trades",
    queryType: "compose",
    limit: rowLimit,
    caseSensitive: false,
    filters: { and: [], or },
    compose: {
      select: columns.map((entry) => ({ column: entry.id, alias: entry.id })),
      groupByAliases: [],
      orderBy: [{ alias: "timestamp", direction: "desc" }],
    },
  };
  const maxWaitMs = rowLimit > PREVIEW_ROW_CAP ? 600000 : 180000;
  return fetchAthenaLakeSample(request, { maxWaitMs, pollIntervalMs: 800, onPhase: options.onPhase }).then((result) => ({
    columns,
    rows: rowsFromAthenaCells(result, rowLimit),
    request,
  }));
}

/**
 * Markets whose outcome tokens appear on these trades. One row per market.
 */
export async function loadPolymarketHistoricalMarketsForTokens(tokens, options = {}) {
  const unique = [];
  const seen = new Set();
  for (const raw of tokens || []) {
    for (const token of polymarketTokenIds(raw)) {
      if (seen.has(token)) continue;
      seen.add(token);
      unique.push(token);
    }
  }
  const columns = polymarketHistoricalColumns("markets");
  if (!unique.length) return { columns, rows: [] };
  const rows = [];
  const seenRow = new Set();
  const chunkSize = 20;
  for (let start = 0; start < unique.length; start += chunkSize) {
    const chunk = unique.slice(start, start + chunkSize);
    const request = {
      lake: "polymarket",
      table: "markets",
      queryType: "compose",
      limit: Math.max(chunk.length, 25),
      caseSensitive: false,
      filters: {
        or: chunk.map((token) => ({ column: "clob_token_ids", kind: "string", op: "contains", value: token })),
      },
      compose: {
        select: columns.map((entry) => ({ column: entry.id, alias: entry.id })),
        groupByAliases: [],
        orderBy: [{ alias: "volume", direction: "desc" }],
      },
    };
    const result = await fetchAthenaLakeSample(request, {
      maxWaitMs: unique.length > chunkSize ? 600000 : 180000,
      pollIntervalMs: 800,
      onPhase: (info) => options.onPhase?.({ ...info, chunk: Math.floor(start / chunkSize) + 1, chunks: Math.ceil(unique.length / chunkSize) }),
    });
    for (const row of rowsFromAthenaCells(result)) {
      const key = String(row.condition_id || row.id || "").trim();
      if (key && seenRow.has(key)) continue;
      if (key) seenRow.add(key);
      rows.push(row);
    }
  }
  return {
    columns,
    rows,
    request: {
      lake: "polymarket",
      table: "markets",
      queryType: "compose",
      limit: Math.max(unique.length, 25),
      caseSensitive: false,
      filters: {
        or: unique.map((token) => ({ column: "clob_token_ids", kind: "string", op: "contains", value: token })),
      },
      compose: {
        select: columns.map((entry) => ({ column: entry.id, alias: entry.id })),
        groupByAliases: [],
        orderBy: [{ alias: "volume", direction: "desc" }],
      },
    },
  };
}

export function loadKalshiHistoricalPreview(table, predicates, sortKeys) {
  return loadLakeHistoricalPreview(kalshiHistoricalCompose(table, predicates, sortKeys));
}

export function loadPolymarketHistoricalPreview(table, predicates, sortKeys) {
  return loadLakeHistoricalPreview(polymarketHistoricalCompose(table, predicates, sortKeys));
}

export function loadKalshiHistoricalMarketsPreview(predicates, sortKeys) {
  return loadKalshiHistoricalPreview("markets", predicates, sortKeys);
}

async function kalshiHistoricalTrades() {
  const { columns, request } = kalshiHistoricalCompose("trades");
  const rows = await postAthena(request);
  return {
    columns,
    rows: rows.slice(0, PREVIEW_ROW_CAP),
    capped: rows.length >= PREVIEW_ROW_CAP,
  };
}

const KALSHI_V2_MARKET_DEFAULTS = new Set([
  "ticker",
  "yes_sub_title",
  "status",
  "last_price_dollars",
  "yes_bid_dollars",
  "volume_fp",
  "close_time",
]);

function declaredColumns(meta, defaults) {
  const on = new Set(defaults);
  return meta.map((entry) => {
    const raw = String(entry.type || "").toLowerCase();
    const type =
      raw === "boolean"
        ? "boolean"
        : raw === "timestamp"
          ? "date"
          : raw === "int" || raw === "number" || raw === "nullable_number"
            ? "number"
            : "text";
    return {
      id: entry.name,
      title: entry.label ? titleFor(entry.label) : titleFor(entry.name),
      type,
      description: entry.description || "",
      defaultOn: on.has(entry.name),
    };
  });
}

function kalshiV2MarketColumns() {
  return declaredColumns(KALSHI_LIVE_MARKETS_COLUMNS, KALSHI_V2_MARKET_DEFAULTS);
}

const KALSHI_V2_TRADE_DEFAULTS = [
  "created_time",
  "ticker",
  "taker_outcome_side",
  "yes_price_dollars",
  "count_fp",
];

function kalshiV2TradeColumns() {
  return declaredColumns(KALSHI_HISTORICAL_V2_TRADES_COLUMNS, KALSHI_V2_TRADE_DEFAULTS);
}

const KALSHI_V2_CANDLE_DEFAULTS = [
  "market_ticker",
  "end_period_ts",
  "price_open_dollars",
  "price_high_dollars",
  "price_low_dollars",
  "price_close_dollars",
  "volume_fp",
];

function kalshiV2CandlestickColumns() {
  return declaredColumns(KALSHI_LIVE_CANDLESTICK_COLUMNS, KALSHI_V2_CANDLE_DEFAULTS);
}

function unixSeconds(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (Number.isFinite(n) && n > 1e9) return Math.floor(n > 1e12 ? n / 1000 : n);
  const ms = Date.parse(String(value));
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : null;
}

async function kalshiV2Markets() {
  const columns = kalshiV2MarketColumns();
  const json = await getJson(
    `/api/integrations/kalshi-live/historical/markets?discovery=1&ticker_scope=general&limit=${PREVIEW_ROW_CAP}&mve_filter=exclude`,
  );
  const markets = Array.isArray(json.markets) ? json.markets : [];
  return {
    columns,
    rows: projectRows(columns, markets),
    capped: Boolean(json.cursor) || markets.length >= PREVIEW_ROW_CAP,
  };
}

async function kalshiV2Trades() {
  const columns = kalshiV2TradeColumns();
  const json = await getJson(`/api/integrations/kalshi-live/historical/trades?limit=${PREVIEW_ROW_CAP}`);
  const trades = Array.isArray(json.trades) ? json.trades : [];
  return {
    columns,
    rows: projectRows(columns, trades),
    capped: Boolean(json.cursor) || trades.length >= PREVIEW_ROW_CAP,
  };
}

async function kalshiV2Candlesticks() {
  const columns = kalshiV2CandlestickColumns();
  const marketsJson = await getJson(
    `/api/integrations/kalshi-live/historical/markets?discovery=1&ticker_scope=general&limit=5&mve_filter=exclude`,
  );
  const markets = Array.isArray(marketsJson.markets) ? marketsJson.markets : [];
  const market = markets.find((entry) => entry?.ticker && unixSeconds(entry.close_time));
  if (!market) return { columns, rows: [], capped: false };
  const end = unixSeconds(market.close_time);
  const open = unixSeconds(market.open_time);
  let start = end - PREVIEW_ROW_CAP * 60;
  if (open && open > start && open < end) start = open;
  const json = await getJson(
    `/api/integrations/kalshi-live/historical/markets/candlesticks?ticker=${encodeURIComponent(market.ticker)}&start_ts=${start}&end_ts=${end}&period_interval=1`,
  );
  const groups = Array.isArray(json.markets)
    ? json.markets
    : [{ market_ticker: market.ticker, candlesticks: json.candlesticks || [] }];
  const flat = flattenKalshiHistoricalV2CandlestickGroups(groups);
  return {
    columns,
    rows: projectRows(columns, flat),
    capped: flat.length >= PREVIEW_ROW_CAP,
  };
}

const KALSHI_LIVE_DEFAULTS = {
  markets: ["ticker", "yes_sub_title", "status", "last_price_dollars", "yes_bid_dollars", "yes_ask_dollars", "volume_fp"],
  series: ["ticker", "title", "category", "frequency", "volume_fp"],
  candlesticks: ["market_ticker", "end_period_ts", "price_open_dollars", "price_high_dollars", "price_low_dollars", "price_close_dollars", "volume_fp"],
  trades: ["created_time", "ticker", "taker_outcome_side", "yes_price_dollars", "count_fp"],
  orderbook: ["ticker", "side", "price_dollars", "quantity_fp", "level_index"],
  events: ["event_ticker", "series_ticker", "title", "sub_title", "mutually_exclusive"],
  event_candlesticks: ["market_ticker", "end_period_ts", "price_open_dollars", "price_high_dollars", "price_low_dollars", "price_close_dollars", "volume_fp"],
  multivariate_events: ["event_ticker", "series_ticker", "title", "sub_title"],
  event_forecast: ["event_ticker", "end_period_ts", "period_interval", "percentile", "raw_numerical_forecast", "numerical_forecast", "formatted_forecast"],
  leaderboard: ["rank", "nickname", "value", "metric_name", "time_period"],
  holder_profile: ["nickname", "follower_count", "following_count", "description", "joined_at"],
  trades_by_holder: ["create_date", "ticker", "price_dollars", "count_fp", "taker_side", "taker_nickname"],
  search_traders: ["nickname", "volume", "pnl", "dollars_traded", "num_markets_traded"],
};

function kalshiLiveColumns(endpointId) {
  const meta =
    endpointId === "search_traders"
      ? getKalshiLiveSearchTradersColumns({ includeMetrics: true, includeHoldings: true })
      : getKalshiLiveColumnsForEndpoint(endpointId);
  const defaults = KALSHI_LIVE_DEFAULTS[endpointId] || meta.slice(0, 6).map((entry) => entry.name);
  return declaredColumns(meta, defaults);
}

function previewPack(columns, rows) {
  return {
    columns,
    rows: projectRows(columns, rows),
    capped: rows.length >= PREVIEW_ROW_CAP,
  };
}

/** One market. Re-request this for each tagged ticker so a sheet can pass the list cap of 1000. */
export async function loadKalshiLiveMarketByTicker(ticker) {
  const id = String(ticker || "").trim();
  if (!id) return null;
  const json = await getJson(`/api/integrations/kalshi-live/markets/get?ticker=${encodeURIComponent(id)}`);
  const market = json?.market && typeof json.market === "object" ? json.market : json;
  const row = normalizeKalshiLiveMarketRow(market);
  return String(row?.ticker || "").trim() ? row : null;
}

/**
 * Every market in one series or one event, via GET /markets.
 * Paginates past the 1000-row page size. Stops at 20,000 rows.
 */
export async function loadKalshiLiveMarketsForScope({ seriesTicker = "", eventTicker = "", limit = 20000 } = {}) {
  const series = String(seriesTicker || "").trim();
  const event = String(eventTicker || "").trim();
  if (!series && !event) return [];
  const cap = Math.max(1, Math.floor(Number(limit) || 20000));
  const rows = [];
  let cursor = "";
  for (let page = 0; page < 20 && rows.length < cap; page += 1) {
    const params = new URLSearchParams({
      discovery: "1",
      limit: String(Math.min(1000, cap - rows.length)),
      mve_filter: "exclude",
    });
    if (series) params.set("series_ticker", series);
    if (event) params.set("event_ticker", event);
    if (cursor) params.set("cursor", cursor);
    const json = await getJson(`/api/integrations/kalshi-live/markets?${params}`);
    const markets = Array.isArray(json.markets) ? json.markets : [];
    rows.push(...markets.map((row) => normalizeKalshiLiveMarketRow(row)));
    cursor = String(json.cursor || "").trim();
    if (!cursor || !markets.length) break;
  }
  return rows.filter((row) => String(row?.ticker || "").trim()).slice(0, cap);
}

/** Markets inside one series. Kalshi accepts one series_ticker per request. */
export async function loadKalshiLiveSeriesMarkets(seriesTicker, limit = PREVIEW_ROW_CAP) {
  const columns = kalshiLiveColumns("markets");
  const rows = await loadKalshiLiveMarketsForScope({ seriesTicker, limit });
  return { columns, rows: projectLiveJoinRows(columns, rows, rows.length || 1) };
}

async function kalshiLiveRows(endpointId) {
  if (endpointId === "markets") {
    const json = await getJson(
      `/api/integrations/kalshi-live/markets?discovery=1&limit=${PREVIEW_ROW_CAP}&status=open&mve_filter=exclude`,
    );
    return (Array.isArray(json.markets) ? json.markets : []).map((row) => normalizeKalshiLiveMarketRow(row));
  }
  if (endpointId === "series") {
    const json = await getJson("/api/integrations/kalshi-live/series/list?include_volume=true");
    const series = Array.isArray(json.series) ? json.series : [];
    return series.slice(0, PREVIEW_ROW_CAP).map((row) => normalizeKalshiLiveSeriesRow(row));
  }
  if (
    endpointId === "candlesticks" ||
    endpointId === "trades" ||
    endpointId === "orderbook" ||
    endpointId === "event_candlesticks"
  ) {
    return [];
  }
  if (endpointId === "events" || endpointId === "multivariate_events") {
    const path =
      endpointId === "events"
        ? `/api/integrations/kalshi-live/events?limit=${PREVIEW_ROW_CAP}&status=open&with_nested_markets=1&with_milestones=1`
        : `/api/integrations/kalshi-live/events/multivariate?limit=${PREVIEW_ROW_CAP}&with_nested_markets=1`;
    const json = await getJson(path);
    const events = Array.isArray(json.events) ? json.events : [];
    return events.map((row) => normalizeKalshiLiveEventRow(row));
  }
  if (endpointId === "event_forecast") return [];
  if (endpointId === "leaderboard") {
    const json = await getJson(
      `/api/integrations/kalshi-live/social/leaderboard?metric_name=projected_pnl&time_period=all_time&limit=${PREVIEW_ROW_CAP}`,
    );
    const ranks = Array.isArray(json.rank_list) ? json.rank_list : [];
    return ranks.map((row) =>
      normalizeKalshiLiveLeaderboardRow(row, { metricName: "projected_pnl", timePeriod: "all_time" }),
    );
  }
  if (endpointId === "holder_profile") {
    const board = await getJson(
      "/api/integrations/kalshi-live/social/leaderboard?metric_name=projected_pnl&time_period=all_time&limit=1",
    );
    const nickname = board.rank_list?.[0]?.nickname;
    if (!nickname) return [];
    const json = await getJson(
      `/api/integrations/kalshi-live/social/profile?nickname=${encodeURIComponent(nickname)}`,
    );
    return [normalizeKalshiLiveHolderProfileRow(json)];
  }
  if (endpointId === "trades_by_holder") {
    const json = await getJson(`/api/integrations/kalshi-live/social/trades?page_size=${PREVIEW_ROW_CAP}`);
    return (Array.isArray(json.trades) ? json.trades : []).map((row) => normalizeKalshiLiveHolderTradeRow(row));
  }
  if (endpointId === "search_traders") {
    const json = await getJson(`/api/integrations/kalshi-live/search/social-profiles?query=ka&limit=${PREVIEW_ROW_CAP}`);
    return (Array.isArray(json.profiles) ? json.profiles : []).map((row) =>
      normalizeKalshiLiveSearchTradersRow(row, null, null, { includeMetrics: true, includeHoldings: true }),
    );
  }
  return [];
}

async function kalshiLiveEndpoint(endpointId) {
  const columns = kalshiLiveColumns(endpointId);
  const rows = await kalshiLiveRows(endpointId);
  return previewPack(columns, rows);
}

async function polymarketHistoricalTable(table) {
  const { columns, request } = polymarketHistoricalCompose(table);
  const rows = await postAthena(request);
  return {
    columns,
    rows: rows.slice(0, PREVIEW_ROW_CAP),
    capped: rows.length >= PREVIEW_ROW_CAP,
  };
}

function polymarketHistoricalMarkets() {
  return polymarketHistoricalTable("markets");
}

function polymarketHistoricalTrades() {
  return polymarketHistoricalTable("trades");
}

function polymarketHistoricalBlocks() {
  return polymarketHistoricalTable("blocks");
}

async function polymarketLiveMarkets() {
  const columns = polymarketLiveColumns(["question", "volume", "liquidity", "outcomePrices", "closed", "endDate"]);
  const json = await getJson(
    `/api/integrations/polymarket?query=listMarkets&limit=${PREVIEW_ROW_CAP}&order=volumeNum&ascending=false`,
  );
  const markets = Array.isArray(json) ? json : [];
  return {
    columns,
    rows: projectRows(columns, markets),
    capped: markets.length >= PREVIEW_ROW_CAP,
  };
}

const QUOTE_PAIRS = [
  { name: "Bitcoin", binance: "btcusdt", chainlink: "btc/usd" },
  { name: "Ethereum", binance: "ethusdt", chainlink: "eth/usd" },
  { name: "Solana", binance: "solusdt", chainlink: "sol/usd" },
  { name: "XRP", binance: "xrpusdt", chainlink: "xrp/usd" },
];

function listenQuotes(feed) {
  if (feed === "chainlink") {
    return Promise.all(
      QUOTE_PAIRS.map((pair) =>
        collectQuotes({
          feed,
          subscriptions: [
            {
              topic: "crypto_prices_chainlink",
              type: "*",
              filters: JSON.stringify({ symbol: pair.chainlink }),
            },
          ],
          stopWhen: (quotes) => quotes.size >= 1,
        }).catch(() => new Map()),
      ),
    ).then((maps) => {
      const merged = new Map();
      for (const map of maps) {
        for (const [name, quote] of map) merged.set(name, quote);
      }
      if (!merged.size) throw new Error("No live prices came through");
      return merged;
    });
  }
  return collectQuotes({
    feed,
    subscriptions: QUOTE_PAIRS.map((pair) => ({
      topic: "crypto_prices",
      type: "update",
      filters: JSON.stringify([pair.binance]),
    })),
    stopWhen: (quotes) => quotes.size >= QUOTE_PAIRS.length,
  });
}

function collectQuotes({ feed, subscriptions, stopWhen }) {
  return new Promise((resolve, reject) => {
    if (typeof WebSocket === "undefined") {
      reject(new Error("Live prices are only available in the browser"));
      return;
    }
    const quotes = new Map();
    const ws = new WebSocket("wss://ws-live-data.polymarket.com");
    let ping;
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      if (ping) window.clearInterval(ping);
      try {
        ws.close();
      } catch {
        /* ignore */
      }
      if (!quotes.size) {
        reject(new Error("No live prices came through"));
        return;
      }
      resolve(quotes);
    };
    const timer = window.setTimeout(finish, 5000);
    ws.onopen = () => {
      ws.send(JSON.stringify({ action: "subscribe", subscriptions }));
      ping = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.send("PING");
      }, 4000);
    };
    ws.onmessage = (event) => {
      let msg;
      try {
        msg = JSON.parse(event.data);
      } catch {
        return;
      }
      const topicFeed = msg.topic === "crypto_prices" ? "binance" : msg.topic === "crypto_prices_chainlink" ? "chainlink" : null;
      if (topicFeed !== feed || !msg.payload) return;
      const symbol = String(msg.payload.symbol || "").toLowerCase();
      const pair = QUOTE_PAIRS.find((item) => item.binance === symbol || item.chainlink === symbol);
      if (!pair) return;
      const history = Array.isArray(msg.payload.data) ? msg.payload.data : null;
      const point = history?.length ? history[history.length - 1] : msg.payload;
      const price = num(point?.value);
      if (price == null) return;
      quotes.set(pair.name, {
        price,
        at: num(point?.timestamp) || Date.now(),
        symbol: feed === "binance" ? pair.binance.toUpperCase() : pair.chainlink.toUpperCase(),
      });
      if (stopWhen(quotes)) finish();
    };
    ws.onerror = () => finish();
  });
}

async function livePrices(feed) {
  const quotes = await listenQuotes(feed);
  const rows = QUOTE_PAIRS.map((pair) => quotes.get(pair.name))
    .filter(Boolean)
    .map((quote) => ({
      name: QUOTE_PAIRS.find((pair) => (feed === "binance" ? pair.binance.toUpperCase() : pair.chainlink.toUpperCase()) === quote.symbol)?.name || quote.symbol,
      symbol: quote.symbol,
      price: quote.price,
      updated: quote.at,
    }));
  return {
    columns: [column("name", "text"), column("symbol", "text"), column("price", "number"), column("updated", "date")],
    rows,
    capped: false,
  };
}

export const KALSHI_LIVE_MARKET_JOINS = [
  {
    id: "trades",
    title: "Trades",
    detail: "Completed fills for each market, matched on its ticker.",
  },
  {
    id: "orderbook",
    title: "Order book",
    detail: "Current yes and no bid levels for each market.",
  },
  {
    id: "candlesticks",
    title: "Candlesticks",
    detail: "Price candles for each market.",
  },
];

function liveJoinColumns(endpointId, options) {
  const columns = kalshiLiveColumns(endpointId);
  if (options?.allColumns) return columns;
  const selected = columns.filter((column) => column.defaultOn);
  return selected.length ? selected : columns;
}

function projectLiveJoinRows(columns, records, limit) {
  return (records || []).slice(0, limit).map((record) => {
    const row = {};
    for (const entry of columns) row[entry.id] = cellValue(record?.[entry.id]);
    return row;
  });
}

async function getJsonRetry(url) {
  try {
    return await getJson(url);
  } catch (err) {
    const message = err instanceof Error ? err.message : "";
    if (!/too many requests/i.test(message)) throw err;
    await new Promise((resolve) => setTimeout(resolve, 2200));
    return getJson(url);
  }
}

/**
 * Live trades for one market. Preview stays at PREVIEW_ROW_CAP.
 * Save and run passes the plan row cap and follows Kalshi's cursor.
 */
export async function loadKalshiLiveTradesForTicker(ticker, limit = PREVIEW_ROW_CAP, range = {}, options) {
  const columns = liveJoinColumns("trades", options);
  const rowLimit = Math.max(1, Math.floor(Number(limit) || PREVIEW_ROW_CAP));
  const rows = [];
  let cursor = "";
  for (let page = 0; page < 500 && rows.length < rowLimit; page += 1) {
    const ask = Math.min(1000, rowLimit - rows.length);
    const params = new URLSearchParams({ ticker: String(ticker || ""), limit: String(ask) });
    if (Number.isFinite(Number(range.minTs))) params.set("min_ts", String(Math.floor(Number(range.minTs))));
    if (Number.isFinite(Number(range.maxTs))) params.set("max_ts", String(Math.floor(Number(range.maxTs))));
    if (cursor) params.set("cursor", cursor);
    const json = await getJsonRetry(`/api/integrations/kalshi-live/markets/trades?${params}`);
    const batch = (Array.isArray(json.trades) ? json.trades : []).map((row) => normalizeKalshiLiveTradeRow(row));
    rows.push(...batch);
    cursor = String(json.cursor || "").trim();
    if (!cursor || !batch.length) break;
  }
  const truncated = rows.length >= rowLimit && Boolean(cursor);
  return { columns, rows: projectLiveJoinRows(columns, rows, rowLimit), truncated };
}

/** Current order book for one market. Depth 100 is Kalshi's maximum. */
export async function loadKalshiLiveOrderbookForTicker(ticker, depth = 100, options) {
  const columns = liveJoinColumns("orderbook", options);
  const rawDepth = Number(depth);
  const levels = Number.isFinite(rawDepth) ? Math.max(0, Math.min(100, Math.floor(rawDepth))) : 100;
  const params = new URLSearchParams({ ticker: String(ticker || ""), depth: String(levels) });
  const json = await getJsonRetry(`/api/integrations/kalshi-live/markets/orderbook?${params}`);
  const rows = normalizeKalshiLiveOrderbook(json.ticker || ticker, json.orderbook_fp);
  return { columns, rows: projectLiveJoinRows(columns, rows, rows.length || 1) };
}

/**
 * One-minute candles for one market. Kalshi allows 5,000 candles in a request,
 * so a plan limit above that still stops there.
 */
export async function loadKalshiLiveCandlesticksForTicker(ticker, limit = PREVIEW_ROW_CAP, window = {}, options) {
  const columns = liveJoinColumns("candlesticks", options);
  const period = [1, 60, 1440].includes(Number(window.period)) ? Number(window.period) : 1;
  const rowLimit = Math.max(1, Math.min(KALSHI_CANDLESTICK_MAX_CANDLES, Math.floor(Number(limit) || PREVIEW_ROW_CAP)));
  const end = Math.floor(Number(window.maxTs) || Date.now() / 1000);
  const start = Math.floor(Number(window.minTs) || end - rowLimit * period * 60);
  const clamped = clampCandlestickWindowToKalshiCap(start, end, period);
  const params = new URLSearchParams({
    market_tickers: String(ticker || ""),
    start_ts: String(clamped.start_ts),
    end_ts: String(clamped.end_ts),
    period_interval: String(period),
    per_ticker: "1",
  });
  const json = await getJsonRetry(`/api/integrations/kalshi-live/markets/candlesticks?${params}`);
  const rows = flattenKalshiLiveCandlestickGroups(json.markets);
  return { columns, rows: projectLiveJoinRows(columns, rows, rowLimit) };
}

export function loadKalshiLiveMarketJoin(id, ticker, limit = PREVIEW_ROW_CAP, window = {}) {
  const spec = window && typeof window === "object" ? window : {};
  if (id === "orderbook") return loadKalshiLiveOrderbookForTicker(ticker, spec.depth);
  if (id === "candlesticks") return loadKalshiLiveCandlesticksForTicker(ticker, limit, spec);
  return loadKalshiLiveTradesForTicker(ticker, limit, spec);
}

/** Market metadata for one ticker, and its series when the market belongs to one. */
export async function loadKalshiLiveParentContext(ticker, { series = false } = {}) {
  const marketColumns = kalshiLiveColumns("markets");
  const seriesColumns = kalshiLiveColumns("series");
  const row = await loadKalshiLiveMarketByTicker(ticker);
  if (!row) return { marketColumns, market: null, seriesColumns, series: null, seriesTicker: "" };
  const [market] = projectLiveJoinRows(marketColumns, [row], 1);
  const eventTicker = String(row.event_ticker || "").trim();
  if (!series || !eventTicker) return { marketColumns, market, seriesColumns, series: null, seriesTicker: "" };
  const events = await loadKalshiLiveEventsByTickers([eventTicker]);
  const seriesTicker = String(events.rows?.[0]?.series_ticker || "").trim();
  if (!seriesTicker) return { marketColumns, market, seriesColumns, series: null, seriesTicker: "" };
  const loaded = await loadKalshiLiveSeriesByTickers([seriesTicker]);
  return { marketColumns, market, seriesColumns: loaded.columns || seriesColumns, series: loaded.rows?.[0] || null, seriesTicker };
}

/** One series row per ticker. Volume is included so the Volume column is filled. */
export async function loadKalshiLiveSeriesByTickers(tickers) {
  const columns = kalshiLiveColumns("series");
  const rows = [];
  for (const ticker of tickers || []) {
    const id = String(ticker || "").trim();
    if (!id) continue;
    const json = await getJsonRetry(
      `/api/integrations/kalshi-live/series?series_ticker=${encodeURIComponent(id)}&include_volume=true`,
    );
    const series = json?.series && typeof json.series === "object" ? json.series : json;
    rows.push(normalizeKalshiLiveSeriesRow(series));
  }
  return { columns, rows: projectLiveJoinRows(columns, rows, rows.length || 1) };
}

/** Series list for one or more categories. Each category is its own list request. */
export async function loadKalshiLiveSeriesDiscovery(spec = {}, limit = PREVIEW_ROW_CAP) {
  const columns = kalshiLiveColumns("series");
  const requested = Array.isArray(spec.categories)
    ? spec.categories
    : spec.category
      ? [spec.category]
      : [];
  const categories = [];
  const seenCategories = new Set();
  for (const value of requested) {
    const name = String(value || "").trim();
    if (!name || seenCategories.has(name)) continue;
    seenCategories.add(name);
    categories.push(name);
  }
  const keep = typeof spec.match === "function" ? spec.match : null;
  const scopes = categories.length ? categories : spec.unscoped ? [""] : [];
  const cap = Math.max(1, Math.floor(Number(limit) || PREVIEW_ROW_CAP));
  const maxPages = keep || spec.unscoped ? Math.min(8, Math.max(1, Math.floor(Number(spec.maxPages) || 8))) : 1;
  const seenTickers = new Set();
  const rows = [];
  let truncated = false;
  for (const category of scopes) {
    if (rows.length >= cap) break;
    let cursor = "";
    for (let page = 0; page < maxPages && rows.length < cap; page += 1) {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (spec.tag) params.set("tags", String(spec.tag));
      params.set("include_volume", "true");
      params.set("include_product_metadata", spec.includeProductMetadata ? "true" : "false");
      if (Number.isFinite(Number(spec.minUpdatedTs)) && Number(spec.minUpdatedTs) > 0) {
        params.set("min_updated_ts", String(Math.floor(Number(spec.minUpdatedTs))));
      }
      if (cursor) params.set("cursor", cursor);
      const json = await getJsonRetry(`/api/integrations/kalshi-live/series/list?${params}`);
      const series = Array.isArray(json.series) ? json.series : [];
      for (const raw of series) {
        const row = normalizeKalshiLiveSeriesRow(raw);
        if (keep && !keep(row)) continue;
        const ticker = String(row.ticker || "").trim();
        if (ticker && seenTickers.has(ticker)) continue;
        if (ticker) seenTickers.add(ticker);
        rows.push(row);
        if (rows.length >= cap) break;
      }
      cursor = String(json.cursor || "").trim();
      if (rows.length >= cap) {
        if (cursor) truncated = true;
        break;
      }
      if (!cursor || !series.length) break;
      if (page === maxPages - 1 && cursor) truncated = true;
    }
  }
  return { columns, rows: projectLiveJoinRows(columns, rows, rows.length || 1), truncated };
}

/** One event row per ticker. */
export async function loadKalshiLiveEventsByTickers(tickers, spec = {}) {
  const columns = kalshiLiveColumns("events");
  const rows = [];
  for (const ticker of tickers || []) {
    const id = String(ticker || "").trim();
    if (!id) continue;
    const params = new URLSearchParams({ ticker: id });
    if (spec.includeMarkets) params.set("with_nested_markets", "true");
    const json = await getJsonRetry(`/api/integrations/kalshi-live/events/get?${params}`);
    const event = json?.event && typeof json.event === "object" ? json.event : json;
    rows.push(normalizeKalshiLiveEventRow(event, { markets: json?.markets || event?.markets }));
  }
  return { columns, rows: projectLiveJoinRows(columns, rows, rows.length || 1) };
}

/** Event list. Each status is its own request. Pages continue until the cap. */
export async function loadKalshiLiveEventsDiscovery(spec = {}, limit = PREVIEW_ROW_CAP) {
  const columns = kalshiLiveColumns("events");
  const statuses = Array.isArray(spec.statuses) && spec.statuses.length ? spec.statuses : [""];
  const seriesTickers = Array.isArray(spec.seriesTickers) && spec.seriesTickers.length
    ? spec.seriesTickers
    : spec.seriesTicker
      ? [String(spec.seriesTicker)]
      : [""];
  const cap = Math.max(1, Math.floor(Number(limit) || PREVIEW_ROW_CAP));
  const keep = typeof spec.match === "function" ? spec.match : null;
  const seen = new Set();
  const rows = [];
  let truncated = false;
  const maxPages = Math.max(1, Math.min(25, Math.floor(Number(spec.maxPages) || 25)));
  for (const seriesTicker of seriesTickers) {
  if (rows.length >= cap) break;
  for (const status of statuses) {
    if (rows.length >= cap) break;
    let cursor = "";
    for (let page = 0; page < maxPages && rows.length < cap; page += 1) {
      const params = new URLSearchParams({ limit: "200" });
      if (status) params.set("status", status);
      if (seriesTicker) params.set("series_ticker", String(seriesTicker));
      if (Number(spec.minCloseTs) > 0) params.set("min_close_ts", String(Math.floor(Number(spec.minCloseTs))));
      if (Number(spec.minUpdatedTs) > 0) params.set("min_updated_ts", String(Math.floor(Number(spec.minUpdatedTs))));
      if (spec.includeMarkets) params.set("with_nested_markets", "true");
      if (spec.includeMilestones) params.set("with_milestones", "true");
      if (cursor) params.set("cursor", cursor);
      const json = await getJsonRetry(`/api/integrations/kalshi-live/events?${params}`);
      const events = Array.isArray(json.events) ? json.events : [];
      for (const raw of events) {
        const row = normalizeKalshiLiveEventRow(raw);
        if (keep && !keep(row)) continue;
        const ticker = String(row.event_ticker || "").trim();
        if (ticker && seen.has(ticker)) continue;
        if (ticker) seen.add(ticker);
        rows.push(row);
        if (rows.length >= cap) break;
      }
      cursor = String(json.cursor || "").trim();
      if (rows.length >= cap) {
        if (cursor) truncated = true;
        break;
      }
      if (!cursor || !events.length) break;
      if (page === maxPages - 1) truncated = true;
    }
  }
  }
  return { columns, rows: projectLiveJoinRows(columns, rows, rows.length || 1), truncated };
}

/** Markets inside one event. Kalshi accepts one event_ticker per request. */
export async function loadKalshiLiveEventMarkets(eventTicker, limit = PREVIEW_ROW_CAP) {
  const columns = kalshiLiveColumns("markets");
  const rows = await loadKalshiLiveMarketsForScope({ eventTicker, limit });
  return { columns, rows: projectLiveJoinRows(columns, rows, rows.length || 1) };
}

async function mapLimit(items, limit, fn) {
  const list = Array.isArray(items) ? items : [];
  const out = new Array(list.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(Math.max(1, limit), list.length) }, async () => {
    while (next < list.length) {
      const index = next;
      next += 1;
      out[index] = await fn(list[index], index);
    }
  });
  await Promise.all(workers);
  return out;
}

/** Social leaderboard. One category per request. The endpoint returns at most 100 ranks. */
export async function loadKalshiLiveLeaderboard(spec = {}) {
  const columns = kalshiLiveColumns("leaderboard");
  const metric = String(spec.metric || "projected_pnl");
  const timePeriod = String(spec.timePeriod || "all_time");
  const categories = Array.isArray(spec.categories) && spec.categories.length ? spec.categories : [""];
  const cap = Math.min(100, Math.max(1, Math.floor(Number(spec.limit) || PREVIEW_ROW_CAP)));
  const rows = [];
  const seen = new Set();
  for (const category of categories) {
    if (rows.length >= cap) break;
    const params = new URLSearchParams({
      metric_name: metric,
      time_period: timePeriod,
      limit: String(Math.min(100, cap)),
    });
    if (category) params.set("category", category);
    const json = await getJsonRetry(`/api/integrations/kalshi-live/social/leaderboard?${params}`);
    const ranks = Array.isArray(json.rank_list) ? json.rank_list : [];
    for (const raw of ranks) {
      const row = normalizeKalshiLiveLeaderboardRow(raw, { metricName: metric, timePeriod, category });
      const key = String(row.nickname || row.social_id || "").toLowerCase();
      if (key && seen.has(key)) continue;
      if (key) seen.add(key);
      rows.push(row);
      if (rows.length >= cap) break;
    }
  }
  return { columns, rows: projectLiveJoinRows(columns, rows, rows.length || 1) };
}

/** Public profile rows. One nickname per request. */
export async function loadKalshiLiveHolderProfiles(nicknames = []) {
  const columns = kalshiLiveColumns("holder_profile");
  const names = [...new Set((nicknames || []).map((name) => String(name || "").trim()).filter(Boolean))];
  const rows = [];
  for (const nickname of names) {
    const json = await getJsonRetry(
      `/api/integrations/kalshi-live/social/profile?nickname=${encodeURIComponent(nickname)}`,
    );
    rows.push(normalizeKalshiLiveHolderProfileRow(json));
  }
  return { columns, rows: projectLiveJoinRows(columns, rows, rows.length || 1) };
}

/**
 * Public social trades. Nickname, series, and event are optional.
 * A page that still has a cursor past the cap is marked truncated.
 */
export async function loadKalshiLiveHolderTrades(spec = {}) {
  const columns = kalshiLiveColumns("trades_by_holder");
  const nicknames = Array.isArray(spec.nicknames) && spec.nicknames.length ? spec.nicknames : [""];
  const cap = Math.max(1, Math.floor(Number(spec.limit) || PREVIEW_ROW_CAP));
  const rows = [];
  let visibility = "";
  let truncated = false;
  for (const nickname of nicknames) {
    let cursor = "";
    for (let page = 0; page < 40 && rows.length < cap; page += 1) {
      const params = new URLSearchParams({
        page_size: String(Math.min(200, cap - rows.length)),
      });
      if (nickname) params.set("nickname", nickname);
      if (spec.seriesTicker) params.set("series_ticker", spec.seriesTicker);
      if (spec.eventTicker) params.set("event_ticker", spec.eventTicker);
      if (spec.minAmount != null && spec.minAmount !== "") params.set("min_amount", String(spec.minAmount));
      if (cursor) params.set("cursor", cursor);
      const json = await getJsonRetry(`/api/integrations/kalshi-live/social/trades?${params}`);
      if (json.visibility_state) visibility = String(json.visibility_state);
      const batch = Array.isArray(json.trades) ? json.trades : [];
      for (const raw of batch) {
        rows.push(normalizeKalshiLiveHolderTradeRow(raw));
        if (rows.length >= cap) break;
      }
      cursor = String(json.cursor || "").trim();
      if (rows.length >= cap && cursor) truncated = true;
      if (!cursor || !batch.length) break;
    }
  }
  return {
    columns,
    rows: projectLiveJoinRows(columns, rows, rows.length || 1),
    truncated,
    visibility,
  };
}

/** Nickname search, then shared metrics and holdings for the profiles that come back. */
export async function loadKalshiLiveTraderSearch(spec = {}) {
  const columns = kalshiLiveColumns("search_traders");
  const query = String(spec.query || "").trim();
  if (query.length < 2) return { columns, rows: [] };
  const includeMetrics = spec.includeMetrics !== false;
  const includeHoldings = Boolean(spec.includeHoldings);
  const cap = Math.min(500, Math.max(1, Math.floor(Number(spec.limit) || PREVIEW_ROW_CAP)));
  const profiles = [];
  let cursor = "";
  let truncated = false;
  for (let page = 0; page < 8 && profiles.length < cap; page += 1) {
    const params = new URLSearchParams({
      query,
      limit: String(Math.min(100, cap - profiles.length)),
    });
    if (cursor) params.set("cursor", cursor);
    const json = await getJsonRetry(`/api/integrations/kalshi-live/search/social-profiles?${params}`);
    const batch = Array.isArray(json.profiles) ? json.profiles : [];
    profiles.push(...batch);
    cursor = String(json.cursor || "").trim();
    if (profiles.length >= cap && cursor) truncated = true;
    if (!cursor || !batch.length) break;
  }
  const sliced = profiles.slice(0, cap);
  const enriched = await mapLimit(sliced, 4, async (profile) => {
    const nickname = String(profile?.nickname || "").trim();
    let metrics = null;
    let holdingsPayload = null;
    if (nickname && includeMetrics) {
      metrics = await getJson(
        `/api/integrations/kalshi-live/social/profile/metrics?nickname=${encodeURIComponent(nickname)}`,
      ).catch(() => null);
    }
    if (nickname && includeHoldings) {
      holdingsPayload = await getJson(
        `/api/integrations/kalshi-live/social/profile/holdings?nickname=${encodeURIComponent(nickname)}&limit=100`,
      ).catch(() => null);
    }
    return { profile, metrics, holdingsPayload };
  });
  const records = projectKalshiLiveSearchTradersRows(enriched, undefined, { includeMetrics, includeHoldings });
  return { columns, rows: projectLiveJoinRows(columns, records, records.length || 1), truncated };
}

const FORECAST_PERIODS = new Set([0, 1, 60, 1440]);
const EVENT_CANDLE_PERIODS = new Set([1, 60, 1440]);

async function fetchKalshiLiveEventForecastRows(target, spec) {
  const eventTicker = String(target.eventTicker || "").trim();
  const seriesTicker = String(target.seriesTicker || "").trim() || inferSeriesTickerFromEvent(eventTicker);
  if (!eventTicker || !seriesTicker) return [];
  const end = Number(spec.maxTs) > 0 ? Math.floor(Number(spec.maxTs)) : Math.floor(Date.now() / 1000);
  const start = Number(spec.minTs) > 0 ? Math.floor(Number(spec.minTs)) : end - 24 * 3600;
  const period = FORECAST_PERIODS.has(Number(spec.period)) ? Number(spec.period) : 60;
  const percentiles = (Array.isArray(spec.percentiles) ? spec.percentiles : [1000, 2500, 5000, 7500, 9000])
    .map((value) => Math.floor(Number(value)))
    .filter((value) => value >= 0 && value <= 9999)
    .slice(0, 10);
  const params = new URLSearchParams({
    ticker: eventTicker,
    series_ticker: seriesTicker,
    start_ts: String(start),
    end_ts: String(end),
    period_interval: String(period),
  });
  for (const percentile of percentiles.length ? percentiles : [1000, 2500, 5000, 7500, 9000]) {
    params.append("percentiles", String(percentile));
  }
  const json = await getJsonRetry(`/api/integrations/kalshi-live/events/forecast-percentile-history?${params}`);
  return projectKalshiLiveEventForecastRows(json.forecast_history).map((row) => ({
    ...row,
    event_ticker: row.event_ticker || eventTicker,
  }));
}

/** Forecast history for chosen events, or for the events inside a chosen series. */
export async function loadKalshiLiveEventForecast(spec = {}) {
  const columns = kalshiLiveColumns("event_forecast");
  const seen = new Set();
  const targets = [];
  for (const event of Array.isArray(spec.events) ? spec.events : []) {
    const eventTicker = String(event.eventTicker || event.ticker || "").trim();
    if (!eventTicker || seen.has(eventTicker)) continue;
    seen.add(eventTicker);
    targets.push({
      eventTicker,
      seriesTicker: String(event.seriesTicker || "").trim() || inferSeriesTickerFromEvent(eventTicker),
    });
  }
  for (const series of Array.isArray(spec.seriesTickers) ? spec.seriesTickers : []) {
    const ticker = String(series || "").trim();
    if (!ticker) continue;
    const discovered = await loadKalshiLiveEventsDiscovery(
      { seriesTickers: [ticker], statuses: [""], maxPages: 2 },
      spec.eventCap || 25,
    );
    for (const row of discovered.rows || []) {
      const eventTicker = String(row.event_ticker || "").trim();
      if (!eventTicker || seen.has(eventTicker)) continue;
      seen.add(eventTicker);
      targets.push({
        eventTicker,
        seriesTicker: String(row.series_ticker || ticker).trim() || ticker,
      });
    }
  }
  const cap = Math.max(1, Math.floor(Number(spec.limit) || PREVIEW_ROW_CAP));
  const eventCap = spec.previewFirst ? 1 : targets.length;
  const rows = [];
  for (const target of targets.slice(0, eventCap)) {
    const batch = await fetchKalshiLiveEventForecastRows(target, spec);
    rows.push(...batch);
    if (rows.length >= cap) break;
  }
  return {
    columns,
    rows: projectLiveJoinRows(columns, rows, cap),
    truncated: targets.length > eventCap || rows.length > cap,
    events: targets,
  };
}

/** Candlesticks for every market inside one event. */
export async function loadKalshiLiveEventCandlesticks(spec = {}) {
  const columns = kalshiLiveColumns("event_candlesticks");
  const eventTicker = String(spec.eventTicker || "").trim();
  const seriesTicker = String(spec.seriesTicker || "").trim() || inferSeriesTickerFromEvent(eventTicker);
  if (!eventTicker || !seriesTicker) return { columns, rows: [], truncated: false };
  const end = Number(spec.maxTs) > 0 ? Math.floor(Number(spec.maxTs)) : Math.floor(Date.now() / 1000);
  const start = Number(spec.minTs) > 0 ? Math.floor(Number(spec.minTs)) : end - 24 * 3600;
  const period = EVENT_CANDLE_PERIODS.has(Number(spec.period)) ? Number(spec.period) : 60;
  const params = new URLSearchParams({
    ticker: eventTicker,
    series_ticker: seriesTicker,
    start_ts: String(start),
    end_ts: String(end),
    period_interval: String(period),
  });
  const json = await getJsonRetry(`/api/integrations/kalshi-live/events/candlesticks?${params}`);
  const tickers = Array.isArray(json.market_tickers) ? json.market_tickers : [];
  const sticks = Array.isArray(json.market_candlesticks) ? json.market_candlesticks : [];
  const flat = flattenKalshiLiveCandlestickGroups(
    tickers.map((ticker, index) => ({
      market_ticker: ticker,
      candlesticks: Array.isArray(sticks[index]) ? sticks[index] : [],
    })),
  );
  const cap = Math.max(1, Math.floor(Number(spec.limit) || PREVIEW_ROW_CAP));
  return { columns, rows: projectLiveJoinRows(columns, flat, cap), truncated: flat.length > cap };
}

/** Multivariate events. One series ticker per request. A collection ticker is the other filter. */
export async function loadKalshiLiveMultivariate(spec = {}) {
  const columns = kalshiLiveColumns("multivariate_events");
  const cap = Math.max(1, Math.floor(Number(spec.limit) || PREVIEW_ROW_CAP));
  const seriesTickers = Array.isArray(spec.seriesTickers) ? spec.seriesTickers.filter(Boolean) : [];
  const collection = String(spec.collectionTicker || "").trim();
  const requests = seriesTickers.length
    ? seriesTickers.map((seriesTicker) => ({ seriesTicker, collectionTicker: "" }))
    : [{ seriesTicker: "", collectionTicker: collection }];
  const keep = typeof spec.match === "function" ? spec.match : null;
  const seen = new Set();
  const rows = [];
  let truncated = false;
  const maxPages = Math.max(1, Math.min(25, Math.floor(Number(spec.maxPages) || 2)));
  for (const request of requests) {
    if (rows.length >= cap) break;
    let cursor = "";
    for (let page = 0; page < maxPages && rows.length < cap; page += 1) {
      const params = buildKalshiLiveMultivariateEventsDiscoveryQueryParams(request, {
        limit: 100,
        withNestedMarkets: Boolean(spec.includeMarkets),
      });
      if (cursor) params.cursor = cursor;
      const json = await getJsonRetry(`/api/integrations/kalshi-live/events/multivariate?${new URLSearchParams(params)}`);
      const events = Array.isArray(json.events) ? json.events : [];
      for (const raw of events) {
        const row = normalizeKalshiLiveEventRow(raw);
        if (keep && !keep(row)) continue;
        const ticker = String(row.event_ticker || "").trim();
        if (ticker && seen.has(ticker)) continue;
        if (ticker) seen.add(ticker);
        rows.push(row);
        if (rows.length >= cap) break;
      }
      cursor = String(json.cursor || "").trim();
      if (rows.length >= cap) {
        if (cursor) truncated = true;
        break;
      }
      if (!cursor || !events.length) break;
      if (page === maxPages - 1 && cursor) truncated = true;
    }
  }
  return { columns, rows: projectLiveJoinRows(columns, rows, rows.length || 1), truncated };
}

/**
 * One-off Kalshi Live pull. Trades, candlesticks, and the order book are one market.
 * Series is a ticker list, or a category discovery when no tickers are selected.
 * Events is a ticker list, or a status and series discovery when no tickers are selected.
 * Traders covers the leaderboard, a nickname search, a public profile, and public trades.
 */
export function loadKalshiLiveDirect(tableId, spec = {}) {
  const limit = spec.limit || PREVIEW_ROW_CAP;
  const options = { allColumns: true };
  if (tableId === "trades") return loadKalshiLiveTradesForTicker(spec.ticker, limit, spec, options);
  if (tableId === "orderbook") return loadKalshiLiveOrderbookForTicker(spec.ticker, spec.depth, options);
  if (tableId === "candlesticks") return loadKalshiLiveCandlesticksForTicker(spec.ticker, limit, spec, options);
  if (tableId === "series" && spec.mode === "discover") return loadKalshiLiveSeriesDiscovery(spec, limit);
  if (tableId === "series") return loadKalshiLiveSeriesByTickers(spec.tickers || []);
  if (tableId === "events" && spec.mode === "discover") return loadKalshiLiveEventsDiscovery(spec, limit);
  if (tableId === "events") return loadKalshiLiveEventsByTickers(spec.tickers || [], spec);
  if (tableId === "event_forecast") return loadKalshiLiveEventForecast(spec);
  if (tableId === "event_candlesticks") return loadKalshiLiveEventCandlesticks(spec);
  if (tableId === "multivariate_events") return loadKalshiLiveMultivariate(spec);
  if (tableId === "leaderboard") return loadKalshiLiveLeaderboard(spec);
  if (tableId === "search_traders") return loadKalshiLiveTraderSearch(spec);
  if (tableId === "holder_profile") return loadKalshiLiveHolderProfiles(spec.nicknames || []);
  if (tableId === "trades_by_holder") return loadKalshiLiveHolderTrades(spec);
  return Promise.resolve({ columns: [], rows: [] });
}

const LOADERS = {
  "kalshiHistorical:markets": kalshiHistoricalMarkets,
  "kalshiHistorical:trades": kalshiHistoricalTrades,
  "kalshiHistoricalV2:markets": kalshiV2Markets,
  "kalshiHistoricalV2:trades": kalshiV2Trades,
  "kalshiHistoricalV2:candlesticks": kalshiV2Candlesticks,
  ...Object.fromEntries(
    KALSHI_LIVE_CONNECT_ENDPOINTS.map((endpoint) => [
      `kalshiLive:${endpoint.id}`,
      () => kalshiLiveEndpoint(endpoint.id),
    ]),
  ),
  "polymarketHistorical:markets": polymarketHistoricalMarkets,
  "polymarketHistorical:trades": polymarketHistoricalTrades,
  "polymarketHistorical:blocks": polymarketHistoricalBlocks,
  "polymarket:markets": polymarketLiveMarkets,
  "chainlink:prices": () => livePrices("chainlink"),
  "binance:prices": () => livePrices("binance"),
};

function universeCountKey(integrationId, tableId, filter) {
  const lake = EXACT_UNIVERSE[integrationId];
  const tables = lake === "polymarket" ? ["markets", "trades", "blocks"] : ["markets", "trades"];
  if (!lake || !tables.includes(tableId)) return "";
  if (Array.isArray(filter?.and) || Array.isArray(filter?.or)) {
    const and = Array.isArray(filter?.and) ? filter.and : [];
    const or = Array.isArray(filter?.or) ? filter.or : [];
    return `${lake}:${tableId}:${and.length || or.length ? JSON.stringify({ and, or }) : ""}`;
  }
  const column = String(filter?.column || "").trim();
  const value = String(filter?.value || "").trim();
  const narrowed = Boolean(column && value);
  return `${lake}:${tableId}:${narrowed ? `${column}\0${value.toLowerCase()}` : ""}`;
}

export function peekBuildUniverseCount(integrationId, tableId, filter) {
  const key = universeCountKey(integrationId, tableId, filter);
  if (!key || !countValues.has(key)) return null;
  return countValues.get(key);
}

export function loadBuildUniverseCount(integrationId, tableId, filter) {
  const lake = EXACT_UNIVERSE[integrationId];
  const key = universeCountKey(integrationId, tableId, filter);
  if (!key) return Promise.resolve(null);
  if (countValues.has(key)) return Promise.resolve(countValues.get(key));
  if (!countCache.has(key)) {
    const andFilters = Array.isArray(filter?.and) ? filter.and : null;
    const orFilters = Array.isArray(filter?.or) ? filter.or : [];
    const column = String(filter?.column || "").trim();
    const value = String(filter?.value || "").trim();
    const narrowed = andFilters ? andFilters.length > 0 || orFilters.length > 0 : Boolean(column && value);
    const virtualFilter = [...(andFilters || []), ...orFilters].some(
      (predicate) =>
        predicate?.column === "kalshi_taxonomy_category" || predicate?.column === "kalshi_event_ticker_category",
    );
    const body = virtualFilter
      ? {
          lake,
          table: tableId,
          queryType: "compose",
          limit: 1,
          caseSensitive: false,
          filters: { and: andFilters || [], or: orFilters },
          compose: {
            select: [{ column: "ticker", alias: "row_count", aggregate: "count" }],
            groupByAliases: [],
          },
        }
      : {
          lake,
          table: tableId,
          queryType: "count",
          countAlias: "row_count",
          limit: 1,
          caseSensitive: false,
          filters: andFilters?.length || orFilters.length
            ? { and: andFilters || [], or: orFilters }
            : narrowed
              ? { and: [{ column, kind: "string", op: "contains", value }], or: [] }
              : null,
        };
    countCache.set(
      key,
      fetchAthenaLakeSample(body, { maxWaitMs: 180000, pollIntervalMs: 800 })
        .then((result) => {
          const total = Number(result.rows?.[0]?.[0]);
          if (!Number.isFinite(total)) throw new Error("Count missing");
          countValues.set(key, total);
          return total;
        })
        .catch((error) => {
          countCache.delete(key);
          throw error;
        }),
    );
  }
  return countCache.get(key);
}

export function loadBuildPreview(integrationId, tableId, options = {}) {
  const key = `${integrationId}:${tableId}`;
  const loader = LOADERS[key];
  if (!loader) return Promise.reject(new Error("This table is not available yet"));
  if (options.fresh || !pullCache.has(key)) {
    const pending = loader().catch((error) => {
      if (pullCache.get(key) === pending) pullCache.delete(key);
      throw error;
    });
    pullCache.set(key, pending);
  }
  return pullCache.get(key);
}

