/**
 * CSS grid for dashboard "cards" layout rows.
 * - Columns: 12-col flow.
 * - Rows: fixed track height so `grid-row: span N` is exactly N×row (+ gaps). Using `auto`/`minmax(...,auto)`
 *   lets rows grow with chart content, so reducing rowSpan cannot shrink (one row expands to fit the chart).
 */
export const CHART_CARDS_GRID_ROW_PX = 220;

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
