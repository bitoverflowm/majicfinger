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
