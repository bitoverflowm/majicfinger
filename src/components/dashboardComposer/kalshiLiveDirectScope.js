/** One-off Kalshi Live market endpoints. These are not the markets join. */

import { maxKalshiCandlestickInclusiveDays } from "@/lib/kalshiLive/candlestickCompose";
import { KALSHI_LIVE_CANDLESTICK_PERIOD_OPTIONS } from "@/lib/kalshiLive/candlesticksColumns";
import { KALSHI_LIVE_SERIES_CATEGORY_OPTIONS } from "@/lib/kalshiLive/kalshiLiveCategories";
import {
  KALSHI_LIVE_LEADERBOARD_METRIC_OPTIONS,
  KALSHI_LIVE_LEADERBOARD_TIME_PERIOD_OPTIONS,
} from "@/lib/kalshiLive/leaderboardColumns";
import { dateRangePreset } from "@/components/dashboardComposer/dateRangePresets";
import {
  KALSHI_LIVE_EVENT_FORECAST_PERIOD_OPTIONS,
  normalizeForecastApiPercentiles,
} from "@/lib/kalshiLive/eventForecastColumns";

export const KALSHI_LIVE_TRADER_TABLES = ["leaderboard", "holder_profile", "holder_positions", "trades_by_holder", "search_traders"];

export const KALSHI_LIVE_DIRECT_TABLES = ["series", "events", "event_forecast", "event_candlesticks", "multivariate_events", "candlesticks", "trades", "orderbook", ...KALSHI_LIVE_TRADER_TABLES];

export const KALSHI_LIVE_FORECAST_DEFAULT_PERCENTILES = [1000, 2500, 5000, 7500, 9000];

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

export function isKalshiLiveTraderTable(tableId) {
  return KALSHI_LIVE_TRADER_TABLES.includes(tableId);
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
    sheetMode: tableId === "series" || tableId === "events" || isKalshiLiveTraderTable(tableId) ? "combined" : "sheet",
  };
}

export function directMarketTickers(picks) {
  const seen = new Set();
  const markets = [];
  for (const pick of picks || []) {
    const rows = Array.isArray(pick?.rows) ? pick.rows : [];
    const entries = rows.length
      ? rows.map((row) => ({ ticker: String(row?.ticker || "").trim(), row }))
      : pick?.kind === "market" && pick.ticker
        ? [{ ticker: String(pick.ticker).trim(), row: null }]
        : [];
    for (const entry of entries) {
      const ticker = entry.ticker;
      if (!ticker || seen.has(ticker)) continue;
      seen.add(ticker);
      const row = entry.row || {};
      markets.push({
        ticker,
        label: String(pick?.label || ticker),
        title: String(row.yes_sub_title || pick?.title || ticker),
        openTime: row.open_time || row.openTime || pick?.openTime,
        closeTime: row.close_time || row.closeTime || pick?.closeTime,
        status: row.status || pick?.marketStatus,
        result: row.result || pick?.result,
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

function optionPairs(options) {
  return (options || []).map((option) => [option.value, option.label]);
}

function exactTerms(filter, { upper = false } = {}) {
  const tags = Array.isArray(filter?.containsTags) ? filter.containsTags : [];
  const draft = String(filter?.contains || "").trim();
  const seen = new Set();
  const terms = [];
  for (const value of [...tags, draft]) {
    const text = String(value || "").trim();
    const term = upper ? text.toUpperCase() : text;
    const key = term.toLowerCase();
    if (!term || seen.has(key)) continue;
    seen.add(key);
    terms.push(term);
  }
  return terms;
}

function booleanOn(filter, fallback) {
  const include = Array.isArray(filter?.include) ? filter.include : [];
  if (!include.length) return fallback;
  if (include.includes("false") && !include.includes("true")) return false;
  return include.includes("true");
}

/** Rank order, window, and category for the social leaderboard. */
export function leaderboardMetric(filters) {
  const value = String(filters?.metric_name?.value || "").trim();
  return KALSHI_LIVE_LEADERBOARD_METRIC_OPTIONS.some((option) => option.value === value) ? value : "projected_pnl";
}

export function leaderboardTimePeriod(filters) {
  const value = String(filters?.time_period?.value || "").trim();
  return KALSHI_LIVE_LEADERBOARD_TIME_PERIOD_OPTIONS.some((option) => option.value === value) ? value : "all_time";
}

export function leaderboardCategories(filters) {
  return seriesDiscoveryCategories({ category: filters?.category });
}

/** Nickname text for social profile search. The search needs at least two characters. */
export function traderSearchQuery(filters) {
  return exactTerms(filters?.nickname_query)[0] || "";
}

export function traderIncludeMetrics(filters) {
  return booleanOn(filters?.include_metrics, true);
}

export function traderIncludeHoldings(filters) {
  return booleanOn(filters?.include_holdings, false);
}

export function traderProfileNicknames(filters) {
  return exactTerms(filters?.nicknames);
}

export function holderTradeNicknames(filters) {
  return exactTerms(filters?.nickname);
}

export function holderTradeSeries(filters) {
  return exactTerms(filters?.series_ticker, { upper: true });
}

export function holderTradeEvents(filters) {
  return exactTerms(filters?.event_ticker, { upper: true });
}

export function holderTradeMarkets(filters) {
  return exactTerms(filters?.market_ticker, { upper: true });
}

/** all_time or yearly. Kalshi answers shorter periods with zeros. */
export function traderMetricPeriod(filters) {
  return String(filters?.time_period?.value || "") === "yearly" ? "yearly" : "all_time";
}

export function holderPositionNicknames(filters) {
  return exactTerms(filters?.nicknames);
}

export function holderPositionStatus(filters) {
  const value = String(filters?.position_status?.value || "").trim();
  return ["open", "closed", "all"].includes(value) ? value : "open";
}

/**
 * What a Kalshi trader sheet can join to, in Polymarket's order: profile, positions, trades.
 * Kalshi shares no PnL history or activity feed, so those joins have no Kalshi version.
 */
export const KALSHI_TRADER_JOIN_KINDS = [
  { id: "profile", title: "Profile", table: "holder_profile", detail: "Followers, join date, PnL, dollars traded, and markets traded for each trader." },
  { id: "positions", title: "Positions", table: "holder_positions", detail: "Open positions for each trader, one row per market. Most Kalshi traders keep positions hidden." },
  { id: "trades", title: "Trades", table: "trades_by_holder", detail: "Public trades for each trader, read from their side. Some traders keep trades private." },
];

const KALSHI_TRADER_JOIN_GRAPH = {
  leaderboard: ["profile", "positions", "trades"],
  search_traders: ["profile", "positions", "trades"],
  holder_profile: ["positions", "trades"],
  holder_positions: ["profile", "trades"],
  trades_by_holder: ["profile", "positions"],
};

export function kalshiTraderJoinChoices(tableId) {
  const ids = KALSHI_TRADER_JOIN_GRAPH[tableId] || [];
  return KALSHI_TRADER_JOIN_KINDS.filter((kind) => ids.includes(kind.id));
}

/** Rows on these sheets name markets, so markets joins can follow. */
export function kalshiTraderTableNamesMarkets(tableId) {
  return tableId === "holder_positions" || tableId === "trades_by_holder";
}

/** Markets named on trader position or trade rows, first seen first. */
export function traderMarketTickersFromRows(rows, cap = Infinity) {
  const seen = new Set();
  const tickers = [];
  for (const row of rows || []) {
    const ticker = String(row?.market_ticker || row?.ticker || "").trim();
    if (!ticker || seen.has(ticker)) continue;
    seen.add(ticker);
    tickers.push(ticker);
    if (tickers.length >= cap) break;
  }
  return tickers;
}

/**
 * The request a trader sheet makes, without its row limit.
 * Saved as the sheet's pull so a replay keeps the same filters.
 */
export function kalshiTraderPullSpec(tableId, filters) {
  if (tableId === "leaderboard") {
    return { table: tableId, metric: leaderboardMetric(filters), timePeriod: leaderboardTimePeriod(filters), categories: leaderboardCategories(filters) };
  }
  if (tableId === "search_traders") {
    return { table: tableId, query: traderSearchQuery(filters), includeMetrics: traderIncludeMetrics(filters), includeHoldings: traderIncludeHoldings(filters) };
  }
  if (tableId === "holder_profile") {
    return { table: tableId, nicknames: traderProfileNicknames(filters), timePeriod: traderMetricPeriod(filters) };
  }
  if (tableId === "holder_positions") {
    return { table: tableId, nicknames: holderPositionNicknames(filters), status: holderPositionStatus(filters) };
  }
  if (tableId === "trades_by_holder") {
    return {
      table: tableId,
      nicknames: holderTradeNicknames(filters),
      seriesTickers: holderTradeSeries(filters),
      eventTickers: holderTradeEvents(filters),
      marketTickers: holderTradeMarkets(filters),
      minAmount: holderTradesMinAmount(filters),
    };
  }
  return { table: tableId };
}

/** The request one joined trader sheet makes for one nickname. */
export function kalshiTraderJoinPullSpec(kind, nickname) {
  const nicknames = [String(nickname || "").trim()].filter(Boolean);
  if (kind === "profile") return { table: "holder_profile", nicknames, timePeriod: "all_time" };
  if (kind === "positions") return { table: "holder_positions", nicknames, status: "open" };
  return { table: "trades_by_holder", nicknames };
}

/** Polymarket-style sheet title for one trader's joined sheet. */
export function kalshiTraderJoinSheetTitle(kind, nickname) {
  const name = String(nickname || "").trim() || "Trader";
  if (kind === "profile") return `${name}'s profile`;
  if (kind === "positions") return `${name}'s positions`;
  return `${name}'s trades`;
}

export function holderTradesMinAmount(filters) {
  const raw = filters?.min_amount?.min;
  if (raw == null || String(raw).trim() === "") return null;
  const amount = Number(raw);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

/** Nicknames on a trader sheet. Trade rows name the trader, else the public taker or maker. */
export function traderNicknamesFromRows(rows, cap = Infinity) {
  const seen = new Set();
  const names = [];
  for (const row of rows || []) {
    const name = String(row?.nickname || row?.trader_nickname || row?.taker_nickname || row?.maker_nickname || "").trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
    if (names.length >= cap) break;
  }
  return names;
}

const YES_NO = [
  ["true", "Yes"],
  ["false", "No"],
];

const TRADER_METRIC_PERIODS = [
  ["all_time", "All time"],
  ["yearly", "Past year"],
];

const POSITION_STATUSES = [
  ["open", "Open"],
  ["closed", "Closed"],
  ["all", "Open and closed"],
];

/** Query controls first. Rank order, window, and category are the leaderboard. They stay off the attribute filter of the sheet columns. */
export function kalshiLiveTraderAttributeColumns(tableId, columns) {
  const list = Array.isArray(columns) ? columns : [];
  if (tableId === "leaderboard") {
    const query = [
      {
        id: "metric_name",
        title: "Rank order",
        type: "text",
        queryOnly: true,
        control: "period",
        ariaLabel: "Rank order",
        enumOptions: optionPairs(KALSHI_LIVE_LEADERBOARD_METRIC_OPTIONS),
        description: "Metric these ranks use.",
      },
      {
        id: "time_period",
        title: "Time period",
        type: "text",
        queryOnly: true,
        control: "period",
        ariaLabel: "Time period",
        enumOptions: optionPairs(KALSHI_LIVE_LEADERBOARD_TIME_PERIOD_OPTIONS),
        description: "Window these ranks cover.",
      },
      {
        id: "category",
        title: "Category",
        type: "text",
        queryOnly: true,
        control: "category",
        enumOptions: KALSHI_LIVE_SERIES_CATEGORY_OPTIONS.map((option) => [option.value, option.label]),
        description: "Market category for these ranks.",
      },
    ];
    const rest = list.filter((column) => !["metric_name", "time_period", "category"].includes(column.id));
    return [...query, ...rest];
  }
  if (tableId === "search_traders") {
    const query = [
      {
        id: "nickname_query",
        title: "Search for a trader",
        type: "text",
        queryOnly: true,
        description: "Public nickname.",
      },
      {
        id: "include_metrics",
        title: "Metrics",
        type: "boolean",
        queryOnly: true,
        enumOptions: YES_NO,
        description: "Shared volume, PnL, and markets traded.",
      },
      {
        id: "include_holdings",
        title: "Holdings",
        type: "boolean",
        queryOnly: true,
        enumOptions: YES_NO,
        description: "Open positions, one row per market.",
      },
    ];
    return [...query, ...list];
  }
  if (tableId === "holder_profile") {
    return [
      {
        id: "nicknames",
        title: "Nickname",
        type: "text",
        queryOnly: true,
        exactTickers: true,
        placeholder: "Add a nickname",
        description: "Public display name.",
      },
      {
        id: "time_period",
        title: "Metrics period",
        type: "text",
        queryOnly: true,
        control: "period",
        ariaLabel: "Metrics period",
        enumOptions: TRADER_METRIC_PERIODS,
        description: "Window for PnL, dollars traded, and markets traded. Kalshi shares these for all time and the past year.",
      },
      ...list.filter((column) => column.id !== "nickname" && column.id !== "metrics_period"),
    ];
  }
  if (tableId === "holder_positions") {
    return [
      {
        id: "nicknames",
        title: "Nickname",
        type: "text",
        queryOnly: true,
        exactTickers: true,
        placeholder: "Add a nickname",
        description: "Public display name. Most Kalshi traders keep positions hidden.",
      },
      {
        id: "position_status",
        title: "Positions",
        type: "text",
        queryOnly: true,
        control: "period",
        ariaLabel: "Positions",
        enumOptions: POSITION_STATUSES,
        description: "Open positions, closed ones, or both.",
      },
      ...list.filter((column) => column.id !== "nickname" && column.id !== "status"),
    ];
  }
  if (tableId === "trades_by_holder") {
    return [
      {
        id: "nickname",
        title: "Nickname",
        type: "text",
        queryOnly: true,
        exactTickers: true,
        placeholder: "Add a nickname",
        description: "Public display name. Some traders keep their trades private.",
      },
      {
        id: "series_ticker",
        title: "Series ticker",
        type: "text",
        queryOnly: true,
        exactTickers: true,
        placeholder: "Add a series ticker",
        description: "Trades in this series.",
      },
      {
        id: "event_ticker",
        title: "Event ticker",
        type: "text",
        queryOnly: true,
        exactTickers: true,
        placeholder: "Add an event ticker",
        description: "Trades in this event.",
      },
      {
        id: "market_ticker",
        title: "Market ticker",
        type: "text",
        queryOnly: true,
        exactTickers: true,
        placeholder: "Add a market ticker",
        description: "Trades in this market.",
      },
      {
        id: "min_amount",
        title: "Minimum size",
        type: "number",
        queryOnly: true,
        description: "Smallest trade size.",
      },
      ...list,
    ];
  }
  return list;
}

/** Past 24 hours, plus period or depth, so the attribute list opens on the same window the pull uses. */
export function defaultDirectAttributeFilters(tableId, now = new Date()) {
  if (tableId === "leaderboard") {
    return {
      metric_name: { value: "projected_pnl" },
      time_period: { value: "all_time" },
    };
  }
  if (tableId === "search_traders") {
    return { include_metrics: { include: ["true"] } };
  }
  if (tableId === "holder_profile") return { time_period: { value: "all_time" } };
  if (tableId === "holder_positions") return { position_status: { value: "open" } };
  if (tableId === "event_forecast") {
    const range = dateRangePreset("past-24h", now);
    return {
      percentiles: { contains: "", containsTags: KALSHI_LIVE_FORECAST_DEFAULT_PERCENTILES.map(String) },
      time_range: { from: range?.from || "", to: range?.to || "", preset: "past-24h" },
      period_interval: { value: "60" },
    };
  }
  if (tableId === "event_candlesticks") {
    const range = dateRangePreset("past-24h", now);
    return {
      time_range: { from: range?.from || "", to: range?.to || "", preset: "life-last-day" },
      period_interval: { value: "60" },
    };
  }
  if (!DIRECT_MARKET_TABLES.includes(tableId)) return {};
  if (tableId === "orderbook") return { depth: { value: "20" } };
  const range = dateRangePreset("past-24h", now);
  const filters = {
    time_range: { from: range?.from || "", to: range?.to || "", preset: "life-last-day" },
  };
  if (tableId === "candlesticks") {
    filters.period_interval = { value: "60" };
    filters.include_latest_before_start = { value: "true" };
  }
  return filters;
}

/** A join covers many markets, so trades and candles start on each market's whole life. */
export function defaultJoinWindowFilters(tableId) {
  const filters = defaultDirectAttributeFilters(tableId);
  if (tableId === "event_forecast") return { ...filters, time_range: { from: "", to: "", preset: "life-last-week" } };
  if (tableId !== "trades" && tableId !== "candlesticks") return filters;
  return { ...filters, time_range: { from: "", to: "", preset: "market-life" } };
}

const FORECAST_MAX_PERIODS = 5000;

function hasStrike(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
}

/**
 * Kalshi only forecasts events with a numeric outcome, such as a temperature or a rate,
 * so at least one market needs a floor or cap strike. Unknown markets are left to Kalshi.
 * @param {Array<Record<string, unknown>>} marketRows
 */
export function eventForecastable(marketRows) {
  const rows = Array.isArray(marketRows) ? marketRows : [];
  if (!rows.length) return true;
  return rows.some((row) => hasStrike(row?.floor_strike) || hasStrike(row?.cap_strike));
}

/**
 * Kalshi rejects a forecast window longer than 5,000 periods or one that ends in the future,
 * so the window ends by now and keeps its latest 5,000 periods.
 * @param {{ minTs?: number, maxTs?: number, period?: number, empty?: boolean } & Record<string, unknown>} window
 * @param {number} [now]
 */
export function fitForecastWindow(window, now = Date.now()) {
  if (!window || window.empty) return window;
  const period = Number(window.period);
  const step = period === 0 ? 5 : (Number.isFinite(period) && period > 0 ? period : 60) * 60;
  const nowTs = Math.floor(now / 1000);
  const maxTs = Math.min(Number.isFinite(Number(window.maxTs)) ? Number(window.maxTs) : nowTs, nowTs);
  const asked = Number.isFinite(Number(window.minTs)) ? Number(window.minTs) : maxTs - 24 * 3600;
  const minTs = Math.max(asked, maxTs - step * (FORECAST_MAX_PERIODS - 1));
  return minTs < maxTs ? { ...window, minTs, maxTs } : { ...window, minTs, maxTs, empty: true };
}

/** Request controls that sit above Columns for a market candlestick pull. */
export const KALSHI_LIVE_CANDLE_QUERY_IDS = ["time_range", "period_interval"];

/**
 * Whole days one candlestick request can cover at this period. Kalshi sends at most 5,000 candles,
 * so 1 minute covers 3 days and 1 hour covers 208. Daily candles have no practical cap.
 * @param {string | number} period
 * @returns {number | undefined}
 */
export function candleRangeMaxDays(period) {
  const minutes = Number(period);
  if (minutes === 1440) return undefined;
  const days = maxKalshiCandlestickInclusiveDays(minutes);
  return Number.isFinite(days) ? days : undefined;
}

function dayOffset(iso, days) {
  const [year, month, day] = String(iso || "").split("-").map(Number);
  if (!year || !month || !day) return "";
  const date = new Date(year, month - 1, day + days);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${mm}-${dd}`;
}

/** Inclusive days between two yyyy-mm-dd dates. */
export function inclusiveDays(from, to) {
  const start = dateKeyMs(from);
  const end = dateKeyMs(to);
  if (start == null || end == null) return 0;
  return Math.round((end - start) / (DAY * 1000)) + 1;
}

function dateKeyMs(iso) {
  const [year, month, day] = String(iso || "").split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day).getTime();
}

/**
 * Keep the end of the range and pull the start in until the range fits the period's cap.
 * @param {{ from?: string, to?: string, preset?: string } | null | undefined} range
 * @param {number | undefined} maxDays
 */
export function fitCandleRange(range, maxDays) {
  const from = String(range?.from || "");
  const to = String(range?.to || "");
  if (!maxDays || !from || !to || inclusiveDays(from, to) <= maxDays) return range;
  return { from: dayOffset(to, -(maxDays - 1)), to, preset: "" };
}

/**
 * Query controls first, then every response column with a control that matches its type.
 * The date range, period, and depth are the request. They are not columns on the sheet.
 */
/** Forecast request controls stay above the forecast row columns. */
export function kalshiLiveEventForecastAttributeColumns(columns) {
  const query = [
    {
      id: "percentiles",
      title: "Percentiles",
      type: "text",
      queryOnly: true,
      exactTickers: true,
      placeholder: "0 to 9999",
      description: "Up to 10 percentile values, from 0 to 9999.",
    },
    {
      id: "time_range",
      title: "Date range",
      type: "date",
      queryOnly: true,
      control: "query-range",
      description: "Start and end of the forecast data",
    },
    {
      id: "period_interval",
      title: "Period",
      type: "enum",
      queryOnly: true,
      control: "period",
      enumOptions: KALSHI_LIVE_EVENT_FORECAST_PERIOD_OPTIONS.map((option) => [String(option.value), option.label]),
      description: "Length of each forecast period. 5 seconds, 1 minute, 1 hour, or 1 day.",
    },
  ];
  const provided = (columns || []).filter((column) => column?.id && column.id !== "period_interval");
  const rest = provided.length
    ? provided
    : [
        { id: "event_ticker", title: "Event ticker", type: "text", description: "The event ticker this forecast is for." },
        { id: "end_period_ts", title: "End period", type: "date", description: "Unix timestamp for the inclusive end of the forecast period." },
        { id: "percentile", title: "Percentile", type: "number", description: "The percentile value, from 0 to 9999." },
        { id: "raw_numerical_forecast", title: "Raw numerical forecast", type: "number", description: "The raw numerical forecast value." },
        { id: "numerical_forecast", title: "Numerical forecast", type: "number", description: "The processed numerical forecast value." },
        { id: "formatted_forecast", title: "Formatted forecast", type: "text", description: "The human-readable formatted forecast value." },
      ];
  return [...query, ...rest];
}

export function forecastPercentileValues(filters) {
  const tags = Array.isArray(filters?.percentiles?.containsTags) ? filters.percentiles.containsTags : [];
  const draft = String(filters?.percentiles?.contains || "").trim();
  const raw = [...tags, draft].map((value) => Number(String(value).replace(/[^\d]/g, ""))).filter((value) => Number.isFinite(value));
  const normalized = normalizeForecastApiPercentiles(raw);
  return normalized.length ? normalized : [...KALSHI_LIVE_FORECAST_DEFAULT_PERCENTILES];
}

/** Event and series picks the forecast pull can resolve. An event keeps its series ticker. */
export function forecastPullTargets(picks) {
  const events = [];
  const seriesTickers = [];
  const seenEvents = new Set();
  const seenSeries = new Set();
  for (const pick of picks || []) {
    const ticker = String(pick?.ticker || "").trim();
    if (!ticker) continue;
    if (pick?.kind === "series") {
      if (seenSeries.has(ticker)) continue;
      seenSeries.add(ticker);
      seriesTickers.push(ticker);
      continue;
    }
    if (pick?.kind !== "event") continue;
    if (seenEvents.has(ticker)) continue;
    seenEvents.add(ticker);
    events.push({
      eventTicker: ticker,
      seriesTicker: String(pick.seriesTicker || "").trim(),
      title: String(pick.title || ticker),
    });
  }
  return { events, seriesTickers };
}

/** One collection ticker from the multivariate attribute, or "". */
export function multivariateCollectionTicker(filters) {
  const filter = filters?.collection_ticker;
  const tag = Array.isArray(filter?.containsTags) ? filter.containsTags[0] : "";
  return String(tag || filter?.contains || filter?.value || "").trim();
}

/** Series and collection first, then the other multivariate columns. */
export function kalshiLiveMultivariateAttributeColumns(columns) {
  const list = Array.isArray(columns) ? columns : [];
  const series = {
    ...(list.find((column) => column.id === "series_ticker") || { id: "series_ticker", type: "text", title: "Series ticker" }),
    title: "Series ticker",
    exactTickers: true,
    description: "One series. The API takes one series ticker per request.",
  };
  const collection = {
    id: "collection_ticker",
    title: "Collection ticker",
    type: "text",
    queryOnly: true,
    exactTickers: true,
    description: "One collection ticker. Use this or a series, not both.",
  };
  const rest = list.filter((column) => column.id !== "series_ticker" && column.id !== "collection_ticker");
  return [series, collection, ...rest];
}

export function kalshiLiveDirectAttributeColumns(tableId, columns) {
  if (tableId !== "event_candlesticks" && !DIRECT_MARKET_TABLES.includes(tableId)) return [];
  const enums = tableId === "trades" ? TRADE_ENUMS : tableId === "orderbook" ? ORDERBOOK_ENUMS : {};
  const shaped = (columns || []).map((column) => {
    if (enums[column.id]) return { ...column, enumOptions: enums[column.id] };
    if (column.type === "date") {
      return { ...column, dateEpoch: column.id === "end_period_ts" ? "unix" : "iso" };
    }
    return column;
  });
  const query =
    tableId === "orderbook"
      ? []
      : [
          {
            id: "time_range",
            title: "Date range",
            type: "date",
            queryOnly: true,
            control: "query-range",
            ...(tableId === "trades" || tableId === "candlesticks" || tableId === "event_candlesticks" ? { lifeWindows: true } : {}),
            description: tableId === "trades" ? "Start and end of trade data" : "Start and end of candlestick data",
          },
        ];
  if (tableId === "candlesticks" || tableId === "event_candlesticks") {
    query.push({
      id: "period_interval",
      title: "Period",
      type: "text",
      queryOnly: true,
      control: "period",
      enumOptions: KALSHI_LIVE_CANDLESTICK_PERIOD_OPTIONS.map((option) => [String(option.value), option.label]),
      description: "How much time each candle covers.",
    });
  }
  if (tableId === "candlesticks") {
    query.push({
      id: "include_latest_before_start",
      title: "Include latest before start",
      type: "text",
      queryOnly: true,
      control: "period",
      enumOptions: [
        ["true", "On"],
        ["false", "Off"],
      ],
      description: "Starts the chart from the last price before the range, so the first candle is not blank.",
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

/**
 * One candlestick sheet per market in an event, in the order of the event's market list.
 * Markets with no candles in the range are left out. Markets Kalshi sent that the list lacks go last.
 * @param {Array<{ ticker: string, rows: object[] }>} byMarket
 * @param {Array<Record<string, any>>} [marketRows]
 */
export function eventCandleSheetMarkets(byMarket, marketRows = []) {
  const order = new Map();
  (marketRows || []).forEach((row, index) => {
    const ticker = String(row?.ticker || "").trim();
    if (ticker && !order.has(ticker)) order.set(ticker, index);
  });
  return (byMarket || [])
    .filter((market) => market?.ticker && Array.isArray(market.rows) && market.rows.length)
    .map((market, index) => ({ market, rank: order.has(market.ticker) ? order.get(market.ticker) : order.size + index }))
    .sort((a, b) => a.rank - b.rank)
    .map(({ market }) => market);
}

/** Unix window, candle period, and book depth read from the attribute filters. */
export function directPullWindow(tableId, filters, fallback = {}) {
  const range = filters?.time_range || {};
  const ranged = tableId === "trades" || tableId === "candlesticks" || tableId === "event_candlesticks" || tableId === "event_forecast";
  const minFromRange = ranged ? isoDayUnix(range.from, "start") : null;
  const maxFromRange = ranged ? isoDayUnix(range.to, "end") : null;
  const periodRaw = Number(filters?.period_interval?.value);
  const depthRaw = filters?.depth?.value;
  const depth = depthRaw === "" || depthRaw == null ? Number(fallback.depth) : Number(depthRaw);
  return {
    minTs: minFromRange ?? fallback.minTs,
    maxTs: maxFromRange ?? fallback.maxTs,
    period:
      Number.isFinite(periodRaw) && (tableId === "event_forecast" ? periodRaw >= 0 : periodRaw > 0)
        ? periodRaw
        : fallback.period,
    depth: Number.isFinite(depth) ? depth : Number(fallback.depth),
    ...(tableId === "candlesticks"
      ? { includeLatest: String(filters?.include_latest_before_start?.value ?? "true") !== "false" }
      : {}),
  };
}

/**
 * Empty when the pull can run. A loading pick is not an error yet.
 * Series runs from tickers, a category, or the series already on screen when neither is chosen.
 * @returns {string}
 */
export function kalshiLiveDirectScopeError(tableId, picks, _query, filters) {
  const loading = (picks || []).some((pick) => pick?.status === "loading");
  if (tableId === "leaderboard" || tableId === "trades_by_holder" || tableId === "series") return "";
  if (tableId === "search_traders") {
    if (traderSearchQuery(filters).length >= 2) return "";
    return "Search for a trader.";
  }
  if (tableId === "holder_profile") {
    if (traderProfileNicknames(filters).length) return "";
    return loading ? "" : "Add a trader nickname.";
  }
  if (tableId === "holder_positions") {
    if (holderPositionNicknames(filters).length) return "";
    return loading ? "" : "Add a trader nickname.";
  }
  if (tableId === "events") {
    if (directEventTickers(picks).length) return "";
    if (eventDiscoveryStatuses(filters).length) return "";
    if (eventSeriesTicker(filters)) return "";
    if (eventClosesAfter(filters) || seriesUpdatedAfter(filters)) return "";
    return loading ? "" : "Search for an event or select a status.";
  }
  if (tableId === "event_forecast") {
    const targets = forecastPullTargets(picks);
    if (targets.events.length || targets.seriesTickers.length) return "";
    return loading ? "" : "Search for an event or a series.";
  }
  if (tableId === "event_candlesticks") {
    if (directEventTickers(picks).length) return "";
    return loading ? "" : "Search for an event.";
  }
  if (tableId === "multivariate_events") {
    const collection = multivariateCollectionTicker(filters);
    const series = directSeriesTickers(picks).length > 0 || eventSeriesTickers(filters).length > 0;
    if (collection && series) return "Use either a series or a collection ticker.";
    return "";
  }
  if (directMarketTickers(picks).length) return "";
  return loading ? "" : "Add at least one market ticker.";
}
