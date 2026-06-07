import { clampCardGridRowLimit } from "@/lib/dashboardCardGrid";
import { getAthenaAccessForUserId } from "@/lib/athenaAccess";
import {
  buildRehydrateSheetRequestBody,
  buildSheetProvenanceGraphForRehydrate,
  runRehydrateSheetCore,
} from "@/lib/dataLake/rehydrateSheetCore";
import { sheetHasComposeProvenance } from "@/lib/projectPersistence";

/**
 * sheetId -> max card rows needed (largest rowLimit across cardGrid rows using that sheet).
 */
export function collectCardGridSheetLimits(layout) {
  /** @type {Map<string, number>} */
  const limits = new Map();
  const rows = Array.isArray(layout?.rows) ? layout.rows : [];
  for (const row of rows) {
    if (!row || row.type !== "cardGrid" || !row.sheetId) continue;
    const sheetId = String(row.sheetId).trim();
    if (!sheetId) continue;
    const limit = clampCardGridRowLimit(row.rowLimit);
    limits.set(sheetId, Math.max(limits.get(sheetId) || 0, limit));
  }
  return limits;
}

/**
 * Ensure cardGrid source sheets have row data for public dashboards.
 * Uses inline preview when present; otherwise re-runs the saved lake recipe with a
 * small row cap (card rowLimit), not the full Athena result set.
 *
 * @param {Record<string, any>} dataSheets
 * @param {any} layout
 * @param {unknown} userId
 */
export async function hydrateCardGridSheetsForPublicDashboard(dataSheets, layout, userId) {
  const limits = collectCardGridSheetLimits(layout);
  if (!limits.size || !dataSheets || typeof dataSheets !== "object") {
    return dataSheets;
  }

  let access = null;
  const needsAthena = [...limits.entries()].some(([sheetId, rowLimit]) => {
    const sheet = dataSheets[sheetId];
    const have = Array.isArray(sheet?.data) ? sheet.data.length : 0;
    return have < rowLimit && sheetHasComposeProvenance(sheet);
  });

  if (needsAthena) {
    try {
      access = await getAthenaAccessForUserId(userId);
    } catch {
      access = null;
    }
  }

  for (const [sheetId, rowLimit] of limits) {
    const sheet = dataSheets[sheetId];
    if (!sheet || typeof sheet !== "object") continue;

    const have = Array.isArray(sheet.data) ? sheet.data.length : 0;
    if (have >= rowLimit) {
      dataSheets[sheetId] = {
        ...sheet,
        data: sheet.data.slice(0, rowLimit),
        rehydrationStatus: "complete",
      };
      continue;
    }

    if (have > 0) {
      dataSheets[sheetId] = {
        ...sheet,
        data: sheet.data.slice(0, rowLimit),
        rehydrationStatus: "complete",
      };
      continue;
    }

    if (!sheetHasComposeProvenance(sheet) || !access) continue;

    try {
      const sheetGraph = buildSheetProvenanceGraphForRehydrate(dataSheets, sheetId);
      const body = buildRehydrateSheetRequestBody({
        sheetId,
        provenance: sheet.provenance,
        sheetGraph,
        sheet,
        maxRows: rowLimit,
      });
      // Card grids only need a handful of rows — do not replay the full lake row count.
      body.intentFullRowCount = rowLimit;
      body.fullRowCount = rowLimit;
      const json = await runRehydrateSheetCore(body, access);
      const rows = Array.isArray(json?.rows) ? json.rows.slice(0, rowLimit) : [];
      dataSheets[sheetId] = {
        ...sheet,
        data: rows,
        storageMode: rows.length ? "inline" : sheet.storageMode,
        rehydrationStatus: rows.length ? "complete" : "failed",
        rowCount: rows.length,
        fullRowCount: json?.rowCount ?? rows.length,
      };
    } catch {
      /* leave empty — cards section will show empty state */
    }
  }

  return dataSheets;
}

/**
 * Attach sheetRows to cardGrid layout rows (respecting rowLimit).
 */
export function attachCardGridSheetRows(layout, dataSheets) {
  if (!layout || typeof layout !== "object") return { version: 1, rows: [] };
  const rows = Array.isArray(layout.rows) ? layout.rows : [];
  const nextRows = rows.map((row) => {
    if (!row || row.type !== "cardGrid") return row;
    const sheetId = row.sheetId ? String(row.sheetId) : "";
    const sheet = sheetId && dataSheets?.[sheetId] ? dataSheets[sheetId] : null;
    const limit = clampCardGridRowLimit(row.rowLimit);
    const sheetRows = Array.isArray(sheet?.data) ? sheet.data.slice(0, limit) : [];
    return { ...row, sheetRows };
  });
  return { ...layout, rows: nextRows };
}
