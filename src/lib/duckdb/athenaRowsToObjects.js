/**
 * Turn Athena poll rows into plain objects for JSON → DuckDB.
 * Poll API returns `string[][]`; Kalshi taxonomy roll-up (and similar) may pass row objects keyed by alias.
 * @param {string[]} columns
 * @param {unknown[]} rows
 * @returns {Record<string, unknown>[]}
 */
export function athenaRowsToObjects(columns, rows) {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  const first = rows[0];
  const isObjectRow =
    first != null &&
    typeof first === "object" &&
    !Array.isArray(first) &&
    !(first instanceof Uint8Array);
  if (isObjectRow) {
    return rows.map((row) => {
      const o = {};
      const r = row && typeof row === "object" ? row : {};
      for (const col of columns) {
        const v = r[col];
        o[col] = v === "" || v == null ? null : v;
      }
      return o;
    });
  }
  return rows.map((row) => {
    const o = {};
    const arr = Array.isArray(row) ? row : [];
    columns.forEach((col, i) => {
      const v = arr[i];
      o[col] = v === "" || v == null ? null : v;
    });
    return o;
  });
}
