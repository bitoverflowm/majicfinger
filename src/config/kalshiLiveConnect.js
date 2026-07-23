import {
  getKalshiLiveCandlestickColumnLabel,
  KALSHI_LIVE_CANDLESTICK_COLUMNS,
} from "@/lib/kalshiLive/candlesticksColumns";
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

/** Connect home — Kalshi Live API endpoints (unauthenticated). */
export const KALSHI_LIVE_CONNECT_ENDPOINTS = [
  {
    id: "markets",
    title: "Markets",
    description:
      "Live market metadata, prices, and status. Search tickers (or pick markets from a series); pull one or many via GET /markets/{ticker}.",
  },
  {
    id: "series",
    title: "Series",
    description:
      "Search a specific series or discover series based on series characteristics",
  },
  {
    id: "candlesticks",
    title: "Market Candlesticks",
    selectedTitle: "Get Market Candlesticks",
    description:
      "OHLC price, bid/ask, and volume for one or many markets.",
  },
  {
    id: "trades",
    title: "Trades",
    description:
      "Completed transactions for one or more markets — price, size, and direction. Search tickers; set a shared date range in Common queries.",
  },
  {
    id: "orderbook",
    title: "Market Orderbook",
    description:
      "Current yes/no bid levels for one market. Enter a ticker; each price level becomes a row. Asks are implied as 1 − opposite bid.",
  },
];

/** Endpoint ids that are visible but not selectable yet. */
export const KALSHI_LIVE_UNDER_CONSTRUCTION_ENDPOINT_IDS = new Set(
  KALSHI_LIVE_CONNECT_ENDPOINTS.filter((ep) => ep.underConstruction).map((ep) => ep.id),
);

export const KALSHI_LIVE_DEFAULT_LIMIT = 100;

/** @param {string} endpointId */
export function getKalshiLiveColumnsForEndpoint(endpointId) {
  if (endpointId === "candlesticks") return KALSHI_LIVE_CANDLESTICK_COLUMNS;
  if (endpointId === "trades") return KALSHI_LIVE_TRADES_COLUMNS;
  if (endpointId === "orderbook") return KALSHI_LIVE_ORDERBOOK_COLUMNS;
  if (endpointId === "series") return KALSHI_LIVE_SERIES_COLUMNS;
  return KALSHI_LIVE_MARKETS_COLUMNS;
}

/** @param {string} endpointId */
export function getKalshiLiveColumnDisplayLabelForEndpoint(endpointId, col) {
  if (endpointId === "candlesticks") return getKalshiLiveCandlestickColumnLabel(col);
  if (endpointId === "trades") return getKalshiLiveTradeColumnLabel(col);
  if (endpointId === "orderbook") return getKalshiLiveOrderbookColumnLabel(col);
  if (endpointId === "series") {
    return getKalshiLiveSeriesColumnLabel(col);
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
