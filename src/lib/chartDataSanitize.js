/**
 * Recharts: `null` / junk numerics are normalized to `null` on plot axes so they are ignored.
 * With `connectNulls` on Line/Area, the stroke bridges across those points (continuous lines).
 */

import { temporalToMs } from "@/lib/temporalParse";

/** Coerce sheet / API string numerics for Recharts bar/line heights. */
export function coerceChartPlotNumber(value) {
  return sanitizePlotNumericOrDate(value, false);
}

function sanitizePlotNumericOrDate(value, treatAsDate) {
  if (value === undefined) return null;
  if (value === null || value === "") return null;
  if (treatAsDate) {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
    // Pivot step converts buckets to epoch ms (numbers). Date.parse(String(ms)) is NaN — keep numbers.
    if (typeof value === "number" && Number.isFinite(value)) return value;
    const ms = temporalToMs(value);
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
/**
 * Scale each Y series to a baseline of 100 using its first finite value: (valₙ / val₀) × 100.
 * @param {Array<Record<string, unknown>>|undefined} rows
 * @param {string[]} yKeys
 * @returns {Array<Record<string, unknown>>|undefined}
 */
export function normalizeCartesianSeriesToBaseline(rows, yKeys) {
  if (!Array.isArray(rows) || rows.length === 0) return rows;
  const keys = Array.isArray(yKeys) ? yKeys.filter(Boolean) : [];
  if (!keys.length) return rows;

  const baselines = {};
  for (const yKey of keys) {
    for (const row of rows) {
      const v = coerceChartPlotNumber(row?.[yKey]);
      if (v != null && Number.isFinite(v) && v !== 0) {
        baselines[yKey] = v;
        break;
      }
    }
  }

  return rows.map((row) => {
    if (!row || typeof row !== "object") return row;
    const out = { ...row };
    for (const yKey of keys) {
      const base = baselines[yKey];
      if (base == null || base === 0) continue;
      const v = coerceChartPlotNumber(row?.[yKey]);
      if (v == null || !Number.isFinite(v)) continue;
      out[yKey] = (v / base) * 100;
    }
    return out;
  });
}

export function sanitizeCartesianRowsForPlotting(rows, { xKey, yKeys, xAxisType, dataTypes, getAxisType }) {
  if (!Array.isArray(rows) || !rows.length) return rows;
  const yList = Array.isArray(yKeys) ? yKeys.filter(Boolean) : [];
  return rows.map((row) => {
    if (!row || typeof row !== "object") return row;
    const out = { ...row };
    for (const yk of yList) {
      const yt = typeof getAxisType === "function" ? getAxisType(yk, dataTypes, rows) : "string";
      out[yk] = sanitizePlotNumericOrDate(out[yk], yt === "date");
    }
    if (xKey && (xAxisType === "number" || xAxisType === "date")) {
      out[xKey] = sanitizePlotNumericOrDate(out[xKey], xAxisType === "date");
    }
    return out;
  });
}
