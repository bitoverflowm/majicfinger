/** Merge `partial` into the cards column identified by `rowId` + `colId`. */
export function patchChartDashboardColumn(setChartDashboardDraft, rowId, colId, partial) {
  setChartDashboardDraft?.((prev) => {
    if (!prev) return prev;
    const layout = prev.layout && typeof prev.layout === "object" ? prev.layout : { version: 1, rows: [] };
    const rows = Array.isArray(layout.rows) ? layout.rows : [];
    const nextRows = rows.map((r) => {
      if (r.id !== rowId || r.type !== "cards" || !Array.isArray(r.columns)) return r;
      const columns = r.columns.map((c) => (c.id === colId ? { ...c, ...partial } : c));
      return { ...r, columns };
    });
    return { ...prev, layout: { ...layout, rows: nextRows } };
  });
}
