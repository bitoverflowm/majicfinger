import Chart from "@/models/Charts";
import DataSet from "@/models/DataSets";
import mongoose from "mongoose";
import { buildDashboardCardGridSnapshots } from "@/lib/server/dashboardCardGridSnapshots";
import { buildChartBundlesParallel, collectChartIdsFromLayout } from "@/lib/server/publicDashboardHydration";

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
  const map = await buildChartBundlesParallel(new Set([cid]), dash.user_id);
  const bundle = map.get(cid);
  if (!bundle) {
    throw new Error("Chart not found");
  }
  return bundle;
}

export { collectChartIdsFromLayout };
