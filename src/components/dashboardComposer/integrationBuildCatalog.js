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
import { KALSHI_LIVE_CANDLESTICK_COLUMNS } from "@/lib/kalshiLive/candlesticksColumns";
import { flattenKalshiLiveCandlestickGroups } from "@/lib/kalshiLive/normalizeCandlestickRow";
import { KALSHI_LIVE_MARKETS_COLUMNS } from "@/lib/kalshiLive/marketsColumns";
import { normalizeKalshiLiveMarketRow } from "@/lib/kalshiLive/normalizeMarketRow";
import { normalizeKalshiLiveSeriesRow } from "@/lib/kalshiLive/normalizeSeriesRow";
import { normalizeKalshiLiveTradeRow } from "@/lib/kalshiLive/normalizeTradeRow";
import { normalizeKalshiLiveOrderbook } from "@/lib/kalshiLive/normalizeOrderbookRow";
import { normalizeKalshiLiveEventRow } from "@/lib/kalshiLive/normalizeEventRow";
import { projectKalshiLiveEventForecastRows } from "@/lib/kalshiLive/normalizeEventForecastRow";
import { normalizeKalshiLiveLeaderboardRow } from "@/lib/kalshiLive/normalizeLeaderboardRow";
import { normalizeKalshiLiveHolderProfileRow } from "@/lib/kalshiLive/normalizeHolderProfileRow";
import { normalizeKalshiLiveHolderTradeRow } from "@/lib/kalshiLive/normalizeHolderTradeRow";
import { normalizeKalshiLiveSearchTradersRow } from "@/lib/kalshiLive/normalizeSearchTradersRow";
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
export function loadKalshiHistoricalTradesForTicker(ticker, limit = PREVIEW_ROW_CAP) {
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
  return fetchAthenaLakeSample(request, { maxWaitMs, pollIntervalMs: 800 }).then((result) => ({
    columns,
    rows: rowsFromAthenaCells(result, rowLimit),
  }));
}

/**
 * Market metadata for the tickers in a trades pull. One row per ticker.
 * Large ticker lists are queried in chunks so the IN list stays valid.
 */
export async function loadKalshiHistoricalMarketsForTickers(tickers) {
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
    });
    for (const row of rowsFromAthenaCells(result, chunk.length)) {
      const ticker = String(row.ticker || "").trim();
      if (ticker && seenRow.has(ticker)) continue;
      if (ticker) seenRow.add(ticker);
      rows.push(row);
    }
  }
  return { columns, rows };
}

/** Run a locked compose request. Preview stays on its own 50-row fetch. */
export function loadAthenaComposeRows(request) {
  const rowLimit = Number(request?.limit);
  const cap = Number.isFinite(rowLimit) && rowLimit > 0 ? Math.floor(rowLimit) : undefined;
  return fetchAthenaLakeSample(cap ? { ...request, limit: cap } : request, {
    maxWaitMs: 600000,
    pollIntervalMs: 800,
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
  event_forecast: ["event_ticker", "end_period_ts", "percentile_pct", "numerical_forecast", "formatted_forecast"],
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

async function openLiveMarket() {
  const json = await getJson(
    `/api/integrations/kalshi-live/markets?discovery=1&limit=1&status=open&mve_filter=exclude`,
  );
  return (Array.isArray(json.markets) ? json.markets : [])[0] || null;
}

async function openLiveEvent() {
  const json = await getJson(
    `/api/integrations/kalshi-live/events?limit=1&status=open&with_nested_markets=1&with_milestones=1`,
  );
  return (Array.isArray(json.events) ? json.events : [])[0] || null;
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
  if (endpointId === "candlesticks") {
    const listed = await getJson(
      `/api/integrations/kalshi-live/markets?discovery=1&limit=8&status=open&mve_filter=exclude`,
    );
    const markets = Array.isArray(listed.markets) ? listed.markets : [];
    const end = Math.floor(Date.now() / 1000);
    const start = end - PREVIEW_ROW_CAP * 60;
    let fallback = [];
    for (const market of markets) {
      if (!market?.ticker) continue;
      const json = await getJson(
        `/api/integrations/kalshi-live/markets/candlesticks?market_tickers=${encodeURIComponent(market.ticker)}&start_ts=${start}&end_ts=${end}&period_interval=1&per_ticker=1`,
      );
      const rows = flattenKalshiLiveCandlestickGroups(json.markets);
      if (rows.length > fallback.length) fallback = rows;
      if (rows.length >= 8) return rows;
    }
    return fallback;
  }
  if (endpointId === "trades") {
    const market = await openLiveMarket();
    if (!market?.ticker) return [];
    const json = await getJson(
      `/api/integrations/kalshi-live/markets/trades?ticker=${encodeURIComponent(market.ticker)}&limit=${PREVIEW_ROW_CAP}`,
    );
    return (Array.isArray(json.trades) ? json.trades : []).map((row) => normalizeKalshiLiveTradeRow(row));
  }
  if (endpointId === "orderbook") {
    const market = await openLiveMarket();
    if (!market?.ticker) return [];
    const json = await getJson(
      `/api/integrations/kalshi-live/markets/orderbook?ticker=${encodeURIComponent(market.ticker)}&depth=20`,
    );
    return normalizeKalshiLiveOrderbook(json.ticker || market.ticker, json.orderbook_fp);
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
  if (endpointId === "event_candlesticks") {
    const event = await openLiveEvent();
    if (!event?.event_ticker || !event?.series_ticker) return [];
    const end = Math.floor(Date.now() / 1000);
    const start = end - 3600;
    const json = await getJson(
      `/api/integrations/kalshi-live/events/candlesticks?ticker=${encodeURIComponent(event.event_ticker)}&series_ticker=${encodeURIComponent(event.series_ticker)}&start_ts=${start}&end_ts=${end}&period_interval=60`,
    );
    const tickers = Array.isArray(json.market_tickers) ? json.market_tickers : [];
    const sticks = Array.isArray(json.market_candlesticks) ? json.market_candlesticks : [];
    return flattenKalshiLiveCandlestickGroups(
      tickers.map((ticker, index) => ({
        market_ticker: ticker,
        candlesticks: Array.isArray(sticks[index]) ? sticks[index] : [],
      })),
    );
  }
  if (endpointId === "event_forecast") {
    const event = await openLiveEvent();
    if (!event?.event_ticker || !event?.series_ticker) return [];
    const end = Math.floor(Date.now() / 1000);
    const start = end - 6 * 3600;
    const params = new URLSearchParams({
      ticker: event.event_ticker,
      series_ticker: event.series_ticker,
      start_ts: String(start),
      end_ts: String(end),
      period_interval: "60",
    });
    for (const percentile of [1000, 2500, 5000, 7500, 9000]) params.append("percentiles", String(percentile));
    const json = await getJson(`/api/integrations/kalshi-live/events/forecast-percentile-history?${params.toString()}`);
    return projectKalshiLiveEventForecastRows(json.forecast_history);
  }
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

export function loadBuildPreview(integrationId, tableId) {
  const key = `${integrationId}:${tableId}`;
  const loader = LOADERS[key];
  if (!loader) return Promise.reject(new Error("This table is not available yet"));
  if (!pullCache.has(key)) pullCache.set(key, loader());
  return pullCache.get(key).catch((error) => {
    pullCache.delete(key);
    throw error;
  });
}

