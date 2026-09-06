/**
 * Display-only axis domain from plotted values. Does not filter or mutate rows.
 */

export const AXIS_RANGE_ZERO = "zero";
export const AXIS_RANGE_DATA = "data";

/**
 * @param {unknown} value
 * @returns {"zero" | "data"}
 */
export function normalizeAxisRange(value) {
  return value === AXIS_RANGE_DATA ? AXIS_RANGE_DATA : AXIS_RANGE_ZERO;
}

/**
 * Coerce a cell to a finite number for axis domain math.
 * @param {unknown} raw
 * @param {{ parseDates?: boolean, toDateMs?: (value: unknown) => number }} [opts]
 * @returns {number | null}
 */
export function toAxisNumericValue(raw, { parseDates = false, toDateMs } = {}) {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (raw instanceof Date) {
    const ms = raw.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (parseDates && typeof toDateMs === "function") {
    const ms = toDateMs(raw);
    if (Number.isFinite(ms)) return ms;
  }
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * Read finite numeric values from plotted rows. Never mutates `rows`.
 * @param {unknown[]} rows
 * @param {string[]} keys
 * @param {{ parseDates?: boolean, toDateMs?: (value: unknown) => number }} [opts]
 * @returns {number[]}
 */
export function collectAxisNumericValues(rows, keys, opts = {}) {
  const out = [];
  if (!Array.isArray(rows) || !Array.isArray(keys) || keys.length === 0) return out;
  for (const row of rows) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    for (const key of keys) {
      if (key == null || key === "") continue;
      const n = toAxisNumericValue(row[key], opts);
      if (n != null) out.push(n);
    }
  }
  return out;
}

function padSingleValue(value) {
  const abs = Math.abs(value);
  const pad = abs > 0 ? abs * 0.05 : 1;
  return [value - pad, value + pad];
}

/**
 * Compute a safe [min, max] display domain.
 * @param {"zero" | "data" | string} rangeMode
 * @param {number[]} values
 * @param {{ isLog?: boolean }} [opts]
 * @returns {[number, number] | undefined}
 */
export function axisRangeDomain(rangeMode, values, { isLog = false } = {}) {
  const nums = (Array.isArray(values) ? values : []).filter((v) => Number.isFinite(v));
  if (nums.length === 0) return undefined;

  if (isLog) {
    const pos = nums.filter((v) => v > 0);
    if (pos.length === 0) return undefined;
    const min = Math.min(...pos);
    const max = Math.max(...pos);
    if (min === max) {
      const lo = min >= 1 ? min / 10 : min / 2;
      return [Math.max(lo, Number.MIN_VALUE), min * 10];
    }
    return [min, max];
  }

  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const mode = normalizeAxisRange(rangeMode);

  if (mode === AXIS_RANGE_DATA) {
    if (min === max) return padSingleValue(min);
    return [min, max];
  }

  // Start at Zero: [0, max] when data is non-negative; [min, 0] when all negative;
  // mixed signs already include 0.
  if (max < 0) {
    if (min === max) return [min, 0];
    return [min, 0];
  }
  if (min >= 0) {
    if (max === 0) return [0, 1];
    return [0, max];
  }
  return [min, max];
}
