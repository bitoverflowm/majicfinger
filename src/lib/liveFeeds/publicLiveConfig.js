/**
 * Resolve whether a dashboard/dataset can serve public on-demand Kalshi live
 * (no cron / no Mongo tick accumulation).
 */

import mongoose from "mongoose";
import Chart from "@/models/Charts";
import DataSet from "@/models/DataSets";
import { discoverEventCandlesticksFeedGroup } from "@/lib/liveFeeds/feedConfig";
import { publicLivePollIntervalMs } from "@/lib/liveFeeds/publicLiveKalshiCache";
import { collectChartIdsFromLayout } from "@/lib/server/publicDashboardHydration";

/**
 * True when workbook sheets look like a Kalshi event-candlesticks group.
 * @param {Record<string, object> | null | undefined} dataSheets
 */
export function datasetHasEventCandlesticksLiveSource(dataSheets) {
  return !!discoverEventCandlesticksFeedGroup(dataSheets || {});
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
  return datasetHasEventCandlesticksLiveSource(sheets);
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
 * Live config for a published dashboard: Kalshi event params + chartId→ticker map.
 * @param {object} dash lean ChartDashboard
 * @returns {Promise<{
 *   eventTicker: string;
 *   seriesTicker: string;
 *   periodInterval: number;
 *   pollIntervalMs: number;
 *   marketsMetadataSheetId: string;
 *   chartMap: Record<string, { ticker: string; sheetId: string }>;
 * } | null>}
 */
export async function resolvePublicDashboardLiveConfig(dash) {
  const dataSetId = String(dash?.data_set_id || "").trim();
  if (!dataSetId || !mongoose.Types.ObjectId.isValid(dataSetId)) return null;

  const dataSet = await DataSet.findById(dataSetId).select("data_sheets").lean();
  const sheets = dataSet?.data_sheets && typeof dataSet.data_sheets === "object" ? dataSet.data_sheets : {};
  const group = discoverEventCandlesticksFeedGroup(sheets);
  if (!group) return null;

  const tickerBySheetId = new Map();
  for (const [ticker, sheetId] of Object.entries(group.sheets.marketSheetIdsByTicker || {})) {
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

  // Fallback: layout microtext often stores the market ticker
  if (Object.keys(chartMap).length < chartIds.length) {
    const rows = Array.isArray(dash?.layout?.rows) ? dash.layout.rows : [];
    for (const row of rows) {
      if (row?.type !== "cards" || !Array.isArray(row.columns)) continue;
      for (const col of row.columns) {
        const cid = String(col?.chart_id || "").trim();
        if (!cid || chartMap[cid]) continue;
        const micro = String(col?.microtext || "").trim().toUpperCase();
        const sheetId = group.sheets.marketSheetIdsByTicker?.[micro];
        if (micro && sheetId) {
          chartMap[cid] = { ticker: micro, sheetId };
        }
      }
    }
  }

  if (!Object.keys(chartMap).length) return null;

  return {
    eventTicker: group.eventTicker,
    seriesTicker: group.seriesTicker,
    periodInterval: group.periodInterval,
    pollIntervalMs: publicLivePollIntervalMs(group.periodInterval),
    marketsMetadataSheetId: group.sheets.marketsMetadataSheetId,
    chartMap,
  };
}
