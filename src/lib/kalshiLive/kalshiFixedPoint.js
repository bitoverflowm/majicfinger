/**
 * Parse Kalshi fixed-point contract count strings (e.g. "10.00", "32980.77") to numbers for sheets/charts.
 *
 * @param {unknown} value
 * @returns {number | null}
 */
export function parseKalshiFixedPointCount(value) {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const n = parseFloat(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
}

/** @param {string} key */
export function isKalshiFixedPointCountKey(key) {
  return typeof key === "string" && key.endsWith("_fp");
}
