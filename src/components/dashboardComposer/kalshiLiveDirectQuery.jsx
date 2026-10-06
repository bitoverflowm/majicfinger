"use client";

import { KalshiLiveMarketPicker } from "@/components/dashboardComposer/kalshiLiveMarketPicker";
import { isKalshiLiveTraderTable } from "@/components/dashboardComposer/kalshiLiveDirectScope";

/**
 * Query controls for a Kalshi Live market endpoint pulled on its own.
 * The markets join stays on the Markets endpoint.
 * Series is one search: tickers hit the series endpoint, and a category with no tickers discovers.
 * Trades, candlesticks, and the order book keep their date range, period, and depth in attributes.
 */
export function KalshiLiveDirectQuery({ tableId, picks, onAdd, onRemove, required = false }) {
  if (isKalshiLiveTraderTable(tableId)) return null;
  if (tableId === "series" || tableId === "multivariate_events") {
    return <KalshiLiveMarketPicker intent="series" picks={picks} onAdd={onAdd} onRemove={onRemove} />;
  }
  if (tableId === "events") {
    return <KalshiLiveMarketPicker intent="events" picks={picks} onAdd={onAdd} onRemove={onRemove} />;
  }
  if (tableId === "event_candlesticks") {
    return <KalshiLiveMarketPicker intent="events" required picks={picks} onAdd={onAdd} onRemove={onRemove} />;
  }
  if (tableId === "event_forecast") {
    return <KalshiLiveMarketPicker intent="forecast" picks={picks} onAdd={onAdd} onRemove={onRemove} />;
  }

  return <KalshiLiveMarketPicker required={required} picks={picks} onAdd={onAdd} onRemove={onRemove} />;
}
