import {
  getKalshiLiveMarketColumnLabel,
  KALSHI_LIVE_MARKETS_COLUMNS,
} from "@/lib/kalshiLive/marketsColumns";

/** Connect home — Kalshi Live API endpoints (unauthenticated). */
export const KALSHI_LIVE_CONNECT_ENDPOINTS = [
  {
    id: "markets",
    title: "Markets",
    description: "Live market metadata, prices, and status from the Kalshi trade API.",
  },
];

export const KALSHI_LIVE_DEFAULT_LIMIT = 100;

export const KALSHI_LIVE_CONNECT_CONFIG = {
  endpoints: KALSHI_LIVE_CONNECT_ENDPOINTS,
  getColumnsForEndpoint: () => KALSHI_LIVE_MARKETS_COLUMNS,
  getColumnDisplayLabel: getKalshiLiveMarketColumnLabel,
};
