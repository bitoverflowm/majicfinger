import { parseNumberTypedCell } from "./coerceNumberTypedCells.js";
import { assignVolumeBandPresetOrderIds } from "./sheetOperations/aggregateBandRows.js";
import { createVolumeBandPresets } from "./sheetOperations/bandsConfig.js";

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

/**
 * True when at least one row has a finite numeric value in `col`.
 * @param {Array<Record<string, unknown>>} rows
 * @param {string} col
 */
export function rowHasUsableIdValues(rows, col) {
  const key = String(col || "").trim();
  if (!key || !Array.isArray(rows)) return false;
  for (const row of rows) {
    if (parseNumberTypedCell(row?.[key]) != null) return true;
  }
  return false;
}

/**
 * `id` / `_id` columns present on the sheet that must survive public column projection.
 * Chart category order is stored on these columns (`volume = 0` → 0, …).
 * @param {object | null | undefined} sheet
 * @returns {string[]}
 */
export function collectSheetIdOrderColumnNames(sheet) {
  const names = new Set();
  const types = sheet?.dataTypes && typeof sheet.dataTypes === "object" ? sheet.dataTypes : {};
  for (const [field, t] of Object.entries(types)) {
    if (field && isSheetIdDataType(t)) names.add(field);
  }
  const row = (Array.isArray(sheet?.data) ? sheet.data : []).find((r) => r && typeof r === "object");
  if (row) {
    for (const key of Object.keys(row)) {
      if (isSheetIdColumnName(key)) names.add(key);
    }
  }
  names.add("id");
  names.add("_id");
  return [...names];
}

function volumeBandPresetLabels() {
  const labels = new Set();
  for (const band of createVolumeBandPresets("volume")) {
    const custom = String(band?.label || "").trim();
    if (custom) labels.add(custom);
  }
  return labels;
}

/**
 * Restore volume-band definition order when the `_id` column was stripped from a publish payload.
 * Matches the `band` column against the standard volume-band preset labels.
 *
 * @param {Array<Record<string, unknown>>} rows
 * @param {string} [bandOutputColumn]
 * @returns {Array<Record<string, unknown>>}
 */
export function orderRowsByVolumeBandPresets(rows, bandOutputColumn = "band") {
  const list = Array.isArray(rows) ? rows : [];
  if (list.length < 2) return list;
  const col = String(bandOutputColumn || "band").trim() || "band";
  if (!list.some((row) => row && Object.prototype.hasOwnProperty.call(row, col))) return list;

  const labels = volumeBandPresetLabels();
  let matched = 0;
  for (const row of list) {
    if (labels.has(String(row?.[col] ?? "").trim())) matched += 1;
  }
  if (matched < 2) return list;

  return sortRowsByIdColumn(assignVolumeBandPresetOrderIds(list, col), "id");
}

/**
 * Sort rows using the sheet's `_id` / `id` typed column when present.
 * If the typed id column was dropped (public chart projection), recover volume-band order.
 * @param {Array<Record<string, unknown>>} rows
 * @param {Record<string, string> | null | undefined} dataTypes
 * @returns {Array<Record<string, unknown>>}
 */
export function orderSheetRowsByDataTypes(rows, dataTypes) {
  const idCol = findSheetIdOrderColumn(dataTypes);
  if (idCol && rowHasUsableIdValues(rows, idCol)) {
    return sortRowsByIdColumn(rows, idCol);
  }
  const byBand = orderRowsByVolumeBandPresets(rows);
  if (byBand !== rows) return byBand;
  if (!idCol) return rows;
  return sortRowsByIdColumn(rows, idCol);
}
