import { stampDataset } from "@/lib/visualizations/datasetDescriptor";

function asDate(value) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (Number.isFinite(n) && n > 1e9) {
    const ms = n > 1e16 ? n / 1e6 : n > 1e12 ? n : n * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function displayCell(value, column) {
  const type = column?.type;
  if (value == null || value === "") return "";
  if (type === "boolean") return value === true || value === "true" || value === "True" ? "Yes" : "No";
  if (type === "date") {
    const date = asDate(value);
    return date ? date.toLocaleString() : String(value);
  }
  if (type === "number") {
    let n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    if (column.scale === "cents") return `${Math.round(n)}¢`;
    // Unix seconds (the price-history T column) sit near 1.8 billion. Compact
    // notation rounds every point in a multi-year window to the same "1.8B".
    if (column.exact || column.id === "t") return Number.isInteger(n) ? String(n) : String(Math.round(n * 10000) / 10000);
    if (Math.abs(n) >= 1000) {
      return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
    }
    return String(Math.round(n * 10000) / 10000);
  }
  return String(value);
}

export function displayMatrix(columns, rows) {
  return (rows || []).map((row) => (columns || []).map((column) => displayCell(row?.[column.id], column)));
}

/** Values keyed by column id. Numbers, booleans, and strings stay as returned by the pull. */
export function recordsFromRows(columns, rows) {
  const ids = (Array.isArray(columns) ? columns : []).map((column) => String(column?.id || "").trim());
  return (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const record = {};
      ids.forEach((id) => {
        if (!id || !row || typeof row !== "object") return;
        const value = row[id];
        if (typeof value === "number" && Number.isFinite(value)) record[id] = value;
        else if (typeof value === "boolean") record[id] = value;
        else if (typeof value === "string" && value.trim()) record[id] = value;
      });
      return record;
    })
    .filter((record) => Object.keys(record).length > 0);
}

export function sheetRecords(columns, rows) {
  return (rows || []).map((row) => {
    const record = {};
    for (const column of columns || []) {
      record[column.title || column.id] = displayCell(row?.[column.id], column);
    }
    return record;
  });
}

function columnWidth(column) {
  if (column?.id === "__function") return 220;
  if (column?.id === "title" || column?.id === "question") return 240;
  if (column?.type === "date") return 168;
  return 128;
}

function newId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/**
 * A pull keeps every sheet already on the tab. When this run asks for an id
 * that is already there, the new sheet gets the next free suffix. Later
 * updates in the same run keep the suffix they were given.
 * @param {string} id
 * @param {Set<string>} occupied ids on the tab before this run
 * @param {Map<string, string>} claimed ids assigned during this run
 */
export function claimSheetId(id, occupied, claimed) {
  const raw = String(id || "").trim();
  if (!raw) return raw;
  if (claimed.has(raw)) return claimed.get(raw);
  const used = (value) => occupied.has(value) || [...claimed.values()].includes(value);
  let next = raw;
  if (used(next)) {
    let n = 2;
    while (used(`${raw}-${n}`)) n += 1;
    next = `${raw}-${n}`;
  }
  claimed.set(raw, next);
  return next;
}

/**
 * Markets sit full width. The sheets created with them sit in two columns underneath,
 * the same full-then-split order as the Kalshi vs Polymarket odds board.
 * Event joins pass `branch`: 1 is that event's markets, 2 is the market tables under them.
 */
export function layoutRunSheets(sheets, { originY = 88 } = {}) {
  const gap = 16;
  const x0 = 28;
  const halfW = 540;
  const fullW = halfW * 2 + gap;
  const fullH = 420;
  const halfH = 360;
  const nest = 36;
  let y = originY;
  let col = 0;
  const blocks = [];

  const flushRow = () => {
    if (!col) return;
    y += halfH + gap;
    col = 0;
  };

  sheets.forEach((sheet, index) => {
    const columns = (sheet.columns || []).map((column) => ({
      ...(column.id ? { id: column.id } : {}),
      title: column.title || " ",
      width: columnWidth(column),
      ...(column.type ? { type: column.type } : {}),
      ...(column.scale ? { scale: column.scale } : {}),
    }));
    const previewRows = sheet.keepAllRows ? sheet.rows || [] : (sheet.rows || []).slice(0, 50);
    const records = recordsFromRows(sheet.columns, previewRows);
    const cells = {};
    const rowCount = Math.max(previewRows.length, Math.floor(Number(sheet.rowCount) || 0), (sheet.rows || []).length);
    if (!records.length) {
      previewRows.forEach((row, rowIndex) => {
        (sheet.columns || []).forEach((column, columnIndex) => {
          const text = displayCell(row?.[column.id], column);
          if (text) cells[`${columnIndex},${rowIndex}`] = text;
        });
      });
    }
    const branch = sheet.branch === 3 ? 3 : sheet.branch === 2 ? 2 : sheet.branch === 1 ? 1 : 0;
    const full = branch === 0 && sheet.span === "full";
    const previousBranch = blocks[blocks.length - 1]?.branch;
    const continuesRow = col === 1 && previousBranch === branch && ((branch === 0 && !full) || branch === 2 || branch === 3);
    if (!continuesRow) flushRow();
    const described = stampDataset({ ...sheet, type: "sheet" });
    const depth = branch === 3 ? 3 : branch === 2 ? 2 : branch === 1 ? 1 : 0;
    const inset = nest * depth;
    const childW = Math.max(280, Math.floor((fullW - inset - gap) / 2));
    const block = {
      id: sheet.id || newId("run"),
      type: "sheet",
      source: "integration-run",
      branch,
      x: branch === 0 ? (full ? x0 : x0 + col * (halfW + gap)) : branch === 1 ? x0 + nest : x0 + inset + col * (childW + gap),
      y,
      w: branch === 0 ? (full ? fullW : halfW) : branch === 1 ? fullW - nest : childW,
      h: branch === 1 || full ? fullH : halfH,
      title: sheet.title || "Sheet",
      columns,
      cells,
      ...(records.length ? { records } : {}),
      ...(rowCount ? { rowCount } : {}),
      ...(sheet.integrationId ? { integrationId: sheet.integrationId } : {}),
      ...(sheet.table ? { table: sheet.table } : {}),
      ...(described.dataset ? { dataset: described.dataset } : {}),
      ...(sheet.pull ? { pull: sheet.pull } : {}),
      ...(sheet.query ? { query: sheet.query } : {}),
      ...(sheet.provenance ? { provenance: sheet.provenance } : {}),
      pulledAt: Number(sheet.pulledAt) || Date.now(),
    };
    blocks.push(block);
    if (branch === 1 || full) y += fullH + gap;
    else {
      col += 1;
      if (col > 1) {
        col = 0;
        y += halfH + gap;
      }
    }
    if (index === sheets.length - 1 && col === 1) y += halfH;
  });

  return blocks;
}

const CHART_GAP = 16;
const CHART_X0 = 28;
const CHART_RIGHT = 28 + 540 * 2 + 16;

/**
 * Keep each run sheet where `layoutRunSheets` put it, then open its default
 * charts in a band underneath that row. Later rows move down by the band.
 * `holdSheetId` leaves that sheet's charts out so the sheet can arrive first.
 * @param {object[]} sheetBlocks
 * @param {Map<string, object[]>} chartsBySheetId
 * @param {{ holdSheetId?: string }} [options]
 */
export function layoutRunCharts(sheetBlocks, chartsBySheetId, options = {}) {
  const holdSheetId = options.holdSheetId || "";
  const ordered = [...(sheetBlocks || [])].sort((a, b) => (a.y || 0) - (b.y || 0) || (a.x || 0) - (b.x || 0));
  /** @type {Array<{ y: number, sheets: object[] }>} */
  const rows = [];
  for (const sheet of ordered) {
    const last = rows[rows.length - 1];
    if (last && Math.abs(last.y - (sheet.y || 0)) < 2) last.sheets.push(sheet);
    else rows.push({ y: sheet.y || 0, sheets: [sheet] });
  }
  let shift = 0;
  /** @type {object[]} */
  const sheets = [];
  /** @type {object[]} */
  const charts = [];
  for (const row of rows) {
    const rowSheets = row.sheets.map((sheet) => ({ ...sheet, y: (sheet.y || 0) + shift }));
    sheets.push(...rowSheets);
    const rowBottom = rowSheets.reduce((max, sheet) => Math.max(max, (sheet.y || 0) + (sheet.h || 0)), 0);
    /** @type {object[]} */
    const rowCharts = [];
    for (const sheet of rowSheets) {
      if (sheet.id === holdSheetId) continue;
      rowCharts.push(...(chartsBySheetId.get(sheet.id) || []));
    }
    if (!rowCharts.length) continue;
    let x = CHART_X0;
    let y = rowBottom + CHART_GAP;
    let rowH = 0;
    for (const chart of rowCharts) {
      const w = Math.min(chart.w || 540, CHART_RIGHT - CHART_X0);
      const h = chart.h || 360;
      if (x > CHART_X0 && x + w > CHART_RIGHT + 1) {
        y += rowH + CHART_GAP;
        x = CHART_X0;
        rowH = 0;
      }
      charts.push({ ...chart, x, y, w, h });
      x += w + CHART_GAP;
      rowH = Math.max(rowH, h);
    }
    shift += y + rowH - rowBottom;
  }
  return { sheets, charts };
}
