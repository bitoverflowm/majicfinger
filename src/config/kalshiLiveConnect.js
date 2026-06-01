import {
  getKalshiLiveCandlestickColumnLabel,
  KALSHI_LIVE_CANDLESTICK_COLUMNS,
} from "@/lib/kalshiLive/candlesticksColumns";
import {
  getKalshiLiveMarketColumnLabel,
  KALSHI_LIVE_MARKETS_COLUMNS,
} from "@/lib/kalshiLive/marketsColumns";
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
    description: "Live market metadata, prices, and status from the Kalshi trade API.",
  },
  {
    id: "series",
    title: "Series",
    description:
      "Template for recurring events (e.g. weekly jobs report). Pull one series by ticker — parent of related markets.",
  },
  {
    id: "seriesList",
    title: "Series List",
    description:
      "Browse many series templates with category/tags filters. Sort by volume on our side when the API has no sort param.",
  },
  {
    id: "candlesticks",
    title: "Market Candlesticks",
    description:
      "OHLC price, bid/ask, and volume for one or many markets. Enter tickers below; time range and interval use Where filters.",
  },
  {
    id: "trades",
    title: "Trades",
    description:
      "Completed transactions for one market — price, size, and direction. Enter a market ticker; optional time filters via Where.",
  },
];

export const KALSHI_LIVE_DEFAULT_LIMIT = 100;

/** @param {string} endpointId */
export function getKalshiLiveColumnsForEndpoint(endpointId) {
  if (endpointId === "candlesticks") return KALSHI_LIVE_CANDLESTICK_COLUMNS;
  if (endpointId === "trades") return KALSHI_LIVE_TRADES_COLUMNS;
  if (endpointId === "series" || endpointId === "seriesList") return KALSHI_LIVE_SERIES_COLUMNS;
  return KALSHI_LIVE_MARKETS_COLUMNS;
}

/** @param {string} endpointId */
export function getKalshiLiveColumnDisplayLabelForEndpoint(endpointId, col) {
  if (endpointId === "candlesticks") return getKalshiLiveCandlestickColumnLabel(col);
  if (endpointId === "trades") return getKalshiLiveTradeColumnLabel(col);
  if (endpointId === "series" || endpointId === "seriesList") {
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
