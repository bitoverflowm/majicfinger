import { liveSheetRowKey } from "@/lib/liveFeeds/merge/kalshiCandlestickUpsert";

/**
 * Flash AG Grid cells for rows stamped by a live feed upsert.
 * New rows flash all columns; changed rows flash only changed fields.
 *
 * @param {import("ag-grid-community").GridApi | null | undefined} api
 * @param {{
 *   revision?: number;
 *   rows?: Record<string, { isNew?: boolean; columns?: string[] }>;
 * } | null | undefined} liveFlash
 * @param {{ ensureVisible?: boolean }} [opts]
 */
export function flashLiveSheetInGrid(api, liveFlash, opts = {}) {
  if (!api || typeof api.flashCells !== "function") return;
  const flashRows = liveFlash?.rows;
  if (!flashRows || typeof flashRows !== "object") return;

  /** @type {import("ag-grid-community").IRowNode[]} */
  const fullRowNodes = [];
  /** @type {Map<string, import("ag-grid-community").IRowNode[]>} */
  const byColumnSet = new Map();
  /** @type {import("ag-grid-community").IRowNode | null} */
  let firstHighlightNode = null;

  api.forEachNode((node) => {
    if (!node?.data) return;
    const key = liveSheetRowKey(node.data);
    if (!key || !flashRows[key]) return;
    const info = flashRows[key];
    if (!firstHighlightNode) firstHighlightNode = node;
    if (info?.isNew || !Array.isArray(info?.columns) || info.columns.length === 0) {
      fullRowNodes.push(node);
      return;
    }
    const colKey = info.columns.slice().sort().join("\0");
    const list = byColumnSet.get(colKey) || [];
    list.push(node);
    byColumnSet.set(colKey, list);
  });

  const flashDelay = 120;
  const fadeDelay = 1000;

  if (fullRowNodes.length) {
    api.flashCells({ rowNodes: fullRowNodes, flashDelay, fadeDelay });
  }
  for (const [colKey, nodes] of byColumnSet) {
    const columns = colKey.split("\0").filter(Boolean);
    if (!columns.length || !nodes.length) continue;
    api.flashCells({ rowNodes: nodes, columns, flashDelay, fadeDelay });
  }

  if (opts.ensureVisible !== false && firstHighlightNode && typeof api.ensureNodeVisible === "function") {
    try {
      api.ensureNodeVisible(firstHighlightNode, "middle");
    } catch {
      /* ignore */
    }
  }
}
