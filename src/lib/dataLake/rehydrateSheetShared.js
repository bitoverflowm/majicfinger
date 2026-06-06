/**
 * Browser-safe helpers shared by rehydrate API + client replay (no AWS imports).
 */
import {
  PROJECT_MIN_PREVIEW_ROW_LIMIT,
  resolveSheetIntentFullRowCount,
} from "@/lib/projectPersistence";

/** How many leading rows to hash-compare after replay (never send full preview rows in POST body). */
export function resolvePreviewRowCountForRehydrate(sheetOrBody) {
  const src = sheetOrBody && typeof sheetOrBody === "object" ? sheetOrBody : {};
  const fromField = Number(src.previewRowCount);
  if (Number.isFinite(fromField) && fromField >= 0) return Math.floor(fromField);
  if (Array.isArray(src.previewRows)) return src.previewRows.length;
  if (src?.saveMeta?.previewHash) return PROJECT_MIN_PREVIEW_ROW_LIMIT;
  return 0;
}

/**
 * Minimal POST body for rehydrate start — Athena + operation replay only.
 */
export function buildRehydrateSheetRequestBody({ sheetId, provenance, sheetGraph, sheet, maxRows }) {
  const src = sheet && typeof sheet === "object" ? sheet : {};
  const intentFull = resolveSheetIntentFullRowCount(src) || null;
  return {
    sheetId,
    provenance,
    sheetGraph: sheetGraph && typeof sheetGraph === "object" ? sheetGraph : {},
    operationHistory: Array.isArray(src.operationHistory) ? src.operationHistory : [],
    previewRowCount: resolvePreviewRowCountForRehydrate(src),
    fullRowCount: intentFull,
    intentFullRowCount: intentFull,
    saveMeta: src.saveMeta || null,
    ...(maxRows != null && maxRows !== "" ? { maxRows } : {}),
  };
}
