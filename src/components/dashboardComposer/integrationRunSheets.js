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
    if (Math.abs(n) >= 1000) {
      return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
    }
    return String(Math.round(n * 10000) / 10000);
  }
  return String(value);
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
 * Markets sit full width. The sheets created with them sit in two columns underneath,
 * the same full-then-split order as the Kalshi vs Polymarket odds board.
 */
export function layoutRunSheets(sheets, { originY = 88 } = {}) {
  const gap = 16;
  const x0 = 28;
  const halfW = 540;
  const fullW = halfW * 2 + gap;
  const fullH = 420;
  const halfH = 360;
  let y = originY;
  let col = 0;
  const blocks = [];

  sheets.forEach((sheet, index) => {
    const columns = (sheet.columns || []).map((column) => ({
      title: column.title || " ",
      width: columnWidth(column),
    }));
    const cells = {};
    (sheet.rows || []).forEach((row, rowIndex) => {
      (sheet.columns || []).forEach((column, columnIndex) => {
        const text = displayCell(row?.[column.id], column);
        if (text) cells[`${columnIndex},${rowIndex}`] = text;
      });
    });
    const full = sheet.span === "full";
    if (full && col) {
      y += halfH + gap;
      col = 0;
    }
    const block = {
      id: sheet.id || newId("run"),
      type: "sheet",
      source: "integration-run",
      x: full ? x0 : x0 + col * (halfW + gap),
      y,
      w: full ? fullW : halfW,
      h: full ? fullH : halfH,
      title: sheet.title || "Sheet",
      columns,
      cells,
    };
    blocks.push(block);
    if (full) y += fullH + gap;
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
