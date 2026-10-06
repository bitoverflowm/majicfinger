/** One-off Kalshi Live market endpoints. These are not the markets join. */

import { KALSHI_LIVE_CANDLESTICK_PERIOD_OPTIONS } from "@/lib/kalshiLive/candlesticksColumns";
import { dateRangePreset } from "@/components/dashboardComposer/dateRangePresets";

export const KALSHI_LIVE_DIRECT_TABLES = ["series", "events", "candlesticks", "trades", "orderbook"];

const EVENT_STATUSES = [
  ["unopened", "Unopened"],
  ["open", "Open"],
  ["closed", "Closed"],
  ["settled", "Settled"],
];

const DIRECT_MARKET_TABLES = ["trades", "candlesticks", "orderbook"];

const TRADE_ENUMS = {
  taker_outcome_side: [
    ["yes", "Yes"],
    ["no", "No"],
  ],
  taker_book_side: [
    ["bid", "Bid"],
    ["ask", "Ask"],
  ],
  taker_side: [
    ["yes", "Yes"],
    ["no", "No"],
  ],
};

const ORDERBOOK_ENUMS = {
  side: [
    ["yes", "Yes"],
    ["no", "No"],
  ],
};

const DAY = 24 * 60 * 60;

export function isKalshiLiveDirectTable(tableId) {
  return KALSHI_LIVE_DIRECT_TABLES.includes(tableId);
}

export function defaultKalshiLiveDirectQuery(tableId, now = Date.now()) {
  const maxTs = Math.floor(now / 1000);
  return {
    mode: "tickers",
    minTs: maxTs - DAY,
    maxTs,
    period: tableId === "candlesticks" ? 60 : 1,
    depth: 20,
    category: "",
    tag: "",
    includeProductMetadata: false,
    minUpdatedTs: "",
    sheetMode: tableId === "series" || tableId === "events" ? "combined" : "sheet",
  };
}

export function directMarketTickers(picks) {
  const seen = new Set();
  const markets = [];
  for (const pick of picks || []) {
    const fromRows = (pick?.rows || []).map((row) => String(row?.ticker || "").trim()).filter(Boolean);
    const list = fromRows.length ? fromRows : pick?.kind === "market" && pick.ticker ? [String(pick.ticker).trim()] : [];
    for (const ticker of list) {
      if (!ticker || seen.has(ticker)) continue;
      seen.add(ticker);
      markets.push({
        ticker,
        label: ticker,
        title: String(pick?.title || ticker),
      });
    }
  }
  return markets;
}

export function directEventTickers(picks) {
  const seen = new Set();
  const tickers = [];
  for (const pick of picks || []) {
    if (pick?.kind !== "event") continue;
    const ticker = String(pick.ticker || "").trim();
    if (!ticker || seen.has(ticker)) continue;
    seen.add(ticker);
    tickers.push(ticker);
  }
  return tickers;
}

export function directSeriesTickers(picks) {
  const seen = new Set();
  const tickers = [];
  for (const pick of picks || []) {
    if (pick?.kind !== "series") continue;
    const ticker = String(pick.ticker || "").trim();
    if (!ticker || seen.has(ticker)) continue;
    seen.add(ticker);
    tickers.push(ticker);
  }
  return tickers;
}

/** Selected series categories. The list endpoint takes one category, so each is requested on its own. */
export function seriesDiscoveryCategories(filters) {
  const include = filters?.category?.include;
  if (!Array.isArray(include)) return [];
  const seen = new Set();
  const categories = [];
  for (const value of include) {
    const name = String(value || "").trim();
    if (!name || seen.has(name)) continue;
    seen.add(name);
    categories.push(name);
  }
  return categories;
}

/** Selected event statuses. The list endpoint takes one status, so each is requested on its own. */
export function eventDiscoveryStatuses(filters) {
  const include = filters?.status?.include;
  if (!Array.isArray(include)) return [];
  const allowed = new Set(EVENT_STATUSES.map(([value]) => value));
  const seen = new Set();
  const statuses = [];
  for (const value of include) {
    const name = String(value || "").trim();
    if (!name || !allowed.has(name) || seen.has(name)) continue;
    seen.add(name);
    statuses.push(name);
  }
  return statuses;
}

/** Series tickers from the events attribute. The list endpoint takes one, so each is requested on its own. */
export function eventSeriesTickers(filters) {
  const filter = filters?.series_ticker;
  const tags = Array.isArray(filter?.containsTags) ? filter.containsTags : [];
  const draft = String(filter?.contains || "").trim();
  const seen = new Set();
  const tickers = [];
  for (const value of [...tags, draft]) {
    const ticker = String(value || "").trim().toUpperCase();
    if (!ticker || seen.has(ticker)) continue;
    seen.add(ticker);
    tickers.push(ticker);
  }
  return tickers;
}

/** One series ticker from the events attribute, or "". */
export function eventSeriesTicker(filters) {
  return eventSeriesTickers(filters)[0] || "";
}

/** Unix seconds for "closes after", or "" when unset. */
export function eventClosesAfter(filters) {
  const raw = Number(filters?.min_close_ts?.minUpdatedTs);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : "";
}

/** Status first, then the series, then the two discover times, then the other columns. */
export function kalshiLiveEventAttributeColumns(columns) {
  const list = Array.isArray(columns) ? columns : [];
  const byId = new Map(list.map((column) => [column.id, column]));
  const status = {
    id: "status",
    title: "Status",
    type: "text",
    queryOnly: true,
    control: "category",
    enumOptions: EVENT_STATUSES,
  };
  const series = {
    ...(byId.get("series_ticker") || { id: "series_ticker", type: "text", title: "Series ticker" }),
    title: "Series ticker",
    exactTickers: true,
  };
  const closes = {
    id: "min_close_ts",
    title: "Closes after",
    type: "date",
    queryOnly: true,
    control: "updated-after",
    description: "Only events with a market that closes after this time.",
  };
  const updated = {
    ...(byId.get("last_updated_ts") || { id: "last_updated_ts", type: "date", title: "Last updated after" }),
    title: "Last updated after",
    control: "updated-after",
    description: "Only events whose metadata was updated after this time.",
  };
  const rest = list
    .filter((column) => column.id !== "series_ticker" && column.id !== "last_updated_ts")
    .map((column) => (column.type === "date" ? { ...column, dateEpoch: "iso" } : column));
  return [status, series, closes, updated, ...rest];
}

/** Unix seconds for "last updated after", or "" when unset. */
export function seriesUpdatedAfter(filters) {
  const raw = Number(filters?.last_updated_ts?.minUpdatedTs);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : "";
}

/**
 * Category first, then the discover "last updated after" time, then the other columns.
 * @param {Array<{ id: string, title?: string, type?: string, description?: string }>} columns
 * @param {string[]} categories
 * @param {{ loading?: boolean }} [opts]
 */
export function kalshiLiveSeriesAttributeColumns(columns, categories = [], opts = {}) {
  const list = Array.isArray(columns) ? columns : [];
  const byId = new Map(list.map((column) => [column.id, column]));
  const category = {
    ...(byId.get("category") || { id: "category", type: "text", title: "Category" }),
    title: "Category",
    control: "category",
    enumLoading: Boolean(opts.loading),
    enumOptions: (categories || []).map((name) => [name, name]),
  };
  const updated = {
    ...(byId.get("last_updated_ts") || { id: "last_updated_ts", type: "date", title: "Last updated after" }),
    title: "Last updated after",
    control: "updated-after",
    description: "Only series whose metadata was updated after this time.",
  };
  const rest = list.filter((column) => column.id !== "category" && column.id !== "last_updated_ts");
  return [category, updated, ...rest];
}

function isoDayUnix(iso, edge) {
  const [year, month, day] = String(iso || "").split("-").map(Number);
  if (!year || !month || !day) return null;
  const date =
    edge === "end" ? new Date(year, month - 1, day, 23, 59, 59) : new Date(year, month - 1, day, 0, 0, 0);
  const seconds = Math.floor(date.getTime() / 1000);
  return Number.isFinite(seconds) ? seconds : null;
}

/** Past 24 hours, plus period or depth, so the attribute list opens on the same window the pull uses. */
export function defaultDirectAttributeFilters(tableId, now = new Date()) {
  if (!DIRECT_MARKET_TABLES.includes(tableId)) return {};
  const range = dateRangePreset("past-24h", now);
  const filters = {
    time_range: { from: range?.from || "", to: range?.to || "", preset: "past-24h" },
  };
  if (tableId === "candlesticks") filters.period_interval = { value: "60" };
  if (tableId === "orderbook") filters.depth = { value: "20" };
  return filters;
}

/**
 * Query controls first, then every response column with a control that matches its type.
 * The date range, period, and depth are the request. They are not columns on the sheet.
 */
export function kalshiLiveDirectAttributeColumns(tableId, columns) {
  if (!DIRECT_MARKET_TABLES.includes(tableId)) return [];
  const enums = tableId === "trades" ? TRADE_ENUMS : tableId === "orderbook" ? ORDERBOOK_ENUMS : {};
  const shaped = (columns || []).map((column) => {
    if (enums[column.id]) return { ...column, enumOptions: enums[column.id] };
    if (column.type === "date") {
      return { ...column, dateEpoch: column.id === "end_period_ts" ? "unix" : "iso" };
    }
    return column;
  });
  const query = [
    {
      id: "time_range",
      title: "Date range",
      type: "date",
      queryOnly: true,
      control: "query-range",
      description:
        tableId === "trades"
          ? "Start and end of trade data"
          : tableId === "orderbook"
            ? "Start and end of order book data"
            : "Start and end of candlestick data",
    },
  ];
  if (tableId === "candlesticks") {
    query.push({
      id: "period_interval",
      title: "Period",
      type: "text",
      queryOnly: true,
      control: "period",
      enumOptions: KALSHI_LIVE_CANDLESTICK_PERIOD_OPTIONS.map((option) => [String(option.value), option.label]),
      description: "Candle Size",
    });
  }
  if (tableId === "orderbook") {
    query.push({
      id: "depth",
      title: "Depth",
      type: "number",
      queryOnly: true,
      control: "depth",
      description: "Price levels on each side. 0 to 100.",
    });
  }
  return [...query, ...shaped];
}

/** Unix window, candle period, and book depth read from the attribute filters. */
export function directPullWindow(tableId, filters, fallback = {}) {
  const range = filters?.time_range || {};
  const ranged = tableId === "trades" || tableId === "candlesticks";
  const minFromRange = ranged ? isoDayUnix(range.from, "start") : null;
  const maxFromRange = ranged ? isoDayUnix(range.to, "end") : null;
  const periodRaw = Number(filters?.period_interval?.value);
  const depthRaw = filters?.depth?.value;
  const depth = depthRaw === "" || depthRaw == null ? Number(fallback.depth) : Number(depthRaw);
  return {
    minTs: minFromRange ?? fallback.minTs,
    maxTs: maxFromRange ?? fallback.maxTs,
    period: Number.isFinite(periodRaw) && periodRaw > 0 ? periodRaw : fallback.period,
    depth: Number.isFinite(depth) ? depth : Number(fallback.depth),
  };
}

/**
 * Empty when the pull can run. A loading pick is not an error yet.
 * Series runs from tickers, or from a category when no tickers are selected.
 * @returns {string}
 */
export function kalshiLiveDirectScopeError(tableId, picks, _query, filters) {
  const loading = (picks || []).some((pick) => pick?.status === "loading");
  if (tableId === "series") {
    if (directSeriesTickers(picks).length) return "";
    if (seriesDiscoveryCategories(filters).length) return "";
    return loading ? "" : "Search for a series or select a category.";
  }
  if (tableId === "events") {
    if (directEventTickers(picks).length) return "";
    if (eventDiscoveryStatuses(filters).length) return "";
    if (eventSeriesTicker(filters)) return "";
    if (eventClosesAfter(filters) || seriesUpdatedAfter(filters)) return "";
    return loading ? "" : "Search for an event or select a status.";
  }
  if (directMarketTickers(picks).length) return "";
  return loading ? "" : "Add at least one market ticker.";
}
