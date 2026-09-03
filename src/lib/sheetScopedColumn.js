/**
 * Cross-sheet column keys use `sheetId::column` (same convention as chart axes).
 */

export const SHEET_SCOPED_COLUMN_SEP = "::";

/**
 * @param {unknown} key
 * @returns {string}
 */
export function stripSheetScopedColumnKey(key) {
  const s = String(key ?? "").trim();
  if (!s) return s;
  const i = s.indexOf(SHEET_SCOPED_COLUMN_SEP);
  if (i <= 0 || i >= s.length - SHEET_SCOPED_COLUMN_SEP.length) return s;
  const tail = s.slice(i + SHEET_SCOPED_COLUMN_SEP.length).trim();
  return tail || s;
}

/**
 * @param {unknown} key
 * @param {string | null | undefined} [defaultSheetId]
 * @returns {{ sheetId: string | null; column: string; value: string }}
 */
export function parseSheetScopedColumnKey(key, defaultSheetId = null) {
  const value = String(key ?? "").trim();
  if (!value) {
    return { sheetId: defaultSheetId ?? null, column: "", value };
  }
  const i = value.indexOf(SHEET_SCOPED_COLUMN_SEP);
  if (i > 0 && i < value.length - SHEET_SCOPED_COLUMN_SEP.length) {
    const sheetId = value.slice(0, i).trim();
    const column = value.slice(i + SHEET_SCOPED_COLUMN_SEP.length).trim();
    if (sheetId && column) return { sheetId, column, value };
  }
  return { sheetId: defaultSheetId ?? null, column: value, value };
}

/**
 * @param {string | null | undefined} sheetId
 * @param {string | null | undefined} column
 * @returns {string}
 */
export function toSheetScopedColumnKey(sheetId, column) {
  const col = String(column || "").trim();
  const sid = String(sheetId || "").trim();
  if (!col) return "";
  if (!sid) return col;
  return `${sid}${SHEET_SCOPED_COLUMN_SEP}${col}`;
}

/** e.g. sheet-2 + "Markets" → "Sheet 2: Markets" */
export function sheetGroupHeading(sheetId, sheetName, index = 0) {
  const digits = String(sheetId || "").match(/(\d+)/);
  const num = digits ? Number(digits[1]) : index + 1;
  const name = sheetName || sheetId || `Sheet ${num}`;
  return `Sheet ${num}: ${name}`;
}

/**
 * @param {Record<string, object> | null | undefined} dataSheets
 * @param {string | null | undefined} [activeSheetId]
 * @returns {Array<{ sheetId: string; sheetName: string; heading: string; options: Array<{ value: string; column: string; sheetId: string; sheetName: string }> }>}
 */
export function buildWorkspaceSheetColumnGroups(dataSheets, activeSheetId = null) {
  const groups = [];
  const sheets = dataSheets && typeof dataSheets === "object" ? dataSheets : {};
  let entries = Object.entries(sheets);
  if (activeSheetId) {
    entries = [...entries].sort(([a], [b]) => {
      if (a === activeSheetId) return -1;
      if (b === activeSheetId) return 1;
      return 0;
    });
  }
  entries.forEach(([sheetId, sheet], index) => {
    const rows = Array.isArray(sheet?.data) ? sheet.data : [];
    const first = rows[0] || {};
    let cols = rows.length && first && typeof first === "object" ? Object.keys(first) : [];
    if (!cols.length && Array.isArray(sheet?.columns)) {
      cols = sheet.columns
        .map((c) => (typeof c === "string" ? c : c?.field || c?.name || ""))
        .filter(Boolean);
    }
    cols = cols.filter((c) => c !== "_origIndex").sort();
    if (!cols.length) return;
    const sheetName = String(sheet?.name || sheetId);
    groups.push({
      sheetId,
      sheetName,
      heading: sheetGroupHeading(sheetId, sheetName, index),
      options: cols.map((column) => ({
        value: toSheetScopedColumnKey(sheetId, column),
        column,
        sheetId,
        sheetName,
      })),
    });
  });
  return groups;
}

/**
 * @param {Record<string, object> | null | undefined} dataSheets
 * @param {string | null | undefined} activeSheetId
 * @returns {string[]}
 */
export function workspaceSheetColumnOperandValues(dataSheets, activeSheetId = null) {
  return buildWorkspaceSheetColumnGroups(dataSheets, activeSheetId).flatMap((g) =>
    g.options.map((o) => o.value),
  );
}

/**
 * @param {unknown} value
 * @returns {number | null}
 */
export function finiteNumberFromCell(value) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value == null || value === "") return null;
  const n = typeof value === "string" ? Number(String(value).trim()) : Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {{
 *   dataSheets?: Record<string, object> | null;
 *   activeSheetId?: string | null;
 *   rowIndex?: number;
 *   row?: object | null;
 *   key?: string | null;
 * }} params
 * @returns {number | null}
 */
export function resolveScopedFiniteNumber({ dataSheets, activeSheetId, rowIndex = -1, row, key }) {
  const k = String(key || "").trim();
  if (!k) return null;
  const { sheetId, column } = parseSheetScopedColumnKey(k, activeSheetId);
  const useSheetId = sheetId || activeSheetId;
  let targetRow = row;
  if (
    useSheetId &&
    activeSheetId &&
    useSheetId !== activeSheetId &&
    dataSheets &&
    typeof dataSheets === "object"
  ) {
    const sheetRows = Array.isArray(dataSheets[useSheetId]?.data) ? dataSheets[useSheetId].data : [];
    const idx = Number.isFinite(rowIndex) && rowIndex >= 0 ? rowIndex : -1;
    targetRow = idx >= 0 && idx < sheetRows.length ? sheetRows[idx] : null;
  }
  if (!targetRow || typeof targetRow !== "object" || !column) return null;
  return finiteNumberFromCell(targetRow[column]);
}

/**
 * Prev/next row offsets for Functions "relative row/reference val".
 * @param {unknown} key
 * @returns {boolean}
 */
export function isRelativeRowOffsetRef(key) {
  const k = String(key || "").trim();
  return k === "prev_row" || k === "next_row" || k === "previous" || k === "next";
}

/**
 * Resolve a single fixed reference number from a column/summary (first finite value).
 * Used when Functions "reference val" is on — same constant applied to every row.
 *
 * @param {{
 *   dataSheets?: Record<string, object> | null;
 *   activeSheetId?: string | null;
 *   key?: string | null;
 *   summaryNamedValues?: Record<string, number> | null;
 * }} params
 * @returns {number | null}
 */
export function resolveFixedReferenceFiniteNumber({
  dataSheets,
  activeSheetId,
  key,
  summaryNamedValues = null,
}) {
  const k = String(key || "").trim();
  if (!k || isRelativeRowOffsetRef(k)) return null;
  if (k.startsWith("summary::")) {
    const v = summaryNamedValues?.[k];
    return Number.isFinite(v) ? v : null;
  }
  const { sheetId, column } = parseSheetScopedColumnKey(k, activeSheetId);
  const useSheetId = sheetId || activeSheetId;
  if (!useSheetId || !column || !dataSheets || typeof dataSheets !== "object") return null;
  const sheetRows = Array.isArray(dataSheets[useSheetId]?.data) ? dataSheets[useSheetId].data : [];
  for (const row of sheetRows) {
    if (!row || typeof row !== "object") continue;
    const n = finiteNumberFromCell(row[column]);
    if (n != null) return n;
  }
  return null;
}

/**
 * @param {string | null | undefined} key
 * @param {{ dataSheets?: Record<string, object> | null; activeSheetId?: string | null; summaryRefDisplayLabel?: (k: string) => string }} [opts]
 * @returns {string}
 */
export function mathOperandDisplayLabel(key, opts = {}) {
  const k = String(key || "").trim();
  if (!k) return "";
  if (typeof opts.summaryRefDisplayLabel === "function" && k.startsWith("summary::")) {
    return `Σ ${opts.summaryRefDisplayLabel(k)}`;
  }
  const { sheetId, column } = parseSheetScopedColumnKey(k, opts.activeSheetId);
  if (sheetId && column && opts.dataSheets?.[sheetId]) {
    const sheetName = String(opts.dataSheets[sheetId]?.name || sheetId);
    return `${sheetGroupHeading(sheetId, sheetName)} · ${column}`;
  }
  return stripSheetScopedColumnKey(k);
}
