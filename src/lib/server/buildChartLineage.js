import {
  collectChartSnapshotColumnsBySheetId,
  primarySheetIdForChartSnapshot,
} from "@/lib/chartSnapshotDataDeps";
import { QUANT_ATHENA_OPERATION_TYPE } from "@/lib/projectPersistence";
import { collectSheetClosureForCharts } from "@/lib/runYourself/collectSheetClosure";

/**
 * @param {Record<string, object>} dataSheets
 * @param {object} chartLean
 * @returns {object[]}
 */
export function buildChartSheetLineage(dataSheets, chartLean) {
  const sheetIds = collectSheetClosureForCharts(dataSheets || {}, [chartLean]);
  const lineage = [];

  for (const sheetId of sheetIds) {
    const sheet = dataSheets?.[sheetId];
    if (!sheet || typeof sheet !== "object") continue;

    const entry = {
      sheetId,
      name: String(sheet.name || sheetId),
      storageMode: sheet.storageMode || null,
      sourceSheetId: sheet.sourceSheetId || null,
      kind: "inline",
      lake: null,
      tables: [],
      integrations: [],
      operations: [],
    };

    const prov = sheet.provenance;
    if (prov?.kind === "compose") {
      entry.kind = "compose";
      entry.lake = prov.lake || null;
      entry.table = prov.table || null;
      if (entry.table) entry.tables.push(String(entry.table));
      entry.integrations = entry.lake ? [String(entry.lake)] : [];
      for (const join of prov.serverSheetJoins || []) {
        if (join?.lake) entry.integrations.push(String(join.lake));
        if (join?.table) entry.tables.push(String(join.table));
      }
    }

    const hist = Array.isArray(sheet.operationHistory) ? sheet.operationHistory : [];
    for (const op of hist) {
      if (!op?.type) continue;
      entry.operations.push(String(op.type));
      if (op.type === QUANT_ATHENA_OPERATION_TYPE) {
        entry.kind = "quant.athena";
        if (op.join?.lake) entry.integrations.push(String(op.join.lake));
        if (op.join?.table) entry.tables.push(String(op.join.table));
        if (op.rootSheetId) entry.rootSheetId = op.rootSheetId;
      }
      if (op.type === "bucket.sheet" && op.sourceSheetId) {
        entry.sourceSheetId = op.sourceSheetId;
      }
    }

    entry.tables = [...new Set(entry.tables.filter(Boolean))];
    entry.integrations = [...new Set(entry.integrations.filter(Boolean))];
    entry.operations = [...new Set(entry.operations)];
    entry.columnHash = sheet.saveMeta?.columnHash || null;

    lineage.push(entry);
  }

  return lineage;
}

/**
 * @param {Record<string, object>} dataSheets
 * @param {object} chartLean
 * @param {object} snapshot
 */
export function buildChartColumnHashBySheet(dataSheets, chartLean, snapshot) {
  const primaryId = primarySheetIdForChartSnapshot(dataSheets, snapshot);
  const colsBySheet = collectChartSnapshotColumnsBySheetId(snapshot, primaryId, dataSheets);
  /** @type {Record<string, string>} */
  const out = {};
  for (const sheetId of colsBySheet.keys()) {
    const hash = dataSheets?.[sheetId]?.saveMeta?.columnHash;
    if (hash) out[sheetId] = String(hash);
  }
  return out;
}
