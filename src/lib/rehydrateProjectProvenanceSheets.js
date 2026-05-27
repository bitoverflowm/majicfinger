/**
 * After loading a saved project, replay Athena for every provenance-backed sheet
 * (dependency order) so users see full data, not Mongo preview rows (~12.5k after save shrink).
 */

import { buildSheetProvenanceGraphForRehydrate } from "@/lib/dataLake/rehydrateSheetCore";

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
  const res = await fetch("/api/data-lake/rehydrate-sheet", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      sheetId,
      provenance: sheet.provenance,
      sheetGraph,
      operationHistory: sheet.operationHistory || [],
      previewRows: sheet.data || [],
      saveMeta: sheet.saveMeta || null,
    }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(json?.error || res.statusText || `Rehydrate ${res.status}`);
  }
  const rows = Array.isArray(json?.rows) ? json.rows : [];
  return {
    ...sheet,
    data: rows,
    storageMode: "inline",
    rehydrationStatus: "complete",
    rowCount: rows.length,
    fullRowCount: json?.rowCount ?? rows.length,
    columns: Array.isArray(json?.columns) ? json.columns : sheet.columns,
    saveMeta: {
      ...(sheet.saveMeta || {}),
      truncated: false,
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
    base[sheetId] = await rehydrateOneSheet(base, sheetId);
    hooks.onSheetDone?.(sheetId);
  }
  return base;
}
