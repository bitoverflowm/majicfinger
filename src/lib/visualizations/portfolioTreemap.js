import { changeColor } from "@/components/spectrumui/charts/heatmapColors";
import { sheetRecords } from "@/lib/visualizations/datasetDescriptor";

function num(value) {
  const n = Number(String(value ?? "").trim().replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

function rowIndexes(sheet) {
  const cells = sheet?.cells && typeof sheet.cells === "object" ? sheet.cells : {};
  const rows = new Set();
  for (const key of Object.keys(cells)) {
    const row = Number(String(key).split(",")[1]);
    if (Number.isFinite(row)) rows.add(row);
  }
  return [...rows].sort((a, b) => a - b);
}

function positionLabel(record, fields) {
  const market = String(record?.[fields?.label] ?? "").trim();
  const outcome = String(record?.[fields?.outcome] ?? "").trim();
  if (market && outcome && outcome.toLowerCase() !== market.toLowerCase()) return `${market} · ${outcome}`;
  return market || outcome || "Position";
}

/** Signed unrealized P&L kept to four decimal places. */
export function formatPnl4(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  const body = Math.abs(n).toFixed(4);
  if (n < 0) return `−${body}`;
  if (n > 0) return `+${body}`;
  return body;
}

/**
 * Color scale cap from the positions that actually take tile area.
 * A zero-value row can hold most of the loss without stretching every other tile to gray.
 * @param {{ pnl: number | null }[]} tiles
 */
export function pnlColorCap(tiles) {
  let cap = 0;
  for (const tile of tiles || []) {
    if (Number.isFinite(tile?.pnl)) cap = Math.max(cap, Math.abs(tile.pnl));
  }
  return cap > 0 ? cap : 1;
}

/**
 * Neutral-centered fill. Tiny moves stay near the flat color; larger moves saturate.
 * @param {number | null} pnl
 * @param {number} cap
 * @param {{ up?: string, down?: string, flat?: string }} [palette]
 */
export function pnlFill(pnl, cap, palette) {
  if (!Number.isFinite(pnl)) return changeColor(0, cap || 1, palette);
  return changeColor(pnl, cap || 1, palette);
}

/**
 * @param {{ pnl: number | null }[]} zeros
 */
export function zeroValueSummary(zeros) {
  const list = zeros || [];
  if (!list.length) return "";
  const sum = list.reduce((total, item) => total + (Number.isFinite(item.pnl) ? item.pnl : 0), 0);
  const noun = list.length === 1 ? "position" : "positions";
  return `${list.length} zero-value ${noun} · ${formatPnl4(sum)} USDC unrealized P&L`;
}

/**
 * Split a trader-positions sheet into treemap tiles and zero-value rows.
 * Current value sizes the tile. A non-positive value gets no area.
 * @param {object | null | undefined} sheet
 * @param {object | null | undefined} dataset
 */
export function positionTreemapModel(sheet, dataset) {
  const fields = dataset?.fields || {};
  const records = sheetRecords(sheet);
  const indexes = rowIndexes(sheet);
  /** @type {{ row: number, label: string, value: number, pnl: number | null }[]} */
  const tiles = [];
  /** @type {{ row: number, label: string, value: number, pnl: number | null }[]} */
  const zeros = [];
  records.forEach((record, index) => {
    const value = num(record[fields.value]);
    const pnl = num(record[fields.pnl]);
    const item = {
      row: indexes[index] ?? index,
      label: positionLabel(record, fields),
      value: value ?? 0,
      pnl,
    };
    if (value != null && value > 0) tiles.push(item);
    else zeros.push(item);
  });
  tiles.sort((a, b) => b.value - a.value);
  return {
    tiles,
    zeros,
    cap: pnlColorCap(tiles),
    summary: zeroValueSummary(zeros),
  };
}
