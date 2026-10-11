/**
 * Twenty-four-column canvas grid. Rows continue as far as the tab needs.
 * A block's width is a column span (1–24) and its height is a row span.
 * Move and resize snap to that grid.
 */

export const CLIP = {
  x0: 28,
  gap: 8,
  cols: 24,
  minSpan: 1,
  minRows: 2,
  originY: 88,
};

const DEFAULT_CANVAS_WIDTH = 1142;

let canvasWidth = DEFAULT_CANVAS_WIDTH;

const guideListeners = new Set();
let guideState = { active: false, preview: null };

/** Show or hide the snap guide. `preview` is the grid cell the block will adopt on release. */
export function setLayoutGuide(active, preview) {
  guideState = {
    active: !!active,
    preview: preview
      ? { x: preview.x, y: preview.y, w: preview.w, h: preview.h }
      : guideState.preview,
  };
  guideListeners.forEach((listener) => listener(guideState));
}

export function subscribeLayoutGuide(listener) {
  guideListeners.add(listener);
  return () => guideListeners.delete(listener);
}

export function setCanvasGridWidth(width) {
  const next = Number(width);
  if (!Number.isFinite(next) || next < 320) return;
  canvasWidth = next;
}

export function canvasGridMetrics() {
  const width = canvasWidth;
  const inner = Math.max(CLIP.cols, width - CLIP.x0 * 2);
  const track = (inner - CLIP.gap * (CLIP.cols - 1)) / CLIP.cols;
  const unit = track + CLIP.gap;
  return { width, inner, track, unit, x0: CLIP.x0, originY: CLIP.originY, gap: CLIP.gap, cols: CLIP.cols };
}

function metrics() {
  return canvasGridMetrics();
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function xForCol(col) {
  const { unit, x0 } = metrics();
  return Math.round(x0 + col * unit);
}

export function widthForSpan(span) {
  const { track, gap } = metrics();
  const used = clamp(span, 1, CLIP.cols);
  return Math.round(used * track + (used - 1) * gap);
}

export function heightForRows(rows) {
  const { track, gap } = metrics();
  const used = Math.max(1, rows);
  return Math.round(used * track + (used - 1) * gap);
}

export function yForRow(row) {
  const { unit, originY } = metrics();
  return Math.round(originY + Math.max(0, row) * unit);
}

/** How many columns a width occupies, from one column up to the full row. */
export function spanOf(block) {
  const { unit, gap } = metrics();
  const width = block?.w || widthForSpan(12);
  const span = Math.round((width + gap) / unit);
  return clamp(span, CLIP.minSpan, CLIP.cols);
}

export function rowsOf(block) {
  const { unit, gap } = metrics();
  const height = block?.h || heightForRows(CLIP.minRows);
  const rows = Math.round((height + gap) / unit);
  return Math.max(CLIP.minRows, rows);
}

function colForX(x, span) {
  const { unit, x0, cols } = metrics();
  const col = Math.round(((x || x0) - x0) / unit);
  return clamp(col, 0, cols - span);
}

function rowForY(y) {
  const { unit, originY } = metrics();
  return Math.max(0, Math.round(((y || originY) - originY) / unit));
}

export function isWideBlock(block) {
  return spanOf(block) >= CLIP.cols;
}

function overlaps(block, x, y, w, h, others) {
  const right = x + w;
  const bottom = y + h;
  return (others || []).some((other) => {
    if (!other || other.id === block.id) return false;
    const ox = other.x || 0;
    const oy = other.y || 0;
    return x < ox + (other.w || 0) - 1 && right > ox + 1 && y < oy + (other.h || 0) - 1 && bottom > oy + 1;
  });
}

function nudgeDown(block, x, y, w, h, others) {
  const { unit } = metrics();
  let next = y;
  let guard = 0;
  while (overlaps(block, x, next, w, h, others) && guard < 40) {
    next += unit;
    guard += 1;
  }
  return Math.round(next);
}

/** Snap a moved block onto the nearest column and row. Its span stays put. */
export function snapMove(block, others) {
  const span = spanOf(block);
  const rows = rowsOf(block);
  const w = widthForSpan(span);
  const h = heightForRows(rows);
  const col = colForX(block.x, span);
  const x = xForCol(col);
  const y = nudgeDown(block, x, yForRow(rowForY(block.y)), w, h, others);
  return { x, y, w, h };
}

function boundaryCol(px) {
  const { unit, x0, cols } = metrics();
  return clamp(Math.round((px - x0) / unit), 0, cols);
}

function boundaryRow(px) {
  const { unit, originY } = metrics();
  return Math.max(0, Math.round((px - originY) / unit));
}

/**
 * Snap a resize from any edge. Fixed edges stay on their column or row.
 * Moving edges round to the nearest grid line.
 * @param {{ id?: string, x: number, y: number, w: number, h: number }} origin
 * @param {{ x: number, y: number, w: number, h: number }} raw
 * @param {{ left?: boolean, right?: boolean, top?: boolean, bottom?: boolean }} edges
 */
export function snapResizeEdges(origin, raw, edges, others) {
  const { cols } = metrics();
  const startCol = colForX(origin.x, 1);
  const startRow = rowForY(origin.y);
  let col0 = startCol;
  let col1 = startCol + spanOf(origin);
  let row0 = startRow;
  let row1 = startRow + rowsOf(origin);
  if (edges?.left) col0 = boundaryCol(raw.x);
  if (edges?.right) col1 = boundaryCol(raw.x + raw.w);
  if (edges?.top) row0 = boundaryRow(raw.y);
  if (edges?.bottom) row1 = boundaryRow(raw.y + raw.h);
  if (col1 <= col0) {
    if (edges?.left && !edges?.right) col0 = col1 - 1;
    else col1 = col0 + 1;
  }
  if (row1 - row0 < CLIP.minRows) {
    if (edges?.top && !edges?.bottom) row0 = Math.max(0, row1 - CLIP.minRows);
    else row1 = row0 + CLIP.minRows;
  }
  col0 = clamp(col0, 0, cols - 1);
  col1 = clamp(col1, col0 + 1, cols);
  row0 = Math.max(0, row0);
  const x = xForCol(col0);
  const y = yForRow(row0);
  const w = widthForSpan(col1 - col0);
  const h = heightForRows(row1 - row0);
  return { x, y: nudgeDown({ id: origin.id }, x, y, w, h, others), w, h };
}

/** Snap a bottom-right resize. The top-left column and row stay fixed. */
export function snapResize(block, rawWidth, rawHeight, others) {
  return snapResizeEdges(
    block,
    { x: block.x, y: block.y, w: rawWidth, h: rawHeight },
    { right: true, bottom: true },
    others,
  );
}

/** Snap one block onto the grid after a free drag. */
export function snapBlockPosition(block, others) {
  return snapMove(block, others);
}

function placeChartRow(placed, charts, y) {
  const half = CLIP.cols / 2;
  let col = 0;
  let rowHeight = 0;
  let rowY = y;
  const { gap } = metrics();
  for (const chart of charts) {
    const span = half;
    if (col > 0 && col + span > CLIP.cols) {
      y = rowY + rowHeight + gap;
      col = 0;
      rowHeight = 0;
      rowY = y;
    }
    const height = chart.h || heightForRows(8);
    placed.push({ ...chart, x: xForCol(col), y: Math.round(rowY), w: widthForSpan(span), h: height });
    col += span;
    rowHeight = Math.max(rowHeight, height);
  }
  return col > 0 ? rowY + rowHeight + gap : y;
}

/**
 * Pack the tab so each trades sheet sits on the left of its chart, other sheets share
 * aligned rows, and a full-width sheet keeps its chart underneath.
 */
export function packClippedBlocks(blocks) {
  const ordered = [...(blocks || [])].sort((a, b) => (a.y || 0) - (b.y || 0) || (a.x || 0) - (b.x || 0));
  const charts = new Map();
  const wideSheets = [];
  const sheets = [];
  const extras = [];

  for (const block of ordered) {
    if (block.type === "chart" && block.sourceSheetId) {
      const list = charts.get(block.sourceSheetId) || [];
      list.push(block);
      charts.set(block.sourceSheetId, list);
      continue;
    }
    if (block.type === "sheet" && isWideBlock(block)) wideSheets.push(block);
    else if (block.type === "sheet") sheets.push(block);
    else extras.push(block);
  }

  const placed = [];
  const { gap } = metrics();
  let y = CLIP.originY;

  for (const sheet of wideSheets) {
    const height = sheet.h || heightForRows(9);
    placed.push({ ...sheet, x: xForCol(0), y, w: widthForSpan(CLIP.cols), h: height });
    y += height + gap;
    const attached = charts.get(sheet.id) || [];
    charts.delete(sheet.id);
    if (attached.length === 1) {
      const chartH = heightForRows(rowsOf({ h: attached[0].h || 320 }));
      placed.push({ ...attached[0], x: xForCol(0), y, w: widthForSpan(CLIP.cols), h: chartH });
      y += chartH + gap;
    } else if (attached.length > 1) {
      y = placeChartRow(placed, attached, y);
    }
  }

  const rows = [];
  for (const sheet of sheets) {
    const attached = charts.get(sheet.id) || [];
    charts.delete(sheet.id);
    rows.push(attached.length ? [sheet, ...attached] : [sheet]);
  }
  for (const attached of charts.values()) extras.push(...attached);

  let col = 0;
  let rowHeight = 0;
  let rowY = y;
  const flow = [];
  for (const row of rows) flow.push(...row);
  flow.push(...extras);

  for (const item of flow) {
    const span = Math.min(spanOf(item), CLIP.cols);
    if (col > 0 && col + span > CLIP.cols) {
      y = rowY + rowHeight + gap;
      col = 0;
      rowHeight = 0;
      rowY = y;
    }
    const height = heightForRows(rowsOf(item));
    placed.push({ ...item, x: xForCol(col), y: Math.round(rowY), w: widthForSpan(span), h: height });
    col += span;
    rowHeight = Math.max(rowHeight, height);
    if (col >= CLIP.cols) {
      y = rowY + rowHeight + gap;
      col = 0;
      rowHeight = 0;
      rowY = y;
    }
  }

  return placed;
}
