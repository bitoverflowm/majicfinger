import { stripSheetScopedColumnKey } from "@/lib/chartColumnDisplay";

const CHART_X_AXIS_IDENTITY_LINE = "__chart_x_axis_identity__";

export function isChartLineIdentitySeries(sourceKey) {
  return String(sourceKey || "") === CHART_X_AXIS_IDENTITY_LINE;
}

/** Default legend / tooltip label for a plotted series (does not mutate sheet data). */
export function defaultChartSeriesLabel(sourceKey, index, { barPivot = false } = {}) {
  if (isChartLineIdentitySeries(sourceKey)) return "X-axis (y = x)";
  if (barPivot) return String(sourceKey || `Series ${index + 1}`);
  return `Line ${index + 1}: ${stripSheetScopedColumnKey(sourceKey)}`;
}

export function seriesLabelInstanceKey(index) {
  return `line:${index}`;
}

/** Chart-only display name; falls back to default when no override is set. */
export function resolveChartSeriesLabel(sourceKey, index, overrides, options) {
  const instanceKey = seriesLabelInstanceKey(index);
  const custom = overrides?.[instanceKey] ?? overrides?.[sourceKey];
  if (custom != null && String(custom).trim()) return String(custom).trim();
  return defaultChartSeriesLabel(sourceKey, index, options);
}
