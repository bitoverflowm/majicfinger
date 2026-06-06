/**
 * After loading a saved project, replay Athena for every provenance-backed sheet
 * (dependency order) so users see full data, not Mongo preview rows (~12.5k after save shrink).
 */

import { buildSheetProvenanceGraphForRehydrate } from "@/lib/dataLake/rehydrateSheetCore";
import { rehydrateSheetAsync } from "@/lib/rehydrateSheetAsync";
import {
  isPartialProvenanceReload,
  resolvePersistedFullRowCount,
} from "@/lib/projectPersistence";

function sheetNeedsRehydrate(sheet) {
  if (!sheet?.provenance || sheet.provenance.kind !== "compose") return false;
  if (sheet.rehydrationStatus === "complete" && sheet.storageMode === "inline") return false;
  return sheet.storageMode === "provenance" || sheet.rehydrationStatus !== "complete";
}

/** Topological order: dependency sheets before dependents. */
function orderSheetsForRehydrate(dataSheets) {
  const ids = Object.keys(dataSheets || {}).filter((id) => sheetNeedsRehydrate(dataSheets[id]));
  const ordered = [];
  const visiting = new Set();
  const done = new Set();

  const visit = (id) => {
    if (!id || done.has(id) || !dataSheets[id]) return;
    if (visiting.has(id)) return;
    visiting.add(id);
    const joins = dataSheets[id]?.provenance?.serverSheetJoins || [];
    for (const dep of joins) {
      if (dep?.targetSheetId) visit(String(dep.targetSheetId));
    }
    visiting.delete(id);
    if (sheetNeedsRehydrate(dataSheets[id])) {
      done.add(id);
      ordered.push(id);
    }
  };

  for (const id of ids) visit(id);
  return ordered;
}

/**
 * @param {Record<string, object>} dataSheets
 * @param {string} sheetId
 */
async function rehydrateOneSheet(dataSheets, sheetId) {
  const sheet = dataSheets?.[sheetId];
  if (!sheet?.provenance) return sheet;

  const sheetGraph = buildSheetProvenanceGraphForRehydrate(dataSheets, sheetId);
  const { rows, json } = await rehydrateSheetAsync({
    sheetId,
    provenance: sheet.provenance,
    sheetGraph,
    sheet,
  });
  const partial = isPartialProvenanceReload(sheet, rows.length);
  const fullRowCount = resolvePersistedFullRowCount(sheet, json?.rowCount ?? rows.length);
  return {
    ...sheet,
    data: rows,
    storageMode: partial ? "provenance" : "inline",
    rehydrationStatus: partial ? "preview" : "complete",
    rowCount: rows.length,
    fullRowCount,
    columns: Array.isArray(json?.columns) ? json.columns : sheet.columns,
    saveMeta: {
      ...(sheet.saveMeta || {}),
      fullRowCount,
      truncated: partial,
      rehydratedAt: new Date().toISOString(),
    },
  };
}

/**
 * @param {Record<string, object>} dataSheets
 * @param {{ onSheetStart?: (sheetId: string) => void; onSheetDone?: (sheetId: string) => void }} [hooks]
 * @returns {Promise<Record<string, object>>}
 */
export async function rehydrateProjectProvenanceSheets(dataSheets, hooks = {}) {
  const base = dataSheets && typeof dataSheets === "object" ? { ...dataSheets } : {};
  const order = orderSheetsForRehydrate(base);
  if (!order.length) return base;

  for (const sheetId of order) {
    hooks.onSheetStart?.(sheetId);
    try {
      base[sheetId] = await rehydrateOneSheet(base, sheetId);
      hooks.onSheetDone?.(sheetId);
    } catch (err) {
      hooks.onSheetError?.(sheetId, err);
      console.warn(`[rehydrateProjectProvenanceSheets] ${sheetId}:`, err?.message || err);
    }
  }
  return base;
}
