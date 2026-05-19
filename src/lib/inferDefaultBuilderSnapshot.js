/** Hidden / derived columns — never auto-pick for chart axes. */
const INTERNAL_COLUMN_KEY = /__bucket_ms$|^_/;

function isTemporalColumnKey(key) {
  return /(^timestamp$)|(_at$)|(_time$)|(^created_)|(_date$)|date|time/i.test(String(key || ""));
}

/**
 * @param {string[]} keys
 */
function pickChartAxisColumns(keys) {
  const cols = keys.filter((k) => k && !INTERNAL_COLUMN_KEY.test(k));
  if (!cols.length) return { x: undefined, y: [] };
  if (cols.length === 1) return { x: cols[0], y: [cols[0]] };

  const x = cols.find(isTemporalColumnKey) || cols.find((k) => k !== "count") || cols[0];
  const rest = cols.filter((k) => k !== x);
  const yKey =
    rest.find((k) => /price|bid|ask|volume/i.test(k) && k !== "count") ||
    rest.find((k) => k !== "count") ||
    rest[0];
  return { x, y: yKey ? [yKey] : [] };
}

/**
 * Default workspace chart tab ("Chart 1") before the user builds or saves a chart.
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

  const { x, y } = pickChartAxisColumns(keys);
  if (!x) return { v: 1, selChartType: "area", selX: undefined, selY: [] };
  if (!y.length) return { v: 1, selChartType: "area", selX: x, selY: [x] };

  const chartType = isTemporalColumnKey(x) ? "line" : keys.length > 2 ? "line" : "area";
  return { v: 1, selChartType: chartType, selX: x, selY: y };
}
