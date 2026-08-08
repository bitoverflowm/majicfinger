/**
 * Resolve whether a dashboard/dataset can serve public on-demand Kalshi live
 * (no cron / no Mongo tick accumulation).
 */

import mongoose from "mongoose";
import Chart from "@/models/Charts";
import DataSet from "@/models/DataSets";
import {
  discoverEventCandlesticksFeedGroup,
  discoverTradesFeedGroup,
} from "@/lib/liveFeeds/feedConfig";
import {
  chartReferencedSheetIds,
  readChartBuilderSnapshot,
} from "@/lib/liveFeeds/chartLivePublishConfig";
import { publicLivePollIntervalMs } from "@/lib/liveFeeds/publicLiveKalshiCache";
import { getLiveFeedEndpointDef } from "@/lib/liveFeeds/registry";
import { collectChartIdsFromLayout } from "@/lib/server/publicDashboardHydration";

/**
 * True when workbook sheets look like a Kalshi event-candlesticks group.
 * @param {Record<string, object> | null | undefined} dataSheets
 */
export function datasetHasEventCandlesticksLiveSource(dataSheets) {
  return !!discoverEventCandlesticksFeedGroup(dataSheets || {});
}

/**
 * True when workbook sheets look like Kalshi market trades live group.
 * @param {Record<string, object> | null | undefined} dataSheets
 */
export function datasetHasTradesLiveSource(dataSheets) {
  return !!discoverTradesFeedGroup(dataSheets || {});
}

/**
 * Fields to set on ChartDashboard for public on-demand live.
 * @param {boolean} liveBacked
 */
export function liveBackedDashboardFields(liveBacked) {
  const on = !!liveBacked;
  return {
    live_backed: on,
    ...(on ? { live_backed_at: new Date() } : {}),
  };
}

/**
 * @param {string} dataSetId
 * @param {{ dataSheets?: Record<string, object> | null }} [opts]
 */
export async function resolveDatasetLiveBacked(dataSetId, opts = {}) {
  const id = String(dataSetId || "").trim();
  if (!id || !mongoose.Types.ObjectId.isValid(id)) return false;
  let sheets = opts.dataSheets;
  if (!sheets || typeof sheets !== "object") {
    const ds = await DataSet.findById(id).select("data_sheets").lean();
    sheets = ds?.data_sheets && typeof ds.data_sheets === "object" ? ds.data_sheets : null;
  }
  return (
    datasetHasEventCandlesticksLiveSource(sheets) || datasetHasTradesLiveSource(sheets)
  );
}

/**
 * @param {object} chartLean
 * @returns {{ sheetId: string; ohlcSetId: string } | null}
 */
function candlestickRefFromChart(chartLean) {
  const cp = Array.isArray(chartLean?.chart_properties) ? chartLean.chart_properties[0] : null;
  const rb =
    (cp && typeof cp === "object" && cp.rechartsBuilder?.v === 1 ? cp.rechartsBuilder : null) ||
    (chartLean?.rechartsBuilder?.v === 1 ? chartLean.rechartsBuilder : null);
  if (!rb || String(rb.selChartType || "") !== "candlestick") return null;
  const sheetId = String(rb.candlestickSheetId || "").trim();
  if (!sheetId) return null;
  return {
    sheetId,
    ohlcSetId: String(rb.candlestickOhlcSetId || "auto"),
  };
}

/**
 * Any chart type → primary referenced sheet id(s).
 * @param {object} chartLean
 * @param {Record<string, object>} dataSheets
 * @returns {string[]}
 */
function sheetIdsFromChart(chartLean, dataSheets) {
  const candle = candlestickRefFromChart(chartLean);
  if (candle?.sheetId) return [candle.sheetId];
  const snapshot = readChartBuilderSnapshot(chartLean);
  return chartReferencedSheetIds(dataSheets, snapshot);
}

/**
 * Live config for a published dashboard: Kalshi event params + chartId→ticker map.
 * Prefers event candlesticks; falls back to market trades.
 * @param {object} dash lean ChartDashboard
 * @returns {Promise<{
 *   kind: "event_candlesticks" | "trades";
 *   eventTicker?: string;
 *   seriesTicker?: string;
 *   periodInterval: number;
 *   pollIntervalMs: number;
 *   marketsMetadataSheetId?: string;
 *   marketTickers?: string[];
 *   lookbackSec?: number;
 *   overlayKind: "candlestick_ohlc" | "sheet_rows";
 *   chartMap: Record<string, { ticker: string; sheetId: string }>;
 * } | null>}
 */
export async function resolvePublicDashboardLiveConfig(dash) {
  const dataSetId = String(dash?.data_set_id || "").trim();
  if (!dataSetId || !mongoose.Types.ObjectId.isValid(dataSetId)) return null;

  const dataSet = await DataSet.findById(dataSetId).select("data_sheets").lean();
  const sheets =
    dataSet?.data_sheets && typeof dataSet.data_sheets === "object" ? dataSet.data_sheets : {};

  const eventGroup = discoverEventCandlesticksFeedGroup(sheets);
  if (eventGroup) {
    const tickerBySheetId = new Map();
    for (const [ticker, sheetId] of Object.entries(eventGroup.sheets.marketSheetIdsByTicker || {})) {
      tickerBySheetId.set(String(sheetId), String(ticker).toUpperCase());
    }

    const chartIds = [...collectChartIdsFromLayout(dash.layout)];
    /** @type {Record<string, { ticker: string; sheetId: string }>} */
    const chartMap = {};

    if (chartIds.length) {
      const charts = await Chart.find({ _id: { $in: chartIds } })
        .select("chart_properties rechartsBuilder")
        .lean();
      for (const chart of charts) {
        const ref = candlestickRefFromChart(chart);
        if (!ref) continue;
        const ticker = tickerBySheetId.get(ref.sheetId);
        if (!ticker) continue;
        chartMap[String(chart._id)] = { ticker, sheetId: ref.sheetId };
      }
    }

    if (Object.keys(chartMap).length < chartIds.length) {
      const rows = Array.isArray(dash?.layout?.rows) ? dash.layout.rows : [];
      for (const row of rows) {
        if (row?.type !== "cards" || !Array.isArray(row.columns)) continue;
        for (const col of row.columns) {
          const cid = String(col?.chart_id || "").trim();
          if (!cid || chartMap[cid]) continue;
          const micro = String(col?.microtext || "").trim().toUpperCase();
          const sheetId = eventGroup.sheets.marketSheetIdsByTicker?.[micro];
          if (micro && sheetId) {
            chartMap[cid] = { ticker: micro, sheetId };
          }
        }
      }
    }

    if (!Object.keys(chartMap).length) return null;

    return {
      kind: "event_candlesticks",
      eventTicker: eventGroup.eventTicker,
      seriesTicker: eventGroup.seriesTicker,
      periodInterval: eventGroup.periodInterval,
      pollIntervalMs: publicLivePollIntervalMs(eventGroup.periodInterval),
      marketsMetadataSheetId: eventGroup.sheets.marketsMetadataSheetId,
      overlayKind: "candlestick_ohlc",
      chartMap,
    };
  }

  const tradesGroup = discoverTradesFeedGroup(sheets);
  if (!tradesGroup) return null;

  const tickerBySheetId = new Map();
  for (const [ticker, sheetId] of Object.entries(tradesGroup.sheets.marketSheetIdsByTicker || {})) {
    tickerBySheetId.set(String(sheetId), String(ticker).toUpperCase());
  }

  const chartIds = [...collectChartIdsFromLayout(dash.layout)];
  /** @type {Record<string, { ticker: string; sheetId: string }>} */
  const chartMap = {};

  if (chartIds.length) {
    const charts = await Chart.find({ _id: { $in: chartIds } })
      .select("chart_properties rechartsBuilder")
      .lean();
    for (const chart of charts) {
      const sheetIds = sheetIdsFromChart(chart, sheets);
      for (const sheetId of sheetIds) {
        const ticker = tickerBySheetId.get(sheetId);
        if (!ticker) continue;
        chartMap[String(chart._id)] = { ticker, sheetId };
        break;
      }
    }
  }

  if (Object.keys(chartMap).length < chartIds.length) {
    const rows = Array.isArray(dash?.layout?.rows) ? dash.layout.rows : [];
    for (const row of rows) {
      if (row?.type !== "cards" || !Array.isArray(row.columns)) continue;
      for (const col of row.columns) {
        const cid = String(col?.chart_id || "").trim();
        if (!cid || chartMap[cid]) continue;
        const micro = String(col?.microtext || "").trim().toUpperCase();
        const sheetId = tradesGroup.sheets.marketSheetIdsByTicker?.[micro];
        if (micro && sheetId) {
          chartMap[cid] = { ticker: micro, sheetId };
        }
      }
    }
  }

  if (!Object.keys(chartMap).length) return null;

  const lookbackSec =
    getLiveFeedEndpointDef("kalshi-live", "trades")?.lookbackPeriods || 3_600;

  return {
    kind: "trades",
    periodInterval: 1,
    pollIntervalMs: Math.max(15_000, 60_000),
    marketTickers: tradesGroup.marketTickers,
    lookbackSec,
    overlayKind: "sheet_rows",
    chartMap,
  };
}
