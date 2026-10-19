"use client";

import { asDate } from "@/components/dashboardComposer/integrationRunSheets";
import { readyTradeSheet, usesHistoricalTradeSheet } from "@/components/dashboardComposer/fullTradeSheet";

export const SHEET_EXPORT_FORMATS = [
  { id: "csv", label: "CSV" },
  { id: "json", label: "JSON" },
  { id: "xlsx", label: "Excel (.xlsx)" },
];

export const IMAGE_EXPORT_FORMATS = [
  { id: "png", label: "PNG" },
  { id: "jpg", label: "JPG" },
  { id: "svg", label: "SVG" },
];

export function exportFileName(title, ext) {
  const slug = String(title || "")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, " ")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "-")
    .slice(0, 80);
  return `${slug || "lychee-export"}.${ext}`;
}

function columnLetter(index) {
  let name = "";
  let n = index + 1;
  while (n > 0) {
    const rem = (n - 1) % 26;
    name = String.fromCharCode(65 + rem) + name;
    n = Math.floor((n - 1) / 26);
  }
  return name;
}

function exportValue(value, column) {
  if (value == null || value === "") return "";
  if (column?.type === "date") {
    const date = asDate(value);
    return date ? date.toISOString() : String(value);
  }
  if (column?.type === "number" || typeof value === "number") {
    const n = Number(value);
    return Number.isFinite(n) ? n : String(value);
  }
  if (typeof value === "boolean") return value;
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

/** Headers and rows the way the sheet grid shows them: full trade rows, then records, then typed cells. */
export function sheetExportTable(block) {
  const columns = Array.isArray(block?.columns) ? block.columns : [];
  const titles = columns.map((column, index) => String(column?.title || "").trim() || columnLetter(index));

  const full = usesHistoricalTradeSheet(block) ? readyTradeSheet(block.id) : null;
  if (full) return { headers: titles, rows: full.rows.map((row) => titles.map((_, index) => row?.[index] ?? "")) };

  if (Array.isArray(block?.records) && block.records.length) {
    return {
      headers: titles,
      rows: block.records.map((record) => columns.map((column) => exportValue(record?.[String(column?.id || column?.name || "").trim()], column))),
    };
  }

  const cells = block?.cells || {};
  let maxCol = titles.length - 1;
  let maxRow = -1;
  for (const key of Object.keys(cells)) {
    if (cells[key] == null || cells[key] === "") continue;
    const [col, row] = String(key).split(",").map(Number);
    if (!Number.isFinite(col) || !Number.isFinite(row)) continue;
    maxCol = Math.max(maxCol, col);
    maxRow = Math.max(maxRow, row);
  }
  const headers = Array.from({ length: maxCol + 1 }, (_, index) => titles[index] || columnLetter(index));
  const rows = Array.from({ length: maxRow + 1 }, (_, row) => headers.map((_, col) => cells[`${col},${row}`] ?? ""));
  return { headers, rows };
}

function csvField(value) {
  const text = value == null ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function uniqueKeys(headers) {
  const seen = new Map();
  return headers.map((header) => {
    const count = seen.get(header) || 0;
    seen.set(header, count + 1);
    return count ? `${header} (${count + 1})` : header;
  });
}

function xlsxSheetName(title) {
  return String(title || "Sheet").replace(/[[\]:*?/\\]/g, " ").trim().slice(0, 31) || "Sheet";
}

function downloadUrl(url, filename) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  downloadUrl(url, filename);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportSheet(block, format) {
  const { headers, rows } = sheetExportTable(block);
  const filename = exportFileName(block?.title || "sheet", format);
  if (format === "csv") {
    const text = [headers, ...rows].map((line) => line.map(csvField).join(",")).join("\r\n");
    downloadBlob(new Blob([`\ufeff${text}`], { type: "text/csv;charset=utf-8" }), filename);
    return;
  }
  if (format === "json") {
    const keys = uniqueKeys(headers);
    const list = rows.map((row) => Object.fromEntries(keys.map((key, index) => [key, row[index] ?? ""])));
    downloadBlob(new Blob([JSON.stringify(list, null, 2)], { type: "application/json" }), filename);
    return;
  }
  if (format === "xlsx") {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([headers, ...rows]), xlsxSheetName(block?.title));
    XLSX.writeFile(workbook, filename, { compression: true });
    return;
  }
  throw new Error(`Unknown sheet export format: ${format}`);
}

const STILL_CLASS = "lychee-export-still";

// The snapshot copies computed styles, so an entrance animation would be captured at its first (invisible) frame.
function ensureStillStyle() {
  if (document.getElementById(STILL_CLASS)) return;
  const style = document.createElement("style");
  style.id = STILL_CLASS;
  style.textContent = `.${STILL_CLASS}, .${STILL_CLASS} * { animation: none !important; transition: none !important; }`;
  document.head.appendChild(style);
}

// SVG children are copied with their inline style as-is, and the snapshot renders at time zero, so a
// draw-on line (stroke-dashoffset 1 → 0) comes out empty. Finished animations stay off, which looks the same.
function stopInlineAnimations(node) {
  const restore = [];
  for (const el of node.querySelectorAll("[style*='animation']")) {
    const running = (el.getAnimations?.() || []).some((animation) => animation.playState !== "finished");
    const previous = el.style.animation;
    el.style.animation = "none";
    if (running) restore.push([el, previous]);
  }
  return () => restore.forEach(([el, previous]) => (el.style.animation = previous));
}

const PAINT_PROPERTIES = ["fill", "stroke", "stop-color", "flood-color", "lighting-color", "color"];
const VAR_PAINT_SELECTOR = [...PAINT_PROPERTIES.map((name) => `svg [${name}*='var(']`), "svg [style*='var(']"].join(",");

// SVG colours like stroke="var(--spectrum-series-3)" lose their variable in the snapshot and paint nothing.
function resolveSvgPaint(node) {
  const restore = [];
  for (const el of node.querySelectorAll(VAR_PAINT_SELECTOR)) {
    const computed = getComputedStyle(el);
    for (const name of PAINT_PROPERTIES) {
      const attr = el.getAttribute(name);
      if (attr?.includes("var(")) {
        el.setAttribute(name, computed.getPropertyValue(name));
        restore.push(() => el.setAttribute(name, attr));
      }
      const inline = el.style.getPropertyValue(name);
      if (inline.includes("var(")) {
        el.style.setProperty(name, computed.getPropertyValue(name));
        restore.push(() => el.style.setProperty(name, inline));
      }
    }
  }
  return () => restore.forEach((undo) => undo());
}

async function snapshot(node, format, options) {
  const { toJpeg, toPng, toSvg } = await import("html-to-image");
  if (format === "png") return toPng(node, options);
  if (format === "jpg") return toJpeg(node, { ...options, quality: 0.95 });
  if (format === "svg") return toSvg(node, options);
  throw new Error(`Unknown image export format: ${format}`);
}

/** Snapshot of a block's content (title bar included) as an image file. */
export async function exportNodeImage(node, format, title, { background } = {}) {
  if (!node) throw new Error("Nothing to export");
  ensureStillStyle();
  const restartAnimations = stopInlineAnimations(node);
  const restorePaint = resolveSvgPaint(node);
  node.classList.add(STILL_CLASS);
  try {
    const url = await snapshot(node, format, { cacheBust: true, pixelRatio: 2, backgroundColor: background });
    downloadUrl(url, exportFileName(title || "chart", format));
  } finally {
    restorePaint();
    restartAnimations();
    node.classList.remove(STILL_CLASS);
  }
}
