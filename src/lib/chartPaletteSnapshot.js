/** Color-related builder snapshot fields copied when creating a new chart (deep-cloned, not linked). */
export const CHART_PALETTE_SNAPSHOT_KEYS = [
  "selectedShadBaseId",
  "selectedPalette",
  "lineColorOverrides",
  "dark",
  "titleColor",
  "subTitleColor",
  "bodyHeadingColor",
  "bodyContentColor",
  "innerBoxColor",
  "gridLineColor",
  "chartTextColor",
  "xAxisTickColor",
  "yAxisTickColor",
  "chartConfig",
  "livelineColorChoice",
];

function cloneSnapshotValue(value) {
  if (value == null) return value;
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(value);
    } catch {
      /* fall through */
    }
  }
  return JSON.parse(JSON.stringify(value));
}

/** Deep-clone palette fields from a v1 builder snapshot. Returns null when nothing to copy. */
export function extractChartPaletteSnapshot(source) {
  if (!source || source.v !== 1) return null;
  const out = { v: 1 };
  let hasAny = false;
  for (const key of CHART_PALETTE_SNAPSHOT_KEYS) {
    if (source[key] === undefined) continue;
    out[key] = cloneSnapshotValue(source[key]);
    hasAny = true;
  }
  return hasAny ? out : null;
}

export function chartSheetNumericId(id) {
  const match = String(id || "").match(/^chart-(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

/** Most recently created chart sheet that has a saved snapshot (highest chart-N). */
export function findLastCreatedChartSnapshot(chartSheets, { excludeId = null } = {}) {
  const candidates = Object.entries(chartSheets || {})
    .filter(([id, sheet]) => {
      if (excludeId && id === excludeId) return false;
      return sheet?.snapshot?.v === 1;
    })
    .sort(([idA], [idB]) => chartSheetNumericId(idB) - chartSheetNumericId(idA));
  return candidates[0]?.[1]?.snapshot ?? null;
}

/**
 * Resolve palette seed for a new chart: prefer flushed/active chart, else last created chart.
 */
export function resolvePaletteSeedForNewChart({ chartSheets, activeChartSheetId, flushedSnapshot }) {
  const source =
    (flushedSnapshot?.v === 1 ? flushedSnapshot : null) ??
    chartSheets?.[activeChartSheetId]?.snapshot ??
    findLastCreatedChartSnapshot(chartSheets, { excludeId: activeChartSheetId });
  return extractChartPaletteSnapshot(source);
}
