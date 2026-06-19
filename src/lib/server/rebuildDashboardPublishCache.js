import Chart from "@/models/Charts";
import DataSet from "@/models/DataSets";
import mongoose from "mongoose";
import { buildDashboardCardGridSnapshots } from "@/lib/server/dashboardCardGridSnapshots";
import { materializeChartBundle } from "@/lib/server/materializeChartBundle";
import { collectChartIdsFromLayout } from "@/lib/server/publicDashboardHydration";

/**
 * Build and persist card grid snapshots for a published dashboard.
 */
export async function persistPublishedCardGridSnapshots(dash) {
  const dataSetRaw = dash.data_set_id ? await DataSet.findById(dash.data_set_id).lean() : null;
  if (!dataSetRaw) return {};
  return buildDashboardCardGridSnapshots(
    { layout: dash.layout, user_id: dash.user_id },
    dataSetRaw,
  );
}

/**
 * Build and merge one chart bundle into published_chart_bundles.
 * Also persists published_bundle on the Chart document when materialization succeeds.
 */
export async function persistPublishedChartBundle(dash, chartId) {
  const cid = String(chartId || "").trim();
  if (!cid || !mongoose.Types.ObjectId.isValid(cid)) {
    throw new Error("Invalid chart id");
  }
  const chartIds = collectChartIdsFromLayout(dash.layout);
  if (!chartIds.has(cid)) {
    throw new Error("Chart not on this dashboard");
  }

  const chart = await Chart.findById(cid);
  if (!chart) {
    throw new Error("Chart not found");
  }
  const dataSetRaw = chart.data_set_id ? await DataSet.findById(chart.data_set_id).lean() : null;
  if (!dataSetRaw) {
    throw new Error("Dataset not found for chart");
  }

  const chartLean = chart.toObject ? chart.toObject() : chart;
  const { bundle, meta } = await materializeChartBundle({
    chartLean,
    dataSetLean: dataSetRaw,
    userId: dash.user_id,
  });

  chart.published_bundle = bundle;
  chart.published_bundle_meta = meta;
  chart.published_bundle_built_at = new Date();
  await chart.save();

  return {
    chart: bundle.chart,
    rows: Array.isArray(bundle.rows) ? bundle.rows : [],
    dataSheets: bundle.dataSheets || {},
    rechartsBuilder: bundle.rechartsBuilder,
    meta: {
      ...meta,
      public_slug: chart.public_slug,
      is_public: !!chart.is_public,
    },
  };
}

export { collectChartIdsFromLayout };
