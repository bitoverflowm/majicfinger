import {
  getKalshiLiveCandlestickColumnLabel,
  KALSHI_LIVE_CANDLESTICK_COLUMNS,
} from "@/lib/kalshiLive/candlesticksColumns";
import {
  getKalshiLiveEventForecastColumnLabel,
  KALSHI_LIVE_EVENT_FORECAST_COLUMNS,
} from "@/lib/kalshiLive/eventForecastColumns";
import {
  getKalshiLiveLeaderboardColumnLabel,
  KALSHI_LIVE_LEADERBOARD_COLUMNS,
} from "@/lib/kalshiLive/leaderboardColumns";
import {
  getKalshiLiveHolderProfileColumnLabel,
  KALSHI_LIVE_HOLDER_PROFILE_COLUMNS,
} from "@/lib/kalshiLive/holderProfileColumns";
import {
  getKalshiLiveHolderTradesColumnLabel,
  KALSHI_LIVE_HOLDER_TRADES_COLUMNS,
} from "@/lib/kalshiLive/holderTradesColumns";
import {
  getKalshiLiveSearchTradersColumnLabel,
  getKalshiLiveSearchTradersColumns,
} from "@/lib/kalshiLive/searchTradersColumns";
import {
  getKalshiLiveEventColumnLabel,
  getKalshiLiveMultivariateEventColumnLabel,
  KALSHI_LIVE_EVENTS_COLUMNS,
  KALSHI_LIVE_MULTIVARIATE_EVENTS_COLUMNS,
} from "@/lib/kalshiLive/eventsColumns";
import {
  getKalshiLiveMarketColumnLabel,
  KALSHI_LIVE_MARKETS_COLUMNS,
} from "@/lib/kalshiLive/marketsColumns";
import {
  getKalshiLiveOrderbookColumnLabel,
  KALSHI_LIVE_ORDERBOOK_COLUMNS,
} from "@/lib/kalshiLive/orderbookColumns";
import {
  getKalshiLiveSeriesColumnLabel,
  KALSHI_LIVE_SERIES_COLUMNS,
} from "@/lib/kalshiLive/seriesColumns";
import {
  getKalshiLiveTradeColumnLabel,
  KALSHI_LIVE_TRADES_COLUMNS,
} from "@/lib/kalshiLive/tradesColumns";
import {
  KALSHI_LIVE_EVENTS_ROW_MODE_PER_MARKET,
  normalizeKalshiLiveEventsRowMode,
} from "@/lib/kalshiLive/eventCompose";
import { LIVE_FEED_REGISTRY } from "@/lib/liveFeeds/registry";

/**
 * Top-level Kalshi Live endpoint groups (hub column tags).
 * Endpoints are filtered by `category` so Markets / Events / … stay organized.
 * "Real-Time" lists endpoints that have an editor live-feed pull enabled
 * (see LIVE_FEED_REGISTRY) — they still also appear under their primary category.
 */
export const KALSHI_LIVE_ENDPOINT_CATEGORIES = [
  { id: "markets", label: "Markets" },
  { id: "events", label: "Events" },
  { id: "holders", label: "Traders" },
  { id: "realtime", label: "Real-Time" },
];

export const KALSHI_LIVE_DEFAULT_ENDPOINT_CATEGORY = "markets";

/**
 * Endpoint ids that support browser ephemeral live pulls (kalshi-live registry).
 * @returns {Set<string>}
 */
export function getKalshiLiveRealtimeEndpointIds() {
  /** @type {Set<string>} */
  const ids = new Set();
  for (const def of Object.values(LIVE_FEED_REGISTRY || {})) {
    if (String(def?.integration || "") !== "kalshi-live") continue;
    const endpoint = String(def?.endpoint || "").trim();
    if (endpoint) ids.add(endpoint);
  }
  return ids;
}

/**
 * @param {string} endpointId
 * @returns {boolean}
 */
export function kalshiLiveEndpointHasRealtimeFeed(endpointId) {
  const id = String(endpointId || "").trim();
  if (!id) return false;
  return getKalshiLiveRealtimeEndpointIds().has(id);
}

/** Connect home — Kalshi Live API endpoints (unauthenticated). */
export const KALSHI_LIVE_CONNECT_ENDPOINTS = [
  {
    id: "markets",
    category: "markets",
    title: "Markets",
    description:
      "Live market(s) metadata, prices, status, etc. Search by ticker or find markets based on date, status and other filters",
  },
  {
    id: "series",
    category: "markets",
    title: "Series",
    description:
      "Search a specific series or discover series based on series characteristics",
  },
  {
    id: "candlesticks",
    category: "markets",
    title: "Market Candlesticks",
    selectedTitle: "Get Market Candlesticks",
    description:
      "OHLC price, bid/ask, and volume for one or many markets.",
  },
  {
    id: "trades",
    category: "markets",
    title: "Trades",
    description:
      "Completed transactions for one or more markets — price, size, and direction. Search tickers; set a shared date range in Common queries.",
  },
  {
    id: "orderbook",
    category: "markets",
    title: "Market Orderbook",
    description:
      "Current yes/no bid levels for one market. Enter a ticker; each price level becomes a row. Asks are implied as 1 − opposite bid.",
  },
  {
    id: "events",
    category: "events",
    title: "Events",
    description:
      "Live event metadata (and optional nested markets). Search by event ticker or discover events with status, series, and date filters.",
  },
  {
    id: "event_candlesticks",
    category: "events",
    title: "Events Candlesticks",
    selectedTitle: "Get Event Candlesticks",
    description:
      "OHLC price, bid/ask, and volume for every market in a single event. The first sheet lists all market metadata; each remaining sheet holds one market's candlesticks.",
  },
  {
    id: "multivariate_events",
    category: "events",
    title: "Multivariate Events",
    description:
      "Discover multivariate (combo) events. Filter by series or collection ticker, optionally include nested markets. Paginated exploration into one sheet.",
  },
  {
    id: "event_forecast",
    category: "events",
    title: "Event Forecast",
    selectedTitle: "Get Event Forecast",
    description:
      "What the market is predicting for outcomes over time — forecast percentiles for an event.",
  },
  {
    id: "leaderboard",
    category: "holders",
    title: "Leaderboard",
    selectedTitle: "Get Leaderboard",
    description:
      "Social leaderboard rankings — rank users by PnL, volume, ROI, or markets traded.",
  },
  {
    id: "holder_profile",
    category: "holders",
    title: "Trader Profile",
    selectedTitle: "Get Trader Profile",
    description:
      "Public social profile for a Kalshi nickname — followers, bio, join date, and categories.",
  },
  {
    id: "trades_by_holder",
    category: "holders",
    title: "Trades by Trader",
    selectedTitle: "Get Trades by Trader",
    description:
      "Public social trade activity — optionally filter by nickname, series, event, or minimum amount.",
  },
  {
    id: "search_traders",
    category: "holders",
    title: "Search by trader nickname",
    selectedTitle: "Search by trader nickname",
    description:
      "Find public trader profiles by nickname. Optionally add shared metrics and holdings.",
  },
];

/** @param {string} categoryId */
export function getKalshiLiveEndpointsForCategory(categoryId) {
  const cat = String(categoryId || KALSHI_LIVE_DEFAULT_ENDPOINT_CATEGORY).trim();
  if (cat === "realtime") {
    const realtimeIds = getKalshiLiveRealtimeEndpointIds();
    return KALSHI_LIVE_CONNECT_ENDPOINTS.filter((ep) => realtimeIds.has(ep.id));
  }
  return KALSHI_LIVE_CONNECT_ENDPOINTS.filter((ep) => (ep.category || "markets") === cat);
}

/** Endpoint ids that are visible but not selectable yet. */
export const KALSHI_LIVE_UNDER_CONSTRUCTION_ENDPOINT_IDS = new Set(
  KALSHI_LIVE_CONNECT_ENDPOINTS.filter((ep) => ep.underConstruction).map((ep) => ep.id),
);

export const KALSHI_LIVE_DEFAULT_LIMIT = 100;

/**
 * @param {string} endpointId
 * @param {{
 *   includeMarkets?: boolean;
 *   rowMode?: string;
 *   includeMetrics?: boolean;
 *   includeHoldings?: boolean;
 * }} [opts]
 */
export function getKalshiLiveColumnsForEndpoint(endpointId, opts = {}) {
  if (endpointId === "candlesticks") return KALSHI_LIVE_CANDLESTICK_COLUMNS;
  if (endpointId === "event_candlesticks") return KALSHI_LIVE_CANDLESTICK_COLUMNS;
  if (endpointId === "event_forecast") return KALSHI_LIVE_EVENT_FORECAST_COLUMNS;
  if (endpointId === "leaderboard") return KALSHI_LIVE_LEADERBOARD_COLUMNS;
  if (endpointId === "holder_profile") return KALSHI_LIVE_HOLDER_PROFILE_COLUMNS;
  if (endpointId === "trades_by_holder") return KALSHI_LIVE_HOLDER_TRADES_COLUMNS;
  if (endpointId === "search_traders") {
    return getKalshiLiveSearchTradersColumns({
      includeMetrics: !!opts.includeMetrics,
      includeHoldings: !!opts.includeHoldings,
    });
  }
  if (endpointId === "trades") return KALSHI_LIVE_TRADES_COLUMNS;
  if (endpointId === "orderbook") return KALSHI_LIVE_ORDERBOOK_COLUMNS;
  if (endpointId === "series") return KALSHI_LIVE_SERIES_COLUMNS;
  if (endpointId === "events") {
    const rowMode = normalizeKalshiLiveEventsRowMode(opts.rowMode);
    if (opts.includeMarkets && rowMode === KALSHI_LIVE_EVENTS_ROW_MODE_PER_MARKET) {
      return KALSHI_LIVE_MARKETS_COLUMNS;
    }
    return KALSHI_LIVE_EVENTS_COLUMNS;
  }
  if (endpointId === "multivariate_events") {
    const rowMode = normalizeKalshiLiveEventsRowMode(opts.rowMode);
    if (opts.includeMarkets && rowMode === KALSHI_LIVE_EVENTS_ROW_MODE_PER_MARKET) {
      return KALSHI_LIVE_MARKETS_COLUMNS;
    }
    return KALSHI_LIVE_MULTIVARIATE_EVENTS_COLUMNS;
  }
  return KALSHI_LIVE_MARKETS_COLUMNS;
}

/**
 * @param {string} endpointId
 * @param {import("@/lib/kalshiLive/marketsColumns").KalshiLiveMarketColumn | string} col
 * @param {{
 *   includeMarkets?: boolean;
 *   rowMode?: string;
 *   includeMetrics?: boolean;
 *   includeHoldings?: boolean;
 * }} [opts]
 */
export function getKalshiLiveColumnDisplayLabelForEndpoint(endpointId, col, opts = {}) {
  if (endpointId === "candlesticks") return getKalshiLiveCandlestickColumnLabel(col);
  if (endpointId === "event_candlesticks") return getKalshiLiveCandlestickColumnLabel(col);
  if (endpointId === "event_forecast") return getKalshiLiveEventForecastColumnLabel(col);
  if (endpointId === "leaderboard") return getKalshiLiveLeaderboardColumnLabel(col);
  if (endpointId === "holder_profile") return getKalshiLiveHolderProfileColumnLabel(col);
  if (endpointId === "trades_by_holder") return getKalshiLiveHolderTradesColumnLabel(col);
  if (endpointId === "search_traders") return getKalshiLiveSearchTradersColumnLabel(col);
  if (endpointId === "trades") return getKalshiLiveTradeColumnLabel(col);
  if (endpointId === "orderbook") return getKalshiLiveOrderbookColumnLabel(col);
  if (endpointId === "series") {
    return getKalshiLiveSeriesColumnLabel(col);
  }
  if (endpointId === "events") {
    const rowMode = normalizeKalshiLiveEventsRowMode(opts.rowMode);
    if (opts.includeMarkets && rowMode === KALSHI_LIVE_EVENTS_ROW_MODE_PER_MARKET) {
      return getKalshiLiveMarketColumnLabel(col);
    }
    return getKalshiLiveEventColumnLabel(col);
  }
  if (endpointId === "multivariate_events") {
    const rowMode = normalizeKalshiLiveEventsRowMode(opts.rowMode);
    if (opts.includeMarkets && rowMode === KALSHI_LIVE_EVENTS_ROW_MODE_PER_MARKET) {
      return getKalshiLiveMarketColumnLabel(col);
    }
    return getKalshiLiveMultivariateEventColumnLabel(col);
  }
  return getKalshiLiveMarketColumnLabel(col);
}

export const KALSHI_LIVE_CONNECT_CONFIG = {
  endpoints: KALSHI_LIVE_CONNECT_ENDPOINTS,
  getColumnsForEndpoint: getKalshiLiveColumnsForEndpoint,
  getColumnDisplayLabel: getKalshiLiveColumnDisplayLabelForEndpoint,
};

/** Compose operations shown for Kalshi Live (subset of historical data-lake ops). */
export const KALSHI_LIVE_COMPOSE_OPERATION_IDS = ["where", "sort", "row_limit"];

/** @param {string} endpointId */
export function getKalshiLiveComposeOperationIds(_endpointId) {
  return KALSHI_LIVE_COMPOSE_OPERATION_IDS;
}
