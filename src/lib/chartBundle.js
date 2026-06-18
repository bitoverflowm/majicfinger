import { coerceCategoricalBuilderAxes, inferDefaultBuilderSnapshot } from "@/lib/inferDefaultBuilderSnapshot";
import {
  dataSheetsReferencedBySnapshot,
  primarySheetIdForChartSnapshot,
} from "@/lib/chartSnapshotDataDeps";

/** Per-series line colors in the builder UI are keyed as `line:0`, not as sheet columns; keep them when sanitizing snapshots. */
function isLineSeriesInstanceOverrideKey(rawKey) {
  return /^line:\d+$/.test(String(rawKey || "").trim());
}

function stripInternalFromRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    if (!row || typeof row !== "object") return row;
    return { ...row };
  });
}

function sheetColumnNames(sheet) {
  const fromRows = [];
  const rows = Array.isArray(sheet?.data) ? sheet.data : [];
  if (rows.length && rows[0] && typeof rows[0] === "object") {
    fromRows.push(...Object.keys(rows[0]));
  }
  const fromMeta = Array.isArray(sheet?.columns)
    ? sheet.columns.map((c) => (typeof c === "string" ? c : c?.field || c?.name || "")).filter(Boolean)
    : [];
  return [...new Set([...fromRows, ...fromMeta])];
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
  Object.values(dataSheets || {}).forEach((sheet) => {
    addRows(sheet?.data);
    sheetColumnNames(sheet).forEach((k) => keys.add(k));
  });
  return Array.from(keys);
}

export function normalizeBuilderSnapshot(snapshot, rows, dataSheets = {}) {
  const fallback = inferDefaultBuilderSnapshot(rows);
  const s = snapshot && typeof snapshot === "object" ? { ...snapshot } : { ...fallback };
  const keys = collectAllColumnKeys(rows, dataSheets);
  if (!keys.length) {
    const hasSavedAxes = !!(s.selX || (Array.isArray(s.selY) && s.selY.length));
    if (s.v === 1 && hasSavedAxes) return coerceCategoricalBuilderAxes(s, []);
    return fallback;
  }

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

  if (s.barSeriesColumn !== undefined && s.barSeriesColumn !== null) {
    const rawBar = String(s.barSeriesColumn || "");
    if (rawBar.includes("::")) {
      s.barSeriesColumn = rawBar;
    } else {
      const col = deScope(rawBar);
      s.barSeriesColumn = col && keys.includes(col) ? col : null;
    }
  }

  if (s.lineColorOverrides && typeof s.lineColorOverrides === "object") {
    const nextOverrides = {};
    for (const [rawKey, color] of Object.entries(s.lineColorOverrides)) {
      const raw = String(rawKey || "");
      if (isLineSeriesInstanceOverrideKey(raw) && typeof color === "string" && color.trim()) {
        nextOverrides[raw] = color.trim();
        continue;
      }
      const key = raw.includes("::") ? raw : deScope(raw);
      if ((raw.includes("::") || keys.includes(key)) && typeof color === "string" && color.trim()) {
        nextOverrides[key] = color;
      }
    }
    s.lineColorOverrides = nextOverrides;
  }

  if (s.lineLabelOverrides && typeof s.lineLabelOverrides === "object") {
    const nextLabels = {};
    for (const [rawKey, label] of Object.entries(s.lineLabelOverrides)) {
      const raw = String(rawKey || "");
      if (isLineSeriesInstanceOverrideKey(raw) && typeof label === "string" && label.trim()) {
        nextLabels[raw] = label.trim();
        continue;
      }
      const key = raw.includes("::") ? raw : deScope(raw);
      if ((raw.includes("::") || keys.includes(key)) && typeof label === "string" && label.trim()) {
        nextLabels[key] = label.trim();
      }
    }
    s.lineLabelOverrides = nextLabels;
  }

  if (Array.isArray(s.chartLineFilters)) {
    const yKeys = Array.isArray(s.selY) ? s.selY : [];
    const allowedSeries = new Set([
      ...yKeys.map((_, idx) => `line:${idx}`),
      ...yKeys,
    ]);
    const resolveFilterSeriesKey = (seriesKey) => {
      const raw = String(seriesKey || "");
      if (!raw) return "";
      if (/^line:\d+$/.test(raw)) {
        const idx = Number(raw.slice(5));
        if (idx >= 0 && idx < yKeys.length) return raw;
      }
      const plain = deScope(raw);
      const idx = yKeys.findIndex((y) => {
        const yRaw = String(y || "");
        return yRaw === raw || deScope(yRaw) === plain;
      });
      return idx >= 0 ? `line:${idx}` : raw;
    };
    const resolveFilterColumn = (column) => {
      const raw = String(column || "").trim();
      if (!raw) return "";
      if (raw.includes("::")) return raw;
      const plain = deScope(raw);
      if (keys.includes(plain)) return plain;
      return raw;
    };
    s.chartLineFilters = s.chartLineFilters
      .map((rule, idx) => {
        if (!rule || typeof rule !== "object") return null;
        const seriesKey = resolveFilterSeriesKey(rule.seriesKey);
        const column = resolveFilterColumn(rule.column);
        if (!seriesKey || !column) return null;
        if (!allowedSeries.has(seriesKey) && !/^line:\d+$/.test(seriesKey)) return null;
        return {
          id: String(rule.id || `filter-${idx}`),
          seriesKey,
          column,
          operator: String(rule.operator || "="),
          value: rule.value ?? "",
        };
      })
      .filter(Boolean);
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

  if (!s.selX) s.selX = fallback.selX;
  if (!Array.isArray(s.selY) || s.selY.length === 0) s.selY = fallback.selY;
  // Preserve saved chart type when axes were saved intentionally; only infer type when snapshot had none.
  if (!allowedTypes.has(type)) {
    s.selChartType = fallback.selChartType;
  }

  return coerceCategoricalBuilderAxes(s, keys);
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
  const primaryId = primarySheetIdForChartSnapshot(dataSheets, rechartsBuilderRaw);
  const scopedSheets = dataSheetsReferencedBySnapshot(dataSheets, rechartsBuilderRaw);
  const primaryRows = Array.isArray(dataSheets[primaryId]?.data) ? dataSheets[primaryId].data : [];
  const rowsForNormalize = primaryRows.length ? primaryRows : rowsForFallback;
  const rechartsBuilder = normalizeBuilderSnapshot(rechartsBuilderRaw, rowsForNormalize, scopedSheets);

  const publicChart = {
    chart_name: chartLean.chart_name,
    chart_properties: cp && typeof cp === "object" ? [cp] : [],
    rechartsBuilder,
  };

  const rows = primaryRows.length ? primaryRows : rowsForFallback;

  return {
    chart: publicChart,
    rows: stripInternalFromRows(rows),
    dataSheets,
    rechartsBuilder,
  };
}
