/**
 * Detect null / NaN-like values in sheet rows (post-Athena / DuckDB objects).
 * @param {Record<string, unknown>[] | null | undefined} rows
 * @returns {{ columns: string[] }}
 */
export function scanNullishColumnsInSheetRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return { columns: [] };
  const first = rows[0];
  if (!first || typeof first !== "object") return { columns: [] };
  const keys = Object.keys(first);
  const bad = new Set();
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    for (const k of keys) {
      const v = row[k];
      if (v == null) {
        bad.add(k);
        continue;
      }
      if (typeof v === "number" && Number.isNaN(v)) {
        bad.add(k);
        continue;
      }
      if (typeof v === "string" && (v === "NaN" || v.toLowerCase() === "null")) {
        bad.add(k);
      }
    }
  }
  return { columns: [...bad].sort() };
}

/**
 * Drop rows that have a nullish value in any of the given columns.
 * @param {Record<string, unknown>[]} rows
 * @param {string[]} columns
 */
export function filterRowsWithoutNullishInColumns(rows, columns) {
  if (!Array.isArray(rows) || !columns.length) return rows;
  const set = new Set(columns);
  return rows.filter((row) => {
    if (!row || typeof row !== "object") return false;
    for (const c of set) {
      const v = row[c];
      if (v == null) return false;
      if (typeof v === "number" && Number.isNaN(v)) return false;
      if (typeof v === "string" && (v === "NaN" || v.toLowerCase() === "null")) return false;
    }
    return true;
  });
}
