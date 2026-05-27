import { coerceDataTypes } from "@/lib/coerceDataTypes";
import { athenaRowsToObjects } from "@/lib/duckdb/athenaRowsToObjects";

/** Above this row count, skip synchronous coerce (Mongo loads don't coerce either). */
const COERCE_ROW_CAP = 50_000;

/**
 * Athena poll → plain row objects for the sheet (no DuckDB round-trip).
 * @param {string[]} columns
 * @param {unknown[]} rows
 * @param {{ rowLimit?: number | null }} [opts]
 */
export function athenaPollToSheetRows(columns, rows, opts = {}) {
  if (!Array.isArray(columns) || !Array.isArray(rows)) {
    throw new Error("Athena pull expected columns and rows arrays.");
  }
  if (rows.length === 0 && columns.length === 0) {
    throw new Error("Athena returned no columns.");
  }
  const objects = athenaRowsToObjects(columns, rows);
  if (rows.length > 0 && objects.length === 0) {
    throw new Error("Could not convert Athena rows for the sheet (column mismatch).");
  }
  const lim = opts.rowLimit;
  if (lim == null || !Number.isFinite(lim) || lim <= 0) return objects;
  return objects.slice(0, Math.floor(lim));
}

/**
 * One atomic sheet patch: stash snapshot + inline data (same pattern as Mongo project load).
 * @param {Record<string, object> | null | undefined} prev
 * @param {string} sheetId
 * @param {Record<string, unknown>[]} rows
 * @param {{
 *   provenance?: object | null;
 *   name?: string;
 *   requestCards?: object[];
 * }} [extras]
 */
export function applyAthenaPullToSheetPatch(prev, sheetId, rows, extras = {}) {
  const raw = Array.isArray(rows) ? rows : [];
  const rowData =
    raw.length > COERCE_ROW_CAP ? raw : coerceDataTypes(raw);
  const cur = prev?.[sheetId] || { name: "Sheet 1", data: [] };
  const pulledAt = Date.now();

  return {
    ...(prev || {}),
    [sheetId]: {
      ...cur,
      ...(extras.name ? { name: extras.name } : {}),
      data: rowData,
      storageMode: "inline",
      rehydrationStatus: "complete",
      athenaPullSnapshot: {
        rowCount: rowData.length,
        pulledAt,
      },
      ...(extras.provenance ? { provenance: extras.provenance } : {}),
      ...(extras.requestCards ? { requestCards: extras.requestCards } : {}),
    },
  };
}
