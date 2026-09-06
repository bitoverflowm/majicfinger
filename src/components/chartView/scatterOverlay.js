/** Shared Y field so multiple Scatter series can share one Recharts YAxis. */
export const SCATTER_OVERLAY_Y_KEY = "__scatter_y";

export function scatterYIsValid(value, scaleY) {
  if (value == null || value === "") return false;
  if (scaleY === "categorical") return true;
  const yn = Number(value);
  if (!Number.isFinite(yn)) return false;
  if (scaleY === "log" && yn <= 0) return false;
  return true;
}

/** Deterministic 0..1 noise from integer seeds (stable across renders). */
export function unitNoise2d(i, channel) {
  const x = Math.sin((Number(i) + 1) * 12.9898 + (Number(channel) + 1) * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Map 0–100 jitter intensity to a fraction of axis span (max 12% at 100). */
export function scatterJitterFraction(intensity) {
  const t = Math.max(0, Math.min(100, Number(intensity) || 0)) / 100;
  return t * 0.12;
}

export function filterScatterOverlayRows(rows, { xKey, yKeys, xIsNumber, scaleY }) {
  const keys = Array.isArray(yKeys) ? yKeys.filter(Boolean) : [];
  if (!Array.isArray(rows) || !xKey || !keys.length) return [];
  return rows.filter((row) => {
    const x = row?.[xKey];
    if (x == null || x === "") return false;
    if (xIsNumber && !Number.isFinite(Number(x))) return false;
    return keys.some((k) => scatterYIsValid(row?.[k], scaleY));
  });
}

export function jitterScatterOverlayRows(rows, { xKey, yKeys, xIsNumber, scaleY, jitterXAmt, jitterYAmt }) {
  const keys = Array.isArray(yKeys) ? yKeys.filter(Boolean) : [];
  if (!Array.isArray(rows) || !rows.length) return rows;
  const xAmt = Number(jitterXAmt) > 0 ? Number(jitterXAmt) : 0;
  const yAmt = Number(jitterYAmt) > 0 ? Number(jitterYAmt) : 0;
  if (xAmt <= 0 && yAmt <= 0) return rows;

  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;
  const numericY = scaleY !== "categorical";
  for (const row of rows) {
    if (xIsNumber) {
      const x = Number(row?.[xKey]);
      if (Number.isFinite(x)) {
        if (x < xMin) xMin = x;
        if (x > xMax) xMax = x;
      }
    }
    if (numericY) {
      for (const key of keys) {
        const y = Number(row?.[key]);
        if (Number.isFinite(y)) {
          if (y < yMin) yMin = y;
          if (y > yMax) yMax = y;
        }
      }
    }
  }
  const xSpan = xIsNumber && Number.isFinite(xMin) && Number.isFinite(xMax) ? Math.max(xMax - xMin, Number.EPSILON) : 0;
  const ySpan = numericY && Number.isFinite(yMin) && Number.isFinite(yMax) ? Math.max(yMax - yMin, Number.EPSILON) : 0;

  return rows.map((row, i) => {
    const next = { ...row };
    if (xIsNumber && xSpan > 0 && xAmt > 0) {
      const n = Number(row[xKey]);
      if (Number.isFinite(n)) {
        next[xKey] = n + (unitNoise2d(i, 1) - 0.5) * 2 * xAmt * xSpan;
      }
    }
    if (numericY && ySpan > 0 && yAmt > 0) {
      keys.forEach((key, k) => {
        const n = Number(row[key]);
        if (!Number.isFinite(n)) return;
        let jy = n + (unitNoise2d(i, 2 + k) - 0.5) * 2 * yAmt * ySpan;
        if (scaleY === "log" && jy <= 0) jy = n;
        next[key] = jy;
      });
    }
    return next;
  });
}

export function splitScatterOverlaySeries(rows, ySeries, scaleY) {
  if (!Array.isArray(rows) || !Array.isArray(ySeries)) return [];
  return ySeries
    .map((series, idx) => {
      const key = series?.renderKey;
      const data = [];
      if (key) {
        for (const row of rows) {
          const y = row?.[key];
          if (!scatterYIsValid(y, scaleY)) continue;
          data.push({
            ...row,
            [SCATTER_OVERLAY_Y_KEY]: scaleY === "categorical" ? y : Number(y),
          });
        }
      }
      return { series, idx, data };
    })
    .filter((entry) => entry.data.length > 0);
}
