/**
 * Browser-safe post-Athena step for sheet replay: objects → operation history → warnings.
 */
import { athenaRowsToObjects } from "@/lib/duckdb/athenaRowsToObjects";
import { normalizeLakeBigintFieldsInRows } from "@/lib/dataLake/lakeBigintNormalize";
import { hashJson, replayOperations } from "@/lib/projectPersistence";
import { resolvePreviewRowCountForRehydrate } from "@/lib/dataLake/rehydrateSheetShared";

/**
 * @param {object} body — rehydrate request body (operationHistory, saveMeta, …)
 * @param {{
 *   columns: string[];
 *   rows: unknown[];
 *   rowCount?: number;
 *   queryExecutionId?: string;
 *   dataScannedBytes?: number | null;
 * }} athenaResult
 * @param {number} requestedLimit
 */
export function finalizeRehydrateSheetResult(body, athenaResult, requestedLimit) {
  const rawObjects = athenaRowsToObjects(
    Array.isArray(athenaResult?.columns) ? athenaResult.columns : [],
    Array.isArray(athenaResult?.rows) ? athenaResult.rows : [],
  );
  const replayedRows = normalizeLakeBigintFieldsInRows(
    replayOperations({
      rows: rawObjects,
      operations: Array.isArray(body?.operationHistory) ? body.operationHistory : [],
    }),
  );

  const replayedColumns = [];
  const seenColumns = new Set();
  for (const col of Array.isArray(athenaResult?.columns) ? athenaResult.columns : []) {
    if (seenColumns.has(col)) continue;
    seenColumns.add(col);
    replayedColumns.push(col);
  }
  for (const row of replayedRows) {
    if (!row || typeof row !== "object") continue;
    for (const col of Object.keys(row)) {
      if (seenColumns.has(col)) continue;
      seenColumns.add(col);
      replayedColumns.push(col);
    }
  }

  const previewSampleSize = resolvePreviewRowCountForRehydrate(body);
  const previewRows = previewSampleSize > 0 ? replayedRows.slice(0, previewSampleSize) : [];
  const previewHash = previewRows.length ? hashJson(previewRows) : null;
  const expectedPreviewHash = body?.saveMeta?.previewHash || null;

  const limit = Math.max(0, Math.floor(Number(requestedLimit) || 0));
  const savedFull = Math.max(
    0,
    Math.floor(Number(body?.fullRowCount) || 0),
    Math.floor(Number(body?.saveMeta?.fullRowCount) || 0),
    Math.floor(Number(body?.intentFullRowCount) || 0),
  );
  let warning =
    expectedPreviewHash && previewHash !== expectedPreviewHash
      ? "Source data or query behavior changed since this project was saved."
      : null;
  if (savedFull > 0 && replayedRows.length < savedFull) {
    const tierCapped = limit > 0 && limit < savedFull && replayedRows.length >= limit;
    const partial = tierCapped
      ? `Reloaded ${replayedRows.length.toLocaleString()} of ${savedFull.toLocaleString()} rows — your plan caps Athena pulls at ${limit.toLocaleString()} rows per query.`
      : `Reloaded ${replayedRows.length.toLocaleString()} of ${savedFull.toLocaleString()} saved rows (query limit ${limit.toLocaleString()}).`;
    warning = warning ? `${warning} ${partial}` : partial;
  }

  return {
    sheetId: body?.sheetId || null,
    columns: replayedColumns,
    rows: replayedRows,
    rowCount: replayedRows.length,
    requestedLimit: limit,
    queryExecutionId: athenaResult?.queryExecutionId || null,
    dataScannedBytes: athenaResult?.dataScannedBytes ?? null,
    previewHash,
    previewMatches: expectedPreviewHash ? previewHash === expectedPreviewHash : null,
    warning,
  };
}
