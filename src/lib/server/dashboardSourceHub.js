import mongoose from "mongoose";
import Chart from "@/models/Charts";
import { loadDataSetSheetMeta } from "@/lib/server/dataSetSheetMeta";
import { hubSlugFromTags } from "@/lib/dashboardHubTags";

/** Sheet `provenance.source` → hub page slug. */
const SOURCE_HUB = {
  "kalshi-live": "kalshi-live-data",
  kalshi: "kalshi-historical-data",
  "kalshi-historical": "kalshi-historical-data",
  "polymarket-live": "polymarket-live-data",
  polymarket: "polymarket-historical-data",
  "polymarket-historical": "polymarket-historical-data",
};

/**
 * The integration hub a published dashboard's data actually comes from, by counting sheet
 * provenance across the dashboard dataset and its charts' datasets. Falls back to tags, and
 * returns null rather than guessing when neither says.
 *
 * @param {{ data_set_id?: unknown; layout?: { rows?: any[] }; tags?: string[] }} dash
 * @returns {Promise<string | null>}
 */
export async function resolveDashboardSourceHub(dash) {
  const dataSetIds = new Set();
  if (dash?.data_set_id) dataSetIds.add(String(dash.data_set_id));

  const chartIds = [];
  for (const row of dash?.layout?.rows || []) {
    if (row?.type !== "cards" || !Array.isArray(row.columns)) continue;
    for (const col of row.columns) {
      const id = String(col?.chart_id || "");
      if (mongoose.Types.ObjectId.isValid(id)) chartIds.push(id);
    }
  }
  if (chartIds.length) {
    const charts = await Chart.find({ _id: { $in: chartIds } }).select("data_set_id").lean();
    for (const c of charts) if (c.data_set_id) dataSetIds.add(String(c.data_set_id));
  }

  /** @type {Record<string, number>} */
  const counts = {};
  const sheetMaps = await Promise.all([...dataSetIds].map((id) => loadDataSetSheetMeta(id).catch(() => ({}))));
  for (const sheets of sheetMaps) {
    for (const sheet of Object.values(sheets || {})) {
      const hub = SOURCE_HUB[String(sheet?.provenance?.source || "").trim().toLowerCase()];
      if (hub) counts[hub] = (counts[hub] || 0) + 1;
    }
  }
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return ranked[0]?.[0] || hubSlugFromTags(dash?.tags);
}
