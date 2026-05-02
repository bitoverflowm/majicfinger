/**
 * Dashboard "Layers" sidebar: flatten to one entry per text row and per chart column,
 * reorder, then rebuild layout so each chart lives in its own `cards` row (full width).
 */

function makeRowId() {
  return `row-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

/** @typedef {{ kind: 'text', rowId: string } | { kind: 'slot', rowId: string, colId: string }} DashboardLayerItem */

/**
 * @param {object} layout
 * @returns {DashboardLayerItem[]}
 */
export function flattenDashboardLayers(layout) {
  const flat = [];
  for (const r of layout?.rows || []) {
    if (r?.type === "text") {
      flat.push({ kind: "text", rowId: r.id });
    } else if (r?.type === "cards" && Array.isArray(r.columns)) {
      for (const col of r.columns) {
        if (col?.id) {
          flat.push({ kind: "slot", rowId: r.id, colId: col.id });
        }
      }
    }
  }
  return flat;
}

/**
 * @param {object} layout
 * @param {string} colId
 * @returns {string|null}
 */
export function findRowIdForColumn(layout, colId) {
  if (!colId) return null;
  for (const r of layout?.rows || []) {
    if (r?.type !== "cards" || !Array.isArray(r.columns)) continue;
    if (r.columns.some((c) => c.id === colId)) return r.id;
  }
  return null;
}

/**
 * @param {DashboardLayerItem[]} flat
 * @param {object} layout original layout (for copying row/column data)
 */
export function rebuildLayoutFromFlatLayers(flat, layout) {
  const rowMap = new Map((layout.rows || []).map((r) => [r.id, r]));
  const seenSourceRowForSlot = new Set();
  const newRows = [];

  for (const item of flat) {
    if (item.kind === "text") {
      const r = rowMap.get(item.rowId);
      if (r?.type === "text") {
        newRows.push({ ...r });
      }
      continue;
    }

    const parentRow = rowMap.get(item.rowId);
    if (!parentRow || parentRow.type !== "cards") continue;
    const col = parentRow.columns?.find((c) => c.id === item.colId);
    if (!col) continue;

    const colCopy = { ...col, colSpan: 12 };
    const firstSlotFromThisSourceRow = !seenSourceRowForSlot.has(item.rowId);
    seenSourceRowForSlot.add(item.rowId);
    const assignedRowId = firstSlotFromThisSourceRow ? item.rowId : makeRowId();

    newRows.push({
      id: assignedRowId,
      type: "cards",
      columns: [colCopy],
    });
  }

  return { ...layout, rows: newRows };
}

/**
 * Reorder layers (flattened visual list) and rebuild `layout.rows`.
 */
export function reorderDashboardPageBlocks(layout, sourceIndex, destinationIndex) {
  const flat = flattenDashboardLayers(layout);
  const n = flat.length;
  if (
    sourceIndex < 0 ||
    sourceIndex >= n ||
    destinationIndex < 0 ||
    destinationIndex >= n ||
    sourceIndex === destinationIndex
  ) {
    return layout;
  }
  const next = [...flat];
  const [moved] = next.splice(sourceIndex, 1);
  next.splice(destinationIndex, 0, moved);
  return rebuildLayoutFromFlatLayers(next, layout);
}
