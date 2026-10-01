/** Two-column clip grid. Blocks land on these rows and columns instead of free coordinates. */

export const CLIP = {
  x0: 28,
  gap: 16,
  colW: 540,
  rowH: 360,
  originY: 88,
};

const FULL_W = CLIP.colW * 2 + CLIP.gap;

export function isWideBlock(block) {
  return (block?.w || 0) > CLIP.colW + 80;
}

function overlaps(block, x, y, others) {
  return others.some(
    (other) =>
      other.id !== block.id && Math.abs((other.x || 0) - x) < 40 && Math.abs((other.y || 0) - y) < 40,
  );
}

/** Snap one block onto the clip grid after a drag. */
export function snapBlockPosition(block, others) {
  const wide = isWideBlock(block);
  const w = wide ? FULL_W : CLIP.colW;
  const h = wide ? block.h || CLIP.rowH : CLIP.rowH;
  const col = wide || (block.x || 0) + (block.w || 0) / 2 <= CLIP.x0 + FULL_W / 2 ? 0 : 1;
  const x = CLIP.x0 + col * (CLIP.colW + CLIP.gap);
  let y = CLIP.originY + Math.max(0, Math.round(((block.y || 0) - CLIP.originY) / (CLIP.rowH + CLIP.gap))) * (CLIP.rowH + CLIP.gap);
  let guard = 0;
  while (overlaps(block, x, y, others) && guard < 24) {
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
    placed.push({ ...sheet, x: CLIP.x0, y, w: FULL_W, h: height });
    y += height + CLIP.gap;
    const chart = charts.get(sheet.id);
    if (chart) {
      placed.push({ ...chart, x: CLIP.x0, y, w: FULL_W, h: 320 });
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

  let pending = null;
  const placePair = (left, right) => {
    placed.push({ ...left, x: CLIP.x0, y, w: CLIP.colW, h: CLIP.rowH });
    if (right) placed.push({ ...right, x: CLIP.x0 + CLIP.colW + CLIP.gap, y, w: CLIP.colW, h: CLIP.rowH });
    y += CLIP.rowH + CLIP.gap;
  };
  for (const row of rows) {
    if (row.length === 2) {
      placePair(row[0], row[1]);
    } else if (!pending) {
      pending = row[0];
    } else {
      placePair(pending, row[0]);
      pending = null;
    }
  }
  if (pending) placePair(pending, null);

  for (const extra of extras) {
    const wide = isWideBlock(extra);
    const height = extra.h || CLIP.rowH;
    placed.push({ ...extra, x: CLIP.x0, y, w: wide ? FULL_W : CLIP.colW, h: height });
    y += height + CLIP.gap;
  }

  return placed;
}
