"use client";

import { KalshiLiveMarketPicker } from "@/components/dashboardComposer/kalshiLiveMarketPicker";
import { isKalshiLiveTraderTable } from "@/components/dashboardComposer/kalshiLiveDirectScope";

/**
 * Query controls for a Kalshi Live market endpoint pulled on its own.
 * The markets join stays on the Markets endpoint.
 * Series is one search: tickers hit the series endpoint, and a category with no tickers discovers.
 * Trades and candlesticks take a date range (and candles a period). The order book is a live snapshot with only a depth.
 */
export function KalshiLiveDirectQuery({ tableId, picks, onAdd, onRemove, required = false, tipSide }) {
  if (isKalshiLiveTraderTable(tableId)) return null;
  const shared = { picks, onAdd, onRemove, tipSide };
  if (tableId === "series" || tableId === "multivariate_events") {
    return <KalshiLiveMarketPicker intent="series" {...shared} />;
  }
  if (tableId === "events") {
    return <KalshiLiveMarketPicker intent="events" {...shared} />;
  }
  if (tableId === "event_candlesticks") {
    return <KalshiLiveMarketPicker intent="events" required {...shared} />;
  }
  if (tableId === "event_forecast") {
    return <KalshiLiveMarketPicker intent="forecast" {...shared} />;
  }

  return <KalshiLiveMarketPicker required={required} {...shared} />;
}
