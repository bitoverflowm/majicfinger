import { KALSHI_LIVE_CONNECT_CONFIG } from "@/config/kalshiLiveConnect";
import {
  getKalshiHistoricalV2TradeColumnLabel,
  KALSHI_HISTORICAL_V2_TRADES_COLUMNS,
} from "@/lib/kalshiHistoricalV2/historicalTradesColumns";

/** Connect home — Kalshi Historical v2 endpoints (Kalshi historical API up to cutoff). */

export const KALSHI_HISTORICAL_V2_CONNECT_ENDPOINTS = [
  {
    id: "markets",
    title: "Markets",
    description:
      "Historical market metadata, prices, and status for settled markets before the live cutoff.",
  },
  {
    id: "trades",
    title: "Trades",
    description:
      "Historical trade history for markets up to the live/historical cutoff.",
  },
  {
    id: "candlesticks",
    title: "Candlesticks",
    description:
      "Historical OHLC candlestick data for markets before the live cutoff.",
  },
];

/**
 * @param {string} endpointId
 */
export function getKalshiHistoricalV2ColumnsForEndpoint(endpointId) {
  if (endpointId === "trades") return KALSHI_HISTORICAL_V2_TRADES_COLUMNS;
  return KALSHI_LIVE_CONNECT_CONFIG.getColumnsForEndpoint(endpointId);
}

/**
 * @param {string} endpointId
 * @param {string | { name: string; label?: string }} col
 */
export function getKalshiHistoricalV2ColumnDisplayLabel(endpointId, col) {
  if (endpointId === "trades") return getKalshiHistoricalV2TradeColumnLabel(col);
  return KALSHI_LIVE_CONNECT_CONFIG.getColumnDisplayLabel(endpointId, col);
}

export const KALSHI_HISTORICAL_V2_CONNECT_CONFIG = {
  getColumnsForEndpoint: getKalshiHistoricalV2ColumnsForEndpoint,
  getColumnDisplayLabel: getKalshiHistoricalV2ColumnDisplayLabel,
};
