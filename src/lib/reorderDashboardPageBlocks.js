/**
 * Dashboard "Layers" sidebar: flatten to one entry per text row and per chart column,
 * reorder, then rebuild `layout.rows`. Consecutive chart slots whose `colSpan` values sum
 * to ≤ 12 are packed into a single `cards` row (e.g. two 50% charts stay one row).
 */

function makeRowId() {
  return `row-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function clampColSpan(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 12;
  return Math.min(12, Math.max(1, Math.round(x)));
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
  const newRows = [];
  let idx = 0;

  while (idx < flat.length) {
    const item = flat[idx];

    if (item.kind === "text") {
      const r = rowMap.get(item.rowId);
      if (r?.type === "text") {
        newRows.push({ ...r });
      }
      idx += 1;
      continue;
    }

    const batch = [];
    let spanSum = 0;

    while (idx < flat.length && flat[idx].kind === "slot") {
      const slotItem = flat[idx];
      const parentRow = rowMap.get(slotItem.rowId);
      if (!parentRow || parentRow.type !== "cards") {
        idx += 1;
        break;
      }
      const col = parentRow.columns?.find((c) => c.id === slotItem.colId);
      if (!col) {
        idx += 1;
        continue;
      }
      const sp = clampColSpan(col.colSpan);
      if (batch.length > 0 && spanSum + sp > 12) {
        break;
      }
      batch.push({ slotItem, col: { ...col } });
      spanSum += sp;
      idx += 1;
    }

    if (batch.length === 0) {
      continue;
    }

    if (batch.length === 1) {
      newRows.push({
        id: batch[0].slotItem.rowId,
        type: "cards",
        columns: [batch[0].col],
      });
    } else {
      const sameSourceRow = batch.every((b) => b.slotItem.rowId === batch[0].slotItem.rowId);
      newRows.push({
        id: sameSourceRow ? batch[0].slotItem.rowId : makeRowId(),
        type: "cards",
        columns: batch.map((b) => b.col),
      });
    }
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
