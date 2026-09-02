import { parseNumberTypedCell } from "./coerceNumberTypedCells.js";

/** Sheet property type: numeric row id used to keep display / pull order stable. */
export const SHEET_ID_DATA_TYPE = "id";

/**
 * @param {unknown} t
 * @returns {boolean}
 */
export function isSheetIdDataType(t) {
  return t === "id" || t === "_id";
}

/**
 * Number-like for coercion / charts / refine (includes order `id` type).
 * @param {unknown} t
 * @returns {boolean}
 */
export function isNumberLikeSheetDataType(t) {
  return t === "number" || isSheetIdDataType(t);
}

/**
 * @param {unknown} name
 * @returns {boolean}
 */
export function isSheetIdColumnName(name) {
  const n = String(name || "").trim().toLowerCase();
  return n === "id" || n === "_id";
}

/**
 * AG Grid only understands its built-in cell data types.
 * @param {unknown} t
 * @returns {string}
 */
export function toAgGridCellDataType(t) {
  if (isSheetIdDataType(t)) return "number";
  if (typeof t === "string" && t) return t;
  return "text";
}

/**
 * First column marked as order `id` in dataTypes (or matching id/_id name with that type).
 * @param {Record<string, string> | null | undefined} dataTypes
 * @returns {string | null}
 */
export function findSheetIdOrderColumn(dataTypes) {
  const entries = Object.entries(dataTypes || {});
  for (const [field, t] of entries) {
    if (field && isSheetIdDataType(t)) return field;
  }
  return null;
}

/**
 * Stable ascending sort by an id order column (numeric). Non-numeric ids sort last.
 * @param {Array<Record<string, unknown>>} rows
 * @param {string | null | undefined} idColumn
 * @returns {Array<Record<string, unknown>>}
 */
export function sortRowsByIdColumn(rows, idColumn) {
  const col = String(idColumn || "").trim();
  if (!col || !Array.isArray(rows) || rows.length < 2) return rows;

  let already = true;
  for (let i = 1; i < rows.length; i += 1) {
    const prev = parseNumberTypedCell(rows[i - 1]?.[col]);
    const cur = parseNumberTypedCell(rows[i]?.[col]);
    if (prev == null && cur == null) continue;
    if (prev == null || cur == null || prev > cur) {
      already = false;
      break;
    }
  }
  if (already) return rows;

  return [...rows].sort((a, b) => {
    const na = parseNumberTypedCell(a?.[col]);
    const nb = parseNumberTypedCell(b?.[col]);
    if (na == null && nb == null) return 0;
    if (na == null) return 1;
    if (nb == null) return -1;
    return na - nb;
  });
}

/**
 * Prefer `id` for columns named id/_id when values look numeric; never overwrite an
 * explicit user `id` type with plain `number`.
 * @param {Record<string, string>} detected
 * @param {Record<string, string> | null | undefined} prev
 * @returns {Record<string, string>}
 */
export function mergeDetectedDataTypesPreservingId(detected, prev) {
  const merged = { ...(prev || {}) };
  let changed = false;
  for (const [k, v] of Object.entries(detected || {})) {
    if (isSheetIdDataType(merged[k])) continue;
    let next = v;
    if (isSheetIdColumnName(k) && (v === "number" || isSheetIdDataType(v))) {
      next = SHEET_ID_DATA_TYPE;
    }
    if (merged[k] !== next) {
      merged[k] = next;
      changed = true;
    }
  }
  return changed ? merged : prev && typeof prev === "object" ? prev : merged;
}
