import { replayOperations, sheetHasRefineRecipe, sheetHasComposeProvenance, isDefaultOrphanSheetName, sheetIsOrphanDefaultDuplicate } from "@/lib/projectPersistence";
import { applyRefineQueryToRows } from "@/lib/sheetOperations/refineQuery";

function findRefineSourceFromHistory(sheet) {
  const hist = Array.isArray(sheet?.operationHistory) ? sheet.operationHistory : [];
  for (const op of hist) {
    if (op?.type === "refine.query" && op?.sourceSheetId) return String(op.sourceSheetId);
  }
  return sheet?.sourceSheetId ? String(sheet.sourceSheetId) : null;
}

export { sheetHasRefineRecipe };

export function sheetNeedsDerivedReplay(sheet) {
  if (!sheet || typeof sheet !== "object") return false;
  if (!sheetHasRefineRecipe(sheet)) return false;
  const loaded = Array.isArray(sheet?.data) ? sheet.data.length : 0;
  if (sheet?.storageMode === "derived" && loaded === 0) return true;
  if (sheet?.saveMeta?.recipeOnly === true && loaded === 0) return true;
  if (sheet?.rehydrationStatus === "pending" && loaded === 0) return true;
  return false;
}

/** Topological order: parents before derived sheets. */
export function orderDerivedSheetsForReplay(dataSheets) {
  const ids = Object.keys(dataSheets || {}).filter((id) => sheetNeedsDerivedReplay(dataSheets[id]));
  const ordered = [];
  const visiting = new Set();
  const done = new Set();

  const sourceOf = (id) => {
    const sheet = dataSheets[id];
    return findRefineSourceFromHistory(sheet);
  };

  const visit = (id) => {
    if (!id || done.has(id) || !dataSheets[id]) return;
    if (visiting.has(id)) return;
    visiting.add(id);
    const src = sourceOf(id);
    if (src && ids.includes(src)) visit(src);
    visiting.delete(id);
    if (sheetNeedsDerivedReplay(dataSheets[id])) {
      done.add(id);
      ordered.push(id);
    }
  };

  for (const id of ids) visit(id);
  return ordered;
}

/**
 * @param {Record<string, object>} dataSheets
 * @returns {Record<string, object>}
 */
export function replayProjectDerivedSheets(dataSheets) {
  const base = dataSheets && typeof dataSheets === "object" ? { ...dataSheets } : {};
  const rowsBySheet = new Map();

  for (const [id, sheet] of Object.entries(base)) {
    const rows = Array.isArray(sheet?.data) ? sheet.data : [];
    if (rows.length) rowsBySheet.set(id, rows);
  }

  for (const sheetId of orderDerivedSheetsForReplay(base)) {
    const sheet = base[sheetId];
    const sourceId = findRefineSourceFromHistory(sheet);
    const parentRows = sourceId ? rowsBySheet.get(sourceId) : null;
    if (!parentRows?.length) continue;

    const history = Array.isArray(sheet?.operationHistory) ? sheet.operationHistory : [];
    const refineOps = history.filter((op) => op?.type === "refine.query");
    let rows = parentRows;
    if (refineOps.length) {
      const last = refineOps[refineOps.length - 1];
      rows = applyRefineQueryToRows(parentRows, {
        selectColumns: last.selectColumns,
        filters: last.filters,
      });
    } else {
      rows = replayOperations({
        rows: parentRows,
        operations: history.filter((op) => op?.type !== "source.compose"),
      });
    }

    const fullRowCount = Math.max(
      rows.length,
      Math.floor(Number(sheet?.fullRowCount) || 0),
      Math.floor(Number(sheet?.rowCount) || 0),
    );
    base[sheetId] = {
      ...sheet,
      data: rows,
      storageMode: "derived",
      rehydrationStatus: "complete",
      rowCount: rows.length,
      fullRowCount,
      sourceSheetId: sourceId,
      saveMeta: {
        ...(sheet.saveMeta || {}),
        recipeOnly: true,
        persistRows: false,
        fullRowCount,
      },
    };
    rowsBySheet.set(sheetId, rows);
  }

  return base;
}

export function pickInitialActiveSheetId(sheets) {
  const entries = Object.entries(sheets || {});
  if (!entries.length) return null;

  const provenanceFullCounts = new Set();
  for (const sheet of Object.values(sheets || {})) {
    if (sheetHasComposeProvenance(sheet)) {
      const full = Math.max(
        0,
        Math.floor(Number(sheet?.fullRowCount) || 0),
        Math.floor(Number(sheet?.rowCount) || 0),
        Array.isArray(sheet?.data) ? sheet.data.length : 0,
      );
      if (full > 0) provenanceFullCounts.add(full);
    }
  }

  const scored = entries
    .filter(([id, sheet]) => !sheetIsOrphanDefaultDuplicate(sheet, provenanceFullCounts))
    .map(([id, sheet]) => {
    const rows = Array.isArray(sheet?.data) ? sheet.data.length : 0;
    const hasProv = sheetHasComposeProvenance(sheet);
    const hasOps = Array.isArray(sheet?.operationHistory) && sheet.operationHistory.length > 0;
    const defaultName = isDefaultOrphanSheetName(sheet?.name);
    const derived = sheet?.storageMode === "derived" || sheetHasRefineRecipe(sheet);

    let score = rows > 0 ? 10 : 0;
    if (hasProv) score += 6;
    if (derived) score += 4;
    if (hasOps) score += 3;
    if (!defaultName) score += 8;
    return { id, score, rows };
  });

  if (!scored.length) return entries[0][0];

  scored.sort((a, b) => b.score - a.score || b.rows - a.rows);
  const withRows = scored.find((s) => s.rows > 0);
  return withRows?.id || scored[0]?.id || entries[0][0];
}
