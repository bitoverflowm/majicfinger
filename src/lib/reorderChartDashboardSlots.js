/**
 * Reorder chart card slots in dashboard layout (sidebar "Charts on page" drag-and-drop).
 * Requires every `cards` row to have exactly one column (composer default). Otherwise returns layout unchanged.
 */
export function reorderChartDashboardSlots(layout, sourceIndex, destinationIndex) {
  if (!layout?.rows?.length) return layout;
  const rows = layout.rows;

  const chartSlots = [];
  for (const r of rows) {
    if (r.type !== "cards" || !Array.isArray(r.columns)) continue;
    for (const col of r.columns) {
      chartSlots.push({ rowId: r.id, col });
    }
  }

  const n = chartSlots.length;
  if (
    sourceIndex < 0 ||
    sourceIndex >= n ||
    destinationIndex < 0 ||
    destinationIndex >= n ||
    sourceIndex === destinationIndex
  ) {
    return layout;
  }

  const cardsRows = rows.filter((r) => r.type === "cards");
  const allSingleCol = cardsRows.every((r) => Array.isArray(r.columns) && r.columns.length === 1);
  if (!allSingleCol) return layout;

  const nextSlots = [...chartSlots];
  const [removed] = nextSlots.splice(sourceIndex, 1);
  nextSlots.splice(destinationIndex, 0, removed);

  const rowById = new Map(rows.map((r) => [r.id, r]));
  const reorderedCardsRows = nextSlots
    .map((s) => {
      const r = rowById.get(s.rowId);
      return r ? { ...r, columns: [s.col] } : null;
    })
    .filter(Boolean);

  let ci = 0;
  const nextRows = rows.map((r) => {
    if (r.type !== "cards") return r;
    const nextRow = reorderedCardsRows[ci++];
    return nextRow ?? r;
  });

  return { ...layout, rows: nextRows };
}
