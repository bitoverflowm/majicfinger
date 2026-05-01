import { inferDefaultBuilderSnapshot } from "@/lib/inferDefaultBuilderSnapshot";

function stripInternalFromRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    if (!row || typeof row !== "object") return row;
    return { ...row };
  });
}

function collectAllColumnKeys(rows, dataSheets) {
  const keys = new Set();
  const addRows = (arr) => {
    if (!Array.isArray(arr)) return;
    arr.forEach((row) => {
      if (row && typeof row === "object") Object.keys(row).forEach((k) => keys.add(k));
    });
  };
  addRows(rows);
  Object.values(dataSheets || {}).forEach((sheet) => addRows(sheet?.data));
  return Array.from(keys);
}

export function normalizeBuilderSnapshot(snapshot, rows, dataSheets = {}) {
  const fallback = inferDefaultBuilderSnapshot(rows);
  const s = snapshot && typeof snapshot === "object" ? { ...snapshot } : { ...fallback };
  const keys = collectAllColumnKeys(rows, dataSheets);
  if (!keys.length) return fallback;

  const allowedTypes = new Set(["area", "bar", "line", "pie", "treemap", "liveline"]);
  const type = String(s.selChartType || "").trim();
  s.selChartType = allowedTypes.has(type) ? type : fallback.selChartType;

  const deScope = (k) => {
    const raw = String(k || "");
    const idx = raw.indexOf("::");
    return idx > -1 ? raw.slice(idx + 2) : raw;
  };

  const normalizedX = deScope(s.selX);
  if (String(s.selX || "").includes("::")) {
    s.selX = String(s.selX);
  } else {
    s.selX = keys.includes(normalizedX) ? normalizedX : fallback.selX;
  }

  const rawY = Array.isArray(s.selY) ? s.selY : [];
  const cleanY = rawY.filter((k) => {
    const raw = String(k || "");
    if (raw.includes("::")) return true;
    return keys.includes(deScope(raw));
  });
  s.selY = cleanY.length ? [...new Set(cleanY)] : fallback.selY;

  if (s.lineColorOverrides && typeof s.lineColorOverrides === "object") {
    const nextOverrides = {};
    for (const [rawKey, color] of Object.entries(s.lineColorOverrides)) {
      const raw = String(rawKey || "");
      const key = raw.includes("::") ? raw : deScope(raw);
      if ((raw.includes("::") || keys.includes(key)) && typeof color === "string" && color.trim()) {
        nextOverrides[key] = color;
      }
    }
    s.lineColorOverrides = nextOverrides;
  }

  if (s.chartConfig && typeof s.chartConfig === "object") {
    const nextCfg = {};
    for (const [rawKey, cfg] of Object.entries(s.chartConfig)) {
      const raw = String(rawKey || "");
      const key = raw.includes("::") ? raw : deScope(raw);
      if ((raw.includes("::") || keys.includes(key)) && cfg && typeof cfg === "object") {
        nextCfg[key] = cfg;
      }
    }
    s.chartConfig = nextCfg;
  }

  if (!s.selX || !Array.isArray(s.selY) || s.selY.length === 0) {
    s.selX = fallback.selX;
    s.selY = fallback.selY;
    s.selChartType = fallback.selChartType;
  }

  return s;
}

/**
 * @param {object} chartLean - Chart document (.lean())
 * @param {object} dataSetLean - DataSet document (.lean())
 * @returns {{ chart: object, rows: any[], dataSheets: object, rechartsBuilder: object }}
 */
export function buildPublicChartBundle(chartLean, dataSetLean) {
  const cp = Array.isArray(chartLean.chart_properties)
    ? chartLean.chart_properties[0]
    : chartLean.chart_properties;
  const dataSheets =
    dataSetLean?.data_sheets && typeof dataSetLean.data_sheets === "object"
      ? dataSetLean.data_sheets
      : {};
  const fallbackRowsFromSheets =
    Object.values(dataSheets || {}).find((s) => Array.isArray(s?.data) && s.data.length)?.data || [];
  const baseRows = Array.isArray(dataSetLean.data) ? dataSetLean.data : [];
  const rowsForFallback = baseRows.length ? baseRows : fallbackRowsFromSheets;
  const rechartsBuilderRaw =
    cp && typeof cp === "object" && cp.rechartsBuilder && cp.rechartsBuilder.v === 1
      ? cp.rechartsBuilder
      : inferDefaultBuilderSnapshot(rowsForFallback);
  const rechartsBuilder = normalizeBuilderSnapshot(rechartsBuilderRaw, rowsForFallback, dataSheets);

  const publicChart = {
    chart_name: chartLean.chart_name,
    chart_properties: cp && typeof cp === "object" ? [cp] : [],
    rechartsBuilder,
  };

  const rows = rowsForFallback;

  return {
    chart: publicChart,
    rows: stripInternalFromRows(rows),
    dataSheets,
    rechartsBuilder,
  };
}
