/**
 * Minimal builder snapshot when no rechartsBuilder was saved (legacy charts).
 * @param {unknown[]} rows
 * @returns {{ v: 1, selChartType: string, selX?: string, selY: string[] }}
 */
export function inferDefaultBuilderSnapshot(rows) {
  if (!Array.isArray(rows) || rows.length === 0 || typeof rows[0] !== "object" || !rows[0]) {
    return { v: 1, selChartType: "area", selX: undefined, selY: [] };
  }
  const keys = Object.keys(rows[0]).filter((k) => k != null);
  if (keys.length === 0) return { v: 1, selChartType: "area", selX: undefined, selY: [] };
  if (keys.length === 1) return { v: 1, selChartType: "area", selX: keys[0], selY: [keys[0]] };
  return { v: 1, selChartType: "line", selX: keys[0], selY: [keys[1]] };
}
