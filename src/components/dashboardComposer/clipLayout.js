/**
 * Twelve-column clip grid. Half width is 6 columns and full width is 12,
 * and a block can also lock to any span from a quarter (3) up to full.
 */

export const CLIP = {
  x0: 28,
  gap: 16,
  cols: 12,
  minSpan: 3,
  fullW: 540 * 2 + 16,
  colW: 540,
  rowH: 360,
  originY: 88,
};

function trackWidth() {
  return (CLIP.fullW - CLIP.gap * (CLIP.cols - 1)) / CLIP.cols;
}

function unit() {
  return trackWidth() + CLIP.gap;
}

/** How many columns a width occupies, from a quarter of the row up to the full row. */
export function spanOf(block) {
  const width = block?.w || CLIP.colW;
  const span = Math.round((width + CLIP.gap) / unit());
  return Math.min(CLIP.cols, Math.max(CLIP.minSpan, span));
}

function xForCol(col) {
  return Math.round(CLIP.x0 + col * unit());
}

function widthForSpan(span) {
  return Math.round(span * trackWidth() + (span - 1) * CLIP.gap);
}

function colForX(x, span) {
  const col = Math.round(((x || CLIP.x0) - CLIP.x0) / unit());
  return Math.max(0, Math.min(CLIP.cols - span, col));
}

function snapRowHeight(height) {
  const step = CLIP.rowH + CLIP.gap;
  const rows = Math.max(1, Math.round(((height || CLIP.rowH) + CLIP.gap) / step));
  return rows * CLIP.rowH + (rows - 1) * CLIP.gap;
}

export function isWideBlock(block) {
  return spanOf(block) >= CLIP.cols;
}

function overlaps(block, x, y, w, h, others) {
  const right = x + w;
  const bottom = y + h;
  return others.some((other) => {
    if (other.id === block.id) return false;
    const ox = other.x || 0;
    const oy = other.y || 0;
    return x < ox + (other.w || 0) && right > ox && y < oy + (other.h || 0) && bottom > oy;
  });
}

/** Snap one block onto the clip grid after a drag. */
export function snapBlockPosition(block, others) {
  const span = spanOf(block);
  const wide = span >= CLIP.cols;
  const w = widthForSpan(span);
  const h = wide ? block.h || CLIP.rowH : snapRowHeight(block.h);
  const col = wide ? 0 : colForX(block.x, span);
  const x = xForCol(col);
  let y = CLIP.originY + Math.max(0, Math.round(((block.y || 0) - CLIP.originY) / (CLIP.rowH + CLIP.gap))) * (CLIP.rowH + CLIP.gap);
  let guard = 0;
  while (overlaps(block, x, y, w, h, others) && guard < 24) {
    y += CLIP.rowH + CLIP.gap;
    guard += 1;
  }
  return { x, y, w, h };
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
      charts.set(block.sourceSheetId, block);
      continue;
    }
    if (block.type === "sheet" && isWideBlock(block)) wideSheets.push(block);
    else if (block.type === "sheet") sheets.push(block);
    else extras.push(block);
  }

  const placed = [];
  let y = CLIP.originY;

  for (const sheet of wideSheets) {
    const height = sheet.h || 420;
    placed.push({ ...sheet, x: CLIP.x0, y, w: widthForSpan(CLIP.cols), h: height });
    y += height + CLIP.gap;
    const chart = charts.get(sheet.id);
    if (chart) {
      placed.push({ ...chart, x: CLIP.x0, y, w: widthForSpan(CLIP.cols), h: 320 });
      y += 320 + CLIP.gap;
      charts.delete(sheet.id);
    }
  }

  const rows = [];
  for (const sheet of sheets) {
    const chart = charts.get(sheet.id);
    if (chart) {
      rows.push([sheet, chart]);
      charts.delete(sheet.id);
    } else {
      rows.push([sheet]);
    }
  }
  for (const chart of charts.values()) extras.push(chart);

  let col = 0;
  let rowHeight = 0;
  let rowY = y;
  const flow = [];
  for (const row of rows) flow.push(...row);
  flow.push(...extras);

  for (const item of flow) {
    const span = Math.min(spanOf(item), CLIP.cols);
    if (col > 0 && col + span > CLIP.cols) {
      y = rowY + rowHeight + CLIP.gap;
      col = 0;
      rowHeight = 0;
      rowY = y;
    }
    const height = span >= CLIP.cols ? item.h || CLIP.rowH : snapRowHeight(item.h);
    placed.push({ ...item, x: xForCol(col), y: rowY, w: widthForSpan(span), h: height });
    col += span;
    rowHeight = Math.max(rowHeight, height);
    if (col >= CLIP.cols) {
      y = rowY + rowHeight + CLIP.gap;
      col = 0;
      rowHeight = 0;
      rowY = y;
    }
  }

  return placed;
}
