/**
 * AG Grid column sizing helpers (Connect sheet + legacy grid).
 */

const HIDDEN_COL_IDS = new Set(["_origIndex"]);

/**
 * @param {import("ag-grid-community").GridApi | null | undefined} api
 * @returns {string[]}
 */
export function getAutoSizeableColumnIds(api) {
  if (!api || api.isDestroyed?.()) return [];
  return (api.getColumns() || [])
    .map((col) => col.getColId())
    .filter((id) => id && !HIDDEN_COL_IDS.has(id));
}

/**
 * Size columns to fit cell contents (Excel double-click / initial layout).
 *
 * @param {import("ag-grid-community").GridApi | null | undefined} api
 * @param {string[]} [colIds]
 */
export function autoSizeAgGridColumnsToContent(api, colIds) {
  if (!api || api.isDestroyed?.()) return;
  const keys = colIds?.length ? colIds : getAutoSizeableColumnIds(api);
  if (!keys.length) return;
  api.autoSizeColumns(keys, { skipHeader: false });
}
