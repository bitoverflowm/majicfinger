import { sheetRecords } from "@/lib/visualizations/datasetDescriptor";
import { formatShares, formatUsd, parseVisualNumber } from "@/lib/visualizations/visualTable";

/** Kalshi lake volume counts contracts. Every other catalog volume is dollars. */
export function volumeInContracts(dataset) {
  return dataset?.units?.volume === "contracts";
}

/**
 * @param {number} value
 * @param {object | null | undefined} dataset
 */
export function formatVolume(value, dataset) {
  return volumeInContracts(dataset) ? formatShares(value) : formatUsd(value);
}

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
 * Name of the volume a list is sized by. Lake markets only carry lifetime volume.
 * @param {object | null | undefined} dataset
 */
export function volumeLabel(dataset) {
  const field = String(dataset?.fields?.value || "volume24hr");
  return /24h|24hr|_24/i.test(field) ? "24h volume" : "Volume";
}

/**
 * Readable name for a catalog row. `fields.name` is preferred when the label is an id, as Kalshi tickers are.
 * @param {Record<string, unknown>} record
 * @param {Record<string, string>} fields
 */
export function catalogRowName(record, fields = {}) {
  return text(record, fields.name, fields.label, "question", "title", "series:title", "slug");
}

/**
 * Tiles for a list of markets or events. Area is 24h volume, then total volume.
 * Markets with no volume yet stay in the list, so a fresh pull still shows every market.
 * A list with no 24h volume at all, like a closed event, is sized by total volume instead (`basis: "total"`).
 * @param {object | null | undefined} sheet
 * @param {object | null | undefined} dataset
 */
export function volumeTreemapModel(sheet, dataset) {
  const fields = dataset?.fields || {};
  const records = sheetRecords(sheet);
  const build = (valueOf) => {
    const tiles = [];
    records.forEach((record, index) => {
      const volume = valueOf(record);
      if (volume == null || volume < 0) return;
      const label = catalogRowName(record, fields) || "Market";
      const id = text(record, fields.label);
      tiles.push({ row: index, label, value: volume, ...(id && id !== label ? { detail: id } : {}) });
    });
    tiles.sort((a, b) => b.value - a.value);
    return tiles;
  };
  let tiles = build(
    (record) =>
      parseVisualNumber(record?.[fields.value])
      ?? parseVisualNumber(record?.volume24hr)
      ?? parseVisualNumber(record?.["series:volume24hr"])
      ?? parseVisualNumber(record?.volume)
      ?? parseVisualNumber(record?.["series:volume"]),
  );
  let basis = "";
  if (fields.total && fields.total !== fields.value && tiles.length && !tiles.some((tile) => tile.value > 0)) {
    const totals = build((record) => parseVisualNumber(record?.[fields.total]));
    if (totals.some((tile) => tile.value > 0)) {
      tiles = totals;
      basis = "total";
    }
  }
  const max = tiles[0]?.value || 1;
  return { tiles, max, ...(basis ? { basis } : {}) };
}

/**
 * Area still follows 24h volume. A series that would shrink to an empty strip,
 * or has no volume yet, is parked in a labeled row under the large tiles.
 * When nothing has traded, every item gets an equal tile.
 * @param {Array<{ weight: number, value?: number, label?: string }>} items
 * @param {number} width
 * @param {number} height
 */
export function layoutVolumeTiles(items, width, height) {
  const listed = [...(items || [])].filter((item) => Number.isFinite(item.weight) && item.weight >= 0);
  const area = width * height;
  if (!listed.length || area <= 0) return [];
  if (listed.every((item) => item.weight === 0)) {
    return squarify(listed.map((item) => ({ ...item, weight: 1 })), width, height);
  }
  const sorted = listed.sort((a, b) => b.weight - a.weight);
  const total = sorted.reduce((sum, item) => sum + item.weight, 0);
  const labelArea = 64 * 32;
  const head = [];
  const tail = [];
  for (const item of sorted) {
    if ((item.weight / total) * area >= labelArea) head.push(item);
    else tail.push(item);
  }
  const floored = sorted.map((item) => (item.weight > 0 ? item : { ...item, weight: total * 0.002 }));
  if (!tail.length || !head.length) return squarify(floored, width, height);
  const columns = Math.max(1, Math.min(tail.length, Math.floor(width / 72) || 1));
  const rows = Math.ceil(tail.length / columns);
  const tailHeight = Math.min(height * 0.45, rows * 44);
  const headHeight = height - tailHeight - 2;
  if (headHeight < 48) return squarify(floored, width, height);
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
