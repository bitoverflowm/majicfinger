/**
 * CSS grid for dashboard "cards" layout rows.
 * - Columns: 12-col flow.
 * - Rows: fixed track height so `grid-row: span N` is exactly N×row (+ gaps). Using `auto`/`minmax(...,auto)`
 *   lets rows grow with chart content, so reducing rowSpan cannot shrink (one row expands to fit the chart).
 */
export const CHART_CARDS_GRID_ROW_PX = 220;

/** Default `grid-row: span` for new chart cards (each span × CHART_CARDS_GRID_ROW_PX tall). */
export const DEFAULT_CHART_CARD_ROW_SPAN = 3;

/** Maximum `grid-row: span` allowed in the composer (dock + grid). */
export const MAX_CHART_CARD_ROW_SPAN = 5;

/** @param {unknown} rowSpan */
export function clampChartCardRowSpan(rowSpan) {
  if (rowSpan == null || rowSpan === "") {
    return DEFAULT_CHART_CARD_ROW_SPAN;
  }
  const n = Number(rowSpan);
  if (!Number.isFinite(n)) return DEFAULT_CHART_CARD_ROW_SPAN;
  return Math.min(MAX_CHART_CARD_ROW_SPAN, Math.max(1, Math.round(n)));
}

export const CHART_CARDS_GRID_STYLE = {
  gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
  gridAutoRows: `${CHART_CARDS_GRID_ROW_PX}px`,
};

/** @returns {{ version: 1, rows: object[] }} */
export function createEmptyDashboardLayout() {
  return {
    version: 1,
    rows: [],
  };
}
