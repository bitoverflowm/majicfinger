/** 1-based index among all `type: "cards"` columns in layout order. */
export function chartSlotIndex(layout, rowId, colId) {
  const rows = layout?.rows ?? [];
  let idx = 0;
  for (const r of rows) {
    if (r?.type !== "cards") continue;
    for (const c of r.columns || []) {
      idx += 1;
      if (r.id === rowId && c.id === colId) return idx;
    }
  }
  return null;
}

export function chartSlotLabel(layout, rowId, colId) {
  const n = chartSlotIndex(layout, rowId, colId);
  return n != null ? `Chart ${n}` : "Chart";
}
