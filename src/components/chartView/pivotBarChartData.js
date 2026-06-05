function coerceBarValue(raw) {
  if (raw == null || raw === "") return 0;
  const n = typeof raw === "number" ? raw : Number(String(raw).trim());
  return Number.isFinite(n) ? n : 0;
}

function seriesLabel(raw) {
  if (raw == null || raw === "") return "(empty)";
  return String(raw);
}

/**
 * Pivot long-format rows into wide bar-chart rows grouped by X, with one column per series value.
 * @param {object[]} rows
 * @param {string} xKey
 * @param {string} yKey
 * @param {string} seriesKey
 * @returns {{ rows: object[]; seriesKeys: string[] } | null}
 */
export function pivotBarChartBySeries(rows, xKey, yKey, seriesKey) {
  const xCol = String(xKey || "").trim();
  const yCol = String(yKey || "").trim();
  const sCol = String(seriesKey || "").trim();
  if (!xCol || !yCol || !sCol || !Array.isArray(rows) || !rows.length) return null;

  const byX = new Map();
  const seriesSet = new Set();

  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const xVal = row[xCol];
    if (xVal == null || xVal === "") continue;
    const xBucket = typeof xVal === "object" ? JSON.stringify(xVal) : xVal;
    const series = seriesLabel(row[sCol]);
    seriesSet.add(series);
    if (!byX.has(xBucket)) {
      byX.set(xBucket, { [xCol]: xVal });
    }
    const bucket = byX.get(xBucket);
    bucket[series] = (bucket[series] || 0) + coerceBarValue(row[yCol]);
  }

  if (!seriesSet.size || !byX.size) return null;

  const seriesKeys = Array.from(seriesSet).sort((a, b) => a.localeCompare(b));
  const wideRows = Array.from(byX.values()).map((bucket) => {
    const out = { [xCol]: bucket[xCol] };
    for (const sk of seriesKeys) {
      out[sk] = bucket[sk] ?? 0;
    }
    return out;
  });

  return { rows: wideRows, seriesKeys };
}
