/** Hidden / derived columns — never auto-pick for chart axes. */
const INTERNAL_COLUMN_KEY = /__bucket_ms$|^_/;

const CATEGORICAL_LABEL_KEY =
  /^(title|name|label|market_name|question|caption|description|event_title|market_title)$/i;

const METRIC_VALUE_KEY =
  /^(volume|count|amount|total|sum|value|notional|size|quantity|open_interest|oi|price)$/i;

export function isTemporalColumnKey(key) {
  const k = String(key || "").trim();
  if (!k) return false;
  return /^(timestamp|time|date|datetime|created_at|updated_at|ts)$/i.test(k) || /(_at$)|(_time$)|(_date$)/i.test(k);
}

/**
 * @param {string[]} cols
 * @returns {string | undefined}
 */
function pickCategoricalLabelColumn(cols) {
  return (
    cols.find((k) => CATEGORICAL_LABEL_KEY.test(k)) ||
    cols.find(
      (k) =>
        /title|name|label|question|caption|description/i.test(k) &&
        !METRIC_VALUE_KEY.test(k) &&
        !isTemporalColumnKey(k),
    )
  );
}

/**
 * @param {string[]} cols
 * @returns {string | undefined}
 */
function pickMetricColumn(cols) {
  return (
    cols.find((k) => METRIC_VALUE_KEY.test(k) && k !== "count") ||
    cols.find((k) => /volume|count|amount|total|value|price|notional/i.test(k) && k !== "count")
  );
}

/**
 * @param {string[]} keys
 * @returns {{ x?: string, y: string[], chartType?: string }}
 */
function pickChartAxisColumns(keys) {
  const cols = keys.filter((k) => k && !INTERNAL_COLUMN_KEY.test(k));
  if (!cols.length) return { x: undefined, y: [] };
  if (cols.length === 1) return { x: cols[0], y: [cols[0]] };

  const labelCol = pickCategoricalLabelColumn(cols);
  const metricCol = pickMetricColumn(cols);
  if (labelCol && metricCol && labelCol !== metricCol) {
    return { x: labelCol, y: [metricCol], chartType: "bar" };
  }

  const x = cols.find(isTemporalColumnKey) || cols.find((k) => k !== "count") || cols[0];
  const rest = cols.filter((k) => k !== x);
  const yKey =
    rest.find((k) => /price|bid|ask|volume/i.test(k) && k !== "count") ||
    rest.find((k) => k !== "count") ||
    rest[0];
  const chartType = isTemporalColumnKey(x) ? "line" : cols.length > 2 ? "line" : "area";
  return { x, y: yKey ? [yKey] : [], chartType };
}

function deScopeAxisKey(key) {
  const raw = String(key || "");
  const idx = raw.indexOf("::");
  return idx > -1 ? raw.slice(idx + 2) : raw;
}

function remapAxisKeyColumn(axisKey, nextColumn) {
  const raw = String(axisKey || "");
  const idx = raw.indexOf("::");
  if (idx > 0) return `${raw.slice(0, idx + 2)}${nextColumn}`;
  return nextColumn;
}

/**
 * Saved snapshots sometimes pin `date` as X for ranked market tables (title + volume + date).
 * Prefer the label column when Y looks like a metric.
 * @param {object} snapshot
 * @param {string[]} keys
 */
export function coerceCategoricalBuilderAxes(snapshot, keys) {
  const s = snapshot && typeof snapshot === "object" ? { ...snapshot } : snapshot;
  if (!s || !Array.isArray(keys) || !keys.length) return snapshot;

  const labelCol = pickCategoricalLabelColumn(keys);
  const metricCol = pickMetricColumn(keys);
  if (!labelCol || !metricCol || labelCol === metricCol) return s;

  const yKeys = Array.isArray(s.selY) ? s.selY.map(deScopeAxisKey) : [];
  const yLooksMetric = yKeys.some((k) => METRIC_VALUE_KEY.test(k) || k === metricCol);
  if (!yLooksMetric) return s;

  const xKey = deScopeAxisKey(s.selX);
  if (!xKey || xKey === labelCol) return s;

  // Respect intentional time-series bar/line charts (e.g. year → volume with stacked breakdown).
  if ((s.selChartType === "bar" || s.selChartType === "line") && isTemporalColumnKey(xKey)) {
    return s;
  }

  const xIsTemporal = isTemporalColumnKey(xKey);
  const xIsMetadata =
    /^(date|ticker|market_type|market_ticker|event_ticker|id|category)$/i.test(xKey) &&
    xKey !== labelCol;

  if (!xIsTemporal && !xIsMetadata) return s;

  s.selX = remapAxisKeyColumn(s.selX, labelCol);
  if (s.selChartType === "line" || s.selChartType === "area") {
    s.selChartType = "bar";
  }
  return s;
}

/**
 * Default workspace chart tab ("Chart 1") before the user builds or saved a chart.
 *
 * @param {object | null | undefined} sheet
 * @param {number} [index]
 */
export function isPlaceholderChartSheet(sheet, index = 0) {
  if (!sheet || typeof sheet !== "object") return true;
  if (sheet.userCreated) return false;
  if (sheet.chartMeta?._id) return false;

  const name = String(sheet.name || "").trim();
  const defaultName = `Chart ${index + 1}`;
  if (name && name !== defaultName && name !== "Chart") return false;

  const cp = sheet.chartMeta?.chart_properties;
  const fromMeta = Array.isArray(cp) ? cp[0]?.rechartsBuilder : cp?.rechartsBuilder;
  if (fromMeta?.v === 1 && (fromMeta.selX || fromMeta?.selY?.length)) return false;

  return true;
}

/**
 * Minimal builder snapshot when no rechartsBuilder was saved (legacy charts).
 * @param {unknown[]} rows
 * @returns {{ v: 1, selChartType: string, selX?: string, selY: string[] }}
 */
export function inferDefaultBuilderSnapshot(rows) {
  if (!Array.isArray(rows) || rows.length === 0 || typeof rows[0] !== "object" || !rows[0]) {
    return { v: 1, selChartType: "area", selX: undefined, selY: [] };
  }
  const keys = Object.keys(rows[0]).filter((k) => k != null && !INTERNAL_COLUMN_KEY.test(k));
  if (keys.length === 0) return { v: 1, selChartType: "area", selX: undefined, selY: [] };

  const { x, y, chartType } = pickChartAxisColumns(keys);
  if (!x) return { v: 1, selChartType: "area", selX: undefined, selY: [] };
  if (!y.length) return { v: 1, selChartType: "area", selX: x, selY: [x] };

  const resolvedChartType =
    chartType || (isTemporalColumnKey(x) ? "line" : keys.length > 2 ? "line" : "area");
  return { v: 1, selChartType: resolvedChartType, selX: x, selY: y };
}
