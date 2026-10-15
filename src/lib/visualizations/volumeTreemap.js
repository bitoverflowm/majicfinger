import { sheetRecords } from "@/lib/visualizations/datasetDescriptor";
import { parseVisualNumber } from "@/lib/visualizations/visualTable";

function squarify(items, width, height) {
  const sorted = [...items].filter((item) => item.weight > 0).sort((a, b) => b.weight - a.weight);
  const totalWeight = sorted.reduce((sum, item) => sum + item.weight, 0);
  if (!sorted.length || totalWeight <= 0 || width <= 0 || height <= 0) return [];
  const scale = (width * height) / totalWeight;
  const out = [];
  let x = 0;
  let y = 0;
  let w = width;
  let h = height;
  let row = [];
  let index = 0;
  const worst = (candidate, side) => {
    if (!candidate.length || side <= 0) return Infinity;
    const areas = candidate.map((item) => item.weight * scale);
    const sum = areas.reduce((a, b) => a + b, 0);
    const max = Math.max(...areas);
    const min = Math.min(...areas);
    const side2 = side * side;
    const sum2 = sum * sum;
    return Math.max((side2 * max) / sum2, sum2 / (side2 * min));
  };
  const layoutRow = (candidate, side, horizontal) => {
    const sum = candidate.reduce((total, item) => total + item.weight * scale, 0);
    const thickness = sum / side;
    let offset = 0;
    for (const item of candidate) {
      const length = (item.weight * scale) / thickness;
      out.push(
        horizontal
          ? { ...item, x: x + offset, y, w: length, h: thickness }
          : { ...item, x, y: y + offset, w: thickness, h: length },
      );
      offset += length;
    }
    if (horizontal) {
      y += thickness;
      h -= thickness;
    } else {
      x += thickness;
      w -= thickness;
    }
  };
  while (index < sorted.length) {
    const horizontal = w >= h;
    const side = horizontal ? w : h;
    const next = sorted[index];
    if (!row.length || worst([...row, next], side) <= worst(row, side)) {
      row.push(next);
      index += 1;
    } else {
      layoutRow(row, side, horizontal);
      row = [];
    }
  }
  if (row.length) layoutRow(row, w >= h ? w : h, w >= h);
  return out;
}

function text(record, ...keys) {
  for (const key of keys) {
    if (!key) continue;
    const value = record?.[key];
    if (value != null && String(value).trim() !== "") return String(value).trim();
  }
  return "";
}

/**
 * Tiles for a list of markets or events. Area is 24h volume, then total volume.
 * @param {object | null | undefined} sheet
 * @param {object | null | undefined} dataset
 */
export function volumeTreemapModel(sheet, dataset) {
  const fields = dataset?.fields || {};
  const records = sheetRecords(sheet);
  const tiles = [];
  records.forEach((record, index) => {
    const volume = parseVisualNumber(record?.[fields.value])
      ?? parseVisualNumber(record?.volume24hr)
      ?? parseVisualNumber(record?.["series:volume24hr"])
      ?? parseVisualNumber(record?.volume)
      ?? parseVisualNumber(record?.["series:volume"]);
    if (volume == null || volume <= 0) return;
    const label = text(record, fields.label, "question", "title", "series:title", "slug") || "Market";
    tiles.push({ row: index, label, value: volume });
  });
  tiles.sort((a, b) => b.value - a.value);
  const max = tiles[0]?.value || 1;
  return { tiles, max };
}

/**
 * Area still follows 24h volume. A series that would shrink to an empty strip
 * is parked in a labeled row under the large tiles.
 * @param {Array<{ weight: number, value?: number, label?: string }>} items
 * @param {number} width
 * @param {number} height
 */
export function layoutVolumeTiles(items, width, height) {
  const sorted = [...(items || [])].filter((item) => item.weight > 0).sort((a, b) => b.weight - a.weight);
  const total = sorted.reduce((sum, item) => sum + item.weight, 0);
  const area = width * height;
  if (!sorted.length || total <= 0 || area <= 0) return [];
  const labelArea = 64 * 32;
  const head = [];
  const tail = [];
  for (const item of sorted) {
    if ((item.weight / total) * area >= labelArea) head.push(item);
    else tail.push(item);
  }
  if (!tail.length || !head.length) return squarify(sorted, width, height);
  const columns = Math.max(1, Math.min(tail.length, Math.floor(width / 72) || 1));
  const rows = Math.ceil(tail.length / columns);
  const tailHeight = Math.min(height * 0.45, rows * 44);
  const headHeight = height - tailHeight - 2;
  if (headHeight < 48) return squarify(sorted, width, height);
  const headTiles = squarify(head, width, headHeight);
  const rowH = tailHeight / rows;
  const tailTiles = tail.map((item, index) => {
    const row = Math.floor(index / columns);
    const col = index % columns;
    const inRow = row === rows - 1 ? tail.length - row * columns : columns;
    const tileW = width / inRow;
    return {
      ...item,
      x: col * tileW,
      y: headHeight + 2 + row * rowH,
      w: tileW,
      h: rowH,
    };
  });
  return [...headTiles, ...tailTiles];
}
