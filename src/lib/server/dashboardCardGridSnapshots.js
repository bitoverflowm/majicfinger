import { clampCardGridRowLimit } from "@/lib/dashboardCardGrid";
import { hydrateDataSetForPublicChartViewer } from "@/lib/server/hydratePublicChartDataset";
import {
  collectCardGridSheetLimits,
  hydrateCardGridSheetsForPublicDashboard,
} from "@/lib/server/hydrateDashboardCardGridSheets";

/**
 * Build cardGrid sheet snapshots for a dashboard (used at publish/save and public load).
 * @returns {Promise<Record<string, object[]>>}
 */
export async function buildDashboardCardGridSnapshots(dashboardLean, dataSetLean) {
  const layout = dashboardLean?.layout;
  const limits = collectCardGridSheetLimits(layout);
  if (!limits.size || !dataSetLean) return {};

  const dataSet = await hydrateDataSetForPublicChartViewer(null, dataSetLean);
  const dataSheets =
    dataSet?.data_sheets && typeof dataSet.data_sheets === "object" ? { ...dataSet.data_sheets } : {};

  await hydrateCardGridSheetsForPublicDashboard(
    dataSheets,
    layout,
    dashboardLean?.user_id || dataSetLean?.user_id,
  );

  /** @type {Record<string, object[]>} */
  const snapshots = {};
  for (const [sheetId, rowLimit] of limits) {
    const rows = dataSheets[sheetId]?.data;
    if (Array.isArray(rows) && rows.length) {
      snapshots[sheetId] = rows.slice(0, rowLimit);
    }
  }
  return snapshots;
}

/**
 * Merge stored cardGrid snapshots into hydrated dataSheets (fast path for public views).
 */
export function applyCardGridSnapshotsToSheets(dataSheets, layout, snapshots) {
  if (!snapshots || typeof snapshots !== "object") return dataSheets;
  const limits = collectCardGridSheetLimits(layout);
  for (const sheetId of limits.keys()) {
    const rows = snapshots[sheetId];
    if (!Array.isArray(rows) || !rows.length) continue;
    const limit = limits.get(sheetId) || clampCardGridRowLimit(undefined);
    dataSheets[sheetId] = {
      ...(dataSheets[sheetId] || {}),
      data: rows.slice(0, limit),
      storageMode: "inline",
      rehydrationStatus: "complete",
      rowCount: Math.min(rows.length, limit),
    };
  }
  return dataSheets;
}
