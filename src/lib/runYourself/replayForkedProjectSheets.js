import {
  buildRehydrateSheetRequestBody,
  buildSheetProvenanceGraphForRehydrate,
  runRehydrateSheetCore,
} from "@/lib/dataLake/rehydrateSheetCore";
import { replayOperations } from "@/lib/projectPersistence";
import { refreshForkOperationHistory } from "@/lib/runYourself/refreshForkSheetRequestMetadata";
import { normalizeLakeBigintFieldsInRows } from "@/lib/dataLake/lakeBigintNormalize";

/**
 * Re-execute lake pulls and replay sheet operation history for a forked project.
 *
 * @param {object} opts
 * @param {Record<string, object>} opts.dataSheets Mutable sheet map (provenance already patched)
 * @param {string[]} opts.sheetOrder Topological sheet ids
 * @param {object} opts.access Athena access from getAthenaAccessForUserId
 * @returns {Promise<Record<string, object>>}
 */
export async function replayForkedProjectSheets({ dataSheets, sheetOrder, access, forkReplay = false }) {
  const sheets = { ...(dataSheets || {}) };
  /** @type {Map<string, object[]>} */
  const rowsBySheet = new Map();

  for (const sheetId of sheetOrder) {
    const sheet = sheets[sheetId];
    if (!sheet) continue;

    const provenance = sheet.provenance;
    const hasCompose = provenance && provenance.kind === "compose";

    if (hasCompose) {
      const sheetGraph = buildSheetProvenanceGraphForRehydrate(sheets, sheetId);
      const body = buildRehydrateSheetRequestBody({
        sheetId,
        provenance,
        sheetGraph,
        sheet,
        maxRows: forkReplay ? undefined : sheet.fullRowCount || sheet.rowCount || undefined,
      });
      try {
        const json = await runRehydrateSheetCore(body, access);
        const rows = normalizeLakeBigintFieldsInRows(Array.isArray(json?.rows) ? json.rows : []);
        rowsBySheet.set(sheetId, rows);
        sheets[sheetId] = {
          ...sheet,
          data: rows,
          storageMode: "inline",
          rehydrationStatus: "complete",
          rowCount: rows.length,
          fullRowCount: json?.rowCount ?? rows.length,
          columns: Array.isArray(json?.columns) ? json.columns : sheet.columns,
          operationHistory: refreshForkOperationHistory({ ...sheet, provenance }),
        };
      } catch (err) {
        throw new Error(`Failed to rehydrate sheet "${sheet.name || sheetId}": ${err?.message || err}`);
      }
      continue;
    }

    const sourceId = sheet.sourceSheetId || findBucketSourceFromHistory(sheet);
    const parentRows = sourceId ? rowsBySheet.get(sourceId) : null;
    if (!parentRows?.length) {
      const inline = Array.isArray(sheet.data) ? sheet.data : [];
      if (inline.length) {
        rowsBySheet.set(sheetId, inline);
        continue;
      }
      throw new Error(`Sheet "${sheet.name || sheetId}" has no source data to replay.`);
    }

    let rows = [...parentRows];
    const history = refreshForkOperationHistory(sheet);
    for (const op of history) {
      if (op?.type === "source.compose") continue;
      if (op?.type === "bucket.sheet") {
        rows = replayOperations({ rows, operations: [op] });
        continue;
      }
      rows = replayOperations({ rows, operations: [op] });
    }
    rows = normalizeLakeBigintFieldsInRows(rows);
    rowsBySheet.set(sheetId, rows);
    sheets[sheetId] = {
      ...sheet,
      data: rows,
      storageMode: "inline",
      rehydrationStatus: "complete",
      rowCount: rows.length,
      fullRowCount: rows.length,
      operationHistory: history,
    };
  }

  return sheets;
}

/**
 * @param {object} sheet
 * @returns {string | null}
 */
function findBucketSourceFromHistory(sheet) {
  const hist = Array.isArray(sheet?.operationHistory) ? sheet.operationHistory : [];
  for (const op of hist) {
    if (op?.type === "bucket.sheet" && op.sourceSheetId) return String(op.sourceSheetId);
  }
  return sheet?.sourceSheetId ? String(sheet.sourceSheetId) : null;
}
