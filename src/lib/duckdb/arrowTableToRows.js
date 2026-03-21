/**
 * Convert an Apache Arrow Table (DuckDB-WASM query result) into plain row objects
 * for the grid / coerceDataTypes pipeline.
 */
function normalizeCell(v) {
  if (typeof v === "bigint") return v.toString();
  if (v instanceof Uint8Array) return `[binary ${v.length} bytes]`;
  return v;
}

export function arrowTableToRows(table) {
  if (!table) return [];
  if (typeof table.toArray === "function") {
    return table.toArray().map((row) => {
      if (row == null || typeof row !== "object") return {};
      const out = {};
      for (const key of Object.keys(row)) {
        out[key] = normalizeCell(row[key]);
      }
      return out;
    });
  }
  if (typeof table.numRows !== "number" || !table.schema?.fields) return [];
  const n = table.numRows;
  const fields = table.schema.fields;
  const rows = [];
  for (let i = 0; i < n; i++) {
    const row = {};
    for (const f of fields) {
      const col = table.getChild?.(f.name);
      let v = col?.get?.(i);
      row[f.name] = normalizeCell(v);
    }
    rows.push(row);
  }
  return rows;
}
