import { resolveEmbedActiveSheetId } from "@/lib/chartSnapshotDataDeps";
import { orderSheetRowsByDataTypes } from "@/lib/sheetIdOrder";

/**
 * Apply a public chart payload's sheets into an embed workspace, keeping `_id` order
 * (and volume-band fallback) consistent with the internal dashboard chart.
 *
 * @param {unknown[]} rows
 * @param {Record<string, any> | null | undefined} dataSheets
 * @param {Record<string, unknown> | null | undefined} chartSnapshot
 */
export function publicChartSheetsForWorkspace(rows, dataSheets, chartSnapshot) {
  const incomingSheets =
    dataSheets && typeof dataSheets === "object" && Object.keys(dataSheets).length
      ? dataSheets
      : { "sheet-1": { name: "Sheet 1", data: Array.isArray(rows) ? rows : [], provenance: null } };
  const activeId = resolveEmbedActiveSheetId(incomingSheets, chartSnapshot);
  const activeSheet = incomingSheets?.[activeId];
  const rawRows =
    Array.isArray(activeSheet?.data) && activeSheet.data.length
      ? activeSheet.data
      : Array.isArray(rows)
        ? rows
        : [];
  const orderedRows = orderSheetRowsByDataTypes(rawRows, activeSheet?.dataTypes);
  const dataTypes =
    activeSheet?.dataTypes && typeof activeSheet.dataTypes === "object" ? activeSheet.dataTypes : null;
  return { incomingSheets, activeId, orderedRows, dataTypes };
}
