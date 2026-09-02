/**
 * Helpers for sheet columns typed as `number` when JSON/Athena left values as strings.
 * Kept free of path aliases so unit tests can import this file directly.
 */

/**
 * Parse a value as a finite number when a column is typed `number` but JSON/Athena
 * left the cell as a string (e.g. `"1234"`). Returns `null` when not numeric.
 * Skips long digit-only strings (≥16 digits) to avoid precision loss.
 * @param {unknown} value
 * @returns {number | null}
 */
export function parseNumberTypedCell(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "bigint") {
    try {
      if (value <= BigInt(Number.MAX_SAFE_INTEGER) && value >= BigInt(Number.MIN_SAFE_INTEGER)) {
        return Number(value);
      }
    } catch {
      /* ignore */
    }
    return null;
  }
  if (typeof value === "boolean") return value ? 1 : 0;

  const s = String(value).trim().replace(/,/g, "");
  if (!s) return null;
  if (/^-?\d{16,}$/.test(s)) return null;
  if (/^-?\d*\.?\d+[eE][+-]?\d+$/.test(s)) {
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  }
  const n = Number(s);
  return s !== "" && Number.isFinite(n) ? n : null;
}

/**
 * For columns declared as number (sheet dataTypes / AG Grid cellDataType), coerce
 * numeric strings to JS numbers so the grid does not show "Invalid Number".
 * @param {Array<Record<string, unknown>>} rows
 * @param {Iterable<string> | Set<string> | string[]} numberFields
 * @returns {Array<Record<string, unknown>>}
 */
export function coerceNumberColumnsInRows(rows, numberFields) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  const fields = numberFields instanceof Set ? numberFields : new Set(numberFields || []);
  if (fields.size === 0) return rows;

  return rows.map((row) => {
    if (!row || typeof row !== "object") return row;
    let changed = false;
    const next = { ...row };
    for (const field of fields) {
      const v = next[field];
      if (typeof v === "number" && Number.isFinite(v)) continue;
      if (v == null || v === "") continue;
      const n = parseNumberTypedCell(v);
      if (n != null && n !== v) {
        next[field] = n;
        changed = true;
      }
    }
    return changed ? next : row;
  });
}
