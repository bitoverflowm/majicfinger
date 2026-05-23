import {
  collectChartSnapshotColumnsBySheetId,
  primarySheetIdForChartData,
} from "@/lib/chartSnapshotDataDeps";
import { buildSheetProvenanceGraphForRehydrate } from "@/lib/dataLake/rehydrateSheetCore";

/**
 * Collect sheet IDs required to render charts (chart deps + provenance join graph + sourceSheetId chain).
 *
 * @param {Record<string, object>} dataSheets
 * @param {object[]} charts Lean chart docs with chart_properties
 * @returns {string[]}
 */
export function collectSheetClosureForCharts(dataSheets, charts) {
  /** @type {Set<string>} */
  const ids = new Set();

  const addSheetAndDeps = (sheetId) => {
    const sid = String(sheetId || "").trim();
    if (!sid || !dataSheets[sid]) return;
    if (ids.has(sid)) return;
    ids.add(sid);

    try {
      const graph = buildSheetProvenanceGraphForRehydrate(dataSheets, sid);
      for (const depId of Object.keys(graph || {})) {
        if (depId !== sid && dataSheets[depId]) ids.add(depId);
      }
    } catch {
      /* single sheet */
    }

    const sheet = dataSheets[sid];
    const sourceId = sheet?.sourceSheetId;
    if (sourceId && dataSheets[sourceId]) addSheetAndDeps(sourceId);

    const hist = Array.isArray(sheet?.operationHistory) ? sheet.operationHistory : [];
    for (const op of hist) {
      if (op?.type === "bucket.sheet" && op.sourceSheetId && dataSheets[op.sourceSheetId]) {
        addSheetAndDeps(op.sourceSheetId);
      }
    }
  };

  for (const chart of charts || []) {
    const cp = Array.isArray(chart?.chart_properties) ? chart.chart_properties[0] : chart?.chart_properties;
    const rb = cp?.rechartsBuilder;
    const primaryId = primarySheetIdForChartData(dataSheets);
    const colsBySheet = collectChartSnapshotColumnsBySheetId(rb, primaryId);
    for (const sheetId of colsBySheet.keys()) {
      addSheetAndDeps(sheetId);
    }
    addSheetAndDeps(primaryId);
  }

  return topologicalSortSheets(dataSheets, [...ids]);
}

/**
 * @param {Record<string, object>} dataSheets
 * @param {string[]} sheetIds
 * @returns {string[]}
 */
function topologicalSortSheets(dataSheets, sheetIds) {
  /** @type {Map<string, Set<string>>} */
  const deps = new Map();
  for (const id of sheetIds) {
    /** @type {Set<string>} */
    const d = new Set();
    const sheet = dataSheets[id];
    if (sheet?.sourceSheetId && sheetIds.includes(sheet.sourceSheetId)) d.add(sheet.sourceSheetId);
    const hist = Array.isArray(sheet?.operationHistory) ? sheet.operationHistory : [];
    for (const op of hist) {
      if (op?.type === "bucket.sheet" && op.sourceSheetId && sheetIds.includes(op.sourceSheetId)) {
        d.add(op.sourceSheetId);
      }
    }
    try {
      const graph = buildSheetProvenanceGraphForRehydrate(dataSheets, id);
      for (const depId of Object.keys(graph || {})) {
        if (depId !== id && sheetIds.includes(depId)) d.add(depId);
      }
    } catch {
      /* ignore */
    }
    deps.set(id, d);
  }

  /** @type {string[]} */
  const sorted = [];
  /** @type {Set<string>} */
  const visited = new Set();
  /** @type {Set<string>} */
  const stack = new Set();

  const visit = (id) => {
    if (visited.has(id)) return;
    if (stack.has(id)) return;
    stack.add(id);
    for (const dep of deps.get(id) || []) visit(dep);
    stack.delete(id);
    visited.add(id);
    sorted.push(id);
  };

  for (const id of sheetIds) visit(id);
  return sorted;
}

/**
 * @param {Record<string, object>} dataSheets
 * @param {string[]} sheetIds
 * @returns {Record<string, object>}
 */
export function pickSheetsSubset(dataSheets, sheetIds) {
  const out = {};
  for (const id of sheetIds) {
    if (dataSheets[id]) out[id] = dataSheets[id];
  }
  return out;
}
