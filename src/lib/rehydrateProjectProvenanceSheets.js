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
  const loaded = Array.isArray(sheet?.data) ? sheet.data.length : 0;
  const full = resolvePersistedFullRowCount(sheet, loaded);
  if (full > 0 && loaded >= full) return false;
  if (sheet.storageMode === "provenance" || sheet.rehydrationStatus === "pending") return true;
  return sheet.rehydrationStatus !== "complete";
}

/** Group sheets into parallel waves (dependencies before dependents). */
function rehydrateWaves(sheetIds, dataSheets) {
  const remaining = new Set(sheetIds);
  const done = new Set();
  const waves = [];

  const depsOf = (id) =>
    (dataSheets?.[id]?.provenance?.serverSheetJoins || [])
      .map((j) => String(j?.targetSheetId || "").trim())
      .filter((depId) => depId && remaining.has(depId));

  while (remaining.size > 0) {
    const wave = [...remaining].filter((id) => depsOf(id).every((depId) => done.has(depId)));
    if (!wave.length) {
      waves.push([...remaining]);
      break;
    }
    waves.push(wave);
    for (const id of wave) {
      remaining.delete(id);
      done.add(id);
    }
  }
  return waves;
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
    storageMode: "provenance",
    rehydrationStatus: partial ? "pending" : "complete",
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
 * @param {{
 *   onSheetStart?: (sheetId: string) => void;
 *   onSheetDone?: (sheetId: string, sheet: object, allSheets: Record<string, object>) => void;
 *   onSheetError?: (sheetId: string, err: unknown) => void;
 * }} [hooks]
 * @returns {Promise<Record<string, object>>}
 */
export async function rehydrateProjectProvenanceSheets(dataSheets, hooks = {}) {
  const base = dataSheets && typeof dataSheets === "object" ? { ...dataSheets } : {};
  const order = orderSheetsForRehydrate(base);
  if (!order.length) return base;

  const waves = rehydrateWaves(order, base);
  for (const wave of waves) {
    await Promise.all(
      wave.map(async (sheetId) => {
        hooks.onSheetStart?.(sheetId);
        try {
          const updated = await rehydrateOneSheet(base, sheetId);
          base[sheetId] = updated;
          hooks.onSheetDone?.(sheetId, updated, base);
        } catch (err) {
          hooks.onSheetError?.(sheetId, err);
          console.warn(`[rehydrateProjectProvenanceSheets] ${sheetId}:`, err?.message || err);
        }
      }),
    );
  }
  return base;
}
