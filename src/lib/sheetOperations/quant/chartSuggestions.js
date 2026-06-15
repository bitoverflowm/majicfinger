/**
 * Build chart builder snapshots for quant operation outputs.
 */

export function buildLifecycleBrierChartSnapshot(rows, { xColumn = "checkpoint", yColumn = "avg_brier_score" } = {}) {
  const cols = Object.keys(rows?.[0] || {});
  if (!cols.includes(xColumn) || !cols.includes(yColumn)) return null;
  return {
    v: 1,
    selX: xColumn,
    selY: [yColumn, "baseline_brier_50_50"].filter((c) => cols.includes(c)),
    selChartType: "line",
    chartTitle: "Forecast Error Across Market Lifecycle",
    lineColorOverrides: {},
    chartConfig: {},
  };
}

export function buildLifecycleAbsErrorChartSnapshot(rows, { xColumn = "checkpoint", yColumn = "avg_absolute_error" } = {}) {
  const cols = Object.keys(rows?.[0] || {});
  if (!cols.includes(xColumn) || !cols.includes(yColumn)) return null;
  return {
    v: 1,
    selX: xColumn,
    selY: [yColumn],
    selChartType: "line",
    chartTitle: "Average Forecast Error Across Market Lifecycle",
    lineColorOverrides: {},
    chartConfig: {},
  };
}

export function buildCalibrationChartSnapshot(rows, { xColumn = "avg_probability", yColumn = "yes_rate" } = {}) {
  const cols = Object.keys(rows?.[0] || {});
  if (!cols.includes(xColumn) || !cols.includes(yColumn)) return null;
  return {
    v: 1,
    selX: xColumn,
    selY: [yColumn],
    selChartType: "scatter",
    chartTitle: "Market Probability vs Actual Resolution Rate",
    lineColorOverrides: {},
    chartConfig: {},
  };
}

export function buildQuantChartSuggestions(accuracyRows) {
  const suggestions = [];
  const primary = buildLifecycleBrierChartSnapshot(accuracyRows);
  const secondary = buildLifecycleAbsErrorChartSnapshot(accuracyRows);
  const calibration = buildCalibrationChartSnapshot(accuracyRows);
  if (primary) suggestions.push({ id: "brier_decay", title: primary.chartTitle, snapshot: primary });
  if (secondary) suggestions.push({ id: "abs_error_decay", title: secondary.chartTitle, snapshot: secondary });
  if (calibration) suggestions.push({ id: "calibration", title: calibration.chartTitle, snapshot: calibration });
  return suggestions;
}
