function escapeCsvCell(value) {
  if (value === null || value === undefined) return "";
  const s = typeof value === "string" ? value : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * Build UTF-8 CSV bytes for DuckDB read_csv_auto (faster than JSON.stringify for large pulls).
 * @param {string[]} columns
 * @param {Record<string, unknown>[]} objects
 */
export function athenaObjectsToCsvBytes(columns, objects) {
  const header = columns.map((c) => escapeCsvCell(c)).join(",");
  const lines = [header];
  for (const row of objects) {
    lines.push(columns.map((col) => escapeCsvCell(row[col])).join(","));
  }
  return new TextEncoder().encode(lines.join("\n"));
}
