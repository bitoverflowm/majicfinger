/**
 * Recharts: `null` / junk numerics are normalized to `null` on plot axes so they are ignored.
 * With `connectNulls` on Line/Area, the stroke bridges across those points (continuous lines).
 */

function sanitizePlotNumericOrDate(value, treatAsDate) {
  if (value === undefined) return null;
  if (value === null || value === "") return null;
  if (treatAsDate) {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    const ms = Date.parse(String(value));
    return Number.isFinite(ms) ? value : null;
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const t = value.trim().toLowerCase();
    if (
      t === "nan" ||
      t === "null" ||
      t === "undefined" ||
      t === "infinity" ||
      t === "-infinity" ||
      t === "inf" ||
      t === "-inf"
    ) {
      return null;
    }
    const n = Number(value);
    if (!Number.isNaN(n) && Number.isFinite(n)) return n;
  }
  return value;
}

/**
 * @param {Array<Record<string, unknown>>|undefined} rows
 * @param {{
 *   xKey: string,
 *   yKeys: string[],
 *   xAxisType: string,
 *   dataTypes?: Record<string, string>,
 *   getAxisType: (key: string, dataTypes: unknown, data: unknown) => string,
 * }} opts
 */
export function sanitizeCartesianRowsForPlotting(rows, { xKey, yKeys, xAxisType, dataTypes, getAxisType }) {
  if (!Array.isArray(rows) || !rows.length) return rows;
  const yList = Array.isArray(yKeys) ? yKeys.filter(Boolean) : [];
  return rows.map((row) => {
    if (!row || typeof row !== "object") return row;
    const out = { ...row };
    for (const yk of yList) {
      const yt = typeof getAxisType === "function" ? getAxisType(yk, dataTypes, rows) : "string";
      if (yt === "number" || yt === "date") {
        out[yk] = sanitizePlotNumericOrDate(out[yk], yt === "date");
      }
    }
    if (xKey && (xAxisType === "number" || xAxisType === "date")) {
      out[xKey] = sanitizePlotNumericOrDate(out[xKey], xAxisType === "date");
    }
    return out;
  });
}
