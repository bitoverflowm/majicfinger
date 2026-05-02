/**
 * Remove one chart slot from a dashboard draft layout.
 * If the row has only one column, the whole row is removed; otherwise only that column.
 */
export function removeDashboardChartSlotFromDraft(draft, rowId, colId) {
  const layout = draft.layout && typeof draft.layout === "object" ? draft.layout : { version: 1, rows: [] };
  const rows = Array.isArray(layout.rows) ? [...layout.rows] : [];
  const rowIdx = rows.findIndex((r) => r.id === rowId);
  if (rowIdx < 0) return draft;
  const row = rows[rowIdx];
  if (!row || row.type !== "cards" || !Array.isArray(row.columns)) return draft;

  const rowCols = row.columns;
  if (rowCols.length <= 1) {
    rows.splice(rowIdx, 1);
    return { ...draft, layout: { ...layout, rows } };
  }
  const nextCols = rowCols.filter((c) => c.id !== colId);
  if (nextCols.length === rowCols.length) return draft;
  rows[rowIdx] = { ...row, columns: nextCols };
  return { ...draft, layout: { ...layout, rows } };
}

/** Remove an entire layout row (cards or text) by id. */
export function removeDashboardLayoutRowFromDraft(draft, rowId) {
  const layout = draft.layout && typeof draft.layout === "object" ? draft.layout : { version: 1, rows: [] };
  const rows = Array.isArray(layout.rows) ? layout.rows.filter((r) => r.id !== rowId) : [];
  return { ...draft, layout: { ...layout, rows } };
}
