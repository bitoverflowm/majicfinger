/**
 * Map a dashboard sheet onto the realtime registry.
 * Charts follow the sheet they are attached to.
 */

import { getRealtimeEndpoint } from "@/lib/realtime/endpointRegistry";

/**
 * @param {object | null | undefined} block
 * @returns {import("./endpointRegistry").RealtimeEndpointDef | null}
 */
export function realtimeTargetForBlock(block) {
  if (!block || block.type !== "sheet") return null;
  const integration =
    block.integrationId ||
    block.provenance?.integrationId ||
    block.provenance?.lake ||
    "";
  const endpoint = block.table || block.provenance?.table || block.pull?.table || "";
  const def = getRealtimeEndpoint(integration, endpoint);
  return def?.enabled ? def : null;
}

/**
 * @param {object | null | undefined} block
 * @param {object[]} [blocks]
 * @returns {{ sheet: object, def: import("./endpointRegistry").RealtimeEndpointDef } | null}
 */
export function realtimeSheetForBlock(block, blocks = []) {
  if (!block) return null;
  const sheet =
    block.type === "chart"
      ? (blocks || []).find((item) => item.id === block.sourceSheetId && item.type === "sheet")
      : block.type === "sheet"
        ? block
        : null;
  if (!sheet) return null;
  const def = realtimeTargetForBlock(sheet);
  if (!def) return null;
  return { sheet, def };
}

/** Session key. Sheet ids can repeat across dashboard tabs. */
export function realtimeSessionKey(pageId, blockId) {
  return `${pageId || ""}:${blockId || ""}`;
}

/**
 * Sheets that are pulling, plus charts attached to those sheets.
 * `blocksByPage` is the canvas document. A flat block list is accepted for tests.
 *
 * @param {Record<string, object[]> | object[]} blocksByPage
 * @param {Record<string, { running?: boolean }>} realtimeById
 */
export function realtimeAssets(blocksByPage, realtimeById) {
  const pages = Array.isArray(blocksByPage)
    ? { "": blocksByPage }
    : blocksByPage || {};
  const assets = [];
  for (const [pageId, list] of Object.entries(pages)) {
    const blocks = Array.isArray(list) ? list : [];
    for (const sheet of blocks) {
      if (sheet?.type !== "sheet") continue;
      const key = realtimeSessionKey(pageId, sheet.id);
      if (!realtimeById?.[key]?.running && !realtimeById?.[sheet.id]?.running) continue;
      const def = realtimeTargetForBlock(sheet);
      assets.push({
        id: sheet.id,
        pageId,
        kind: "sheet",
        title: sheet.title || "Data sheet",
        detail: def?.title || "Live pull",
      });
      for (const chart of blocks) {
        if (chart?.type !== "chart" || chart.sourceSheetId !== sheet.id) continue;
        assets.push({
          id: chart.id,
          pageId,
          kind: "chart",
          title: chart.title || "Chart",
          detail: sheet.title || def?.title || "Live pull",
        });
      }
    }
  }
  return assets;
}

/** @param {object | null | undefined} block */
export function sheetMarketTicker(block) {
  const fromPull = String(block?.pull?.ticker || "").trim();
  if (fromPull) return fromPull;
  const fromJoin = String(block?.provenance?.join?.key || "").trim();
  if (fromJoin) return fromJoin;
  const fromColumn = firstColumnValue(block, ["ticker", "market_ticker"], /^(market )?ticker$/i);
  if (fromColumn) return fromColumn;
  const tail = String(block?.title || "")
    .split("·")
    .pop()
    ?.trim();
  if (tail && /^[A-Z0-9][A-Z0-9._-]{2,}$/.test(tail)) return tail;
  return "";
}

/**
 * Outcome tokens a Polymarket socket can subscribe with.
 * @param {object | null | undefined} block
 * @returns {string[]}
 */
export function sheetAssetIds(block) {
  const fromPull = Array.isArray(block?.pull?.tokens)
    ? block.pull.tokens.map((token) => String(token || "").trim()).filter(Boolean)
    : [];
  const columns = Array.isArray(block?.columns) ? block.columns : [];
  const indexes = columns
    .map((column, index) => ({ column, index }))
    .filter(({ column }) => /asset.?id|token/i.test(`${column?.id || ""} ${column?.title || ""}`))
    .map(({ index }) => index);
  const tokenIds = columns
    .filter((column) => /asset.?id|token/i.test(`${column?.id || ""} ${column?.title || ""}`))
    .map((column) => String(column?.id || "").trim())
    .filter(Boolean);
  const fromRecords = [];
  for (const row of Array.isArray(block?.records) ? block.records : []) {
    for (const id of tokenIds) {
      const text = String(row?.[id] || "").trim();
      if (!text) continue;
      if (text.includes(",")) fromRecords.push(...text.split(",").map((part) => part.trim()).filter(Boolean));
      else fromRecords.push(text);
    }
  }
  const fromCells = [];
  if (!fromRecords.length) {
    for (const index of indexes) {
      for (const [key, value] of Object.entries(block?.cells || {})) {
        if (Number(String(key).split(",")[0]) !== index) continue;
        const text = String(value || "").trim();
        if (!text) continue;
        if (text.includes(",")) fromCells.push(...text.split(",").map((part) => part.trim()).filter(Boolean));
        else fromCells.push(text);
      }
    }
  }
  return [...new Set([...fromPull, ...fromRecords, ...fromCells])].slice(0, 40);
}

/**
 * Symbols on a Chainlink or Binance sheet, limited to the registry list.
 * @param {object} block
 * @param {{ symbols?: string[] }} def
 * @returns {string[]}
 */
export function priceSymbolsForSheet(block, def) {
  const allowed = new Set((def?.symbols || []).map((symbol) => String(symbol).toLowerCase()));
  const columns = Array.isArray(block?.columns) ? block.columns : [];
  const index = columns.findIndex((column) => column?.id === "symbol" || /^symbol$/i.test(column?.title || ""));
  const found = [];
  const symbolId = index >= 0 ? String(columns[index]?.id || "").trim() : "";
  if (symbolId && Array.isArray(block?.records) && block.records.length) {
    for (const row of block.records) {
      const symbol = String(row?.[symbolId] || "").trim().toLowerCase();
      if (allowed.has(symbol)) found.push(symbol);
    }
  } else if (index >= 0) {
    for (const [key, value] of Object.entries(block?.cells || {})) {
      if (Number(String(key).split(",")[0]) !== index) continue;
      const symbol = String(value || "").trim().toLowerCase();
      if (allowed.has(symbol)) found.push(symbol);
    }
  }
  return found.length ? [...new Set(found)] : [...allowed];
}

/**
 * @param {object | null | undefined} block
 * @param {string[]} ids
 * @param {RegExp} titlePattern
 */
export function sheetField(block, ids, titlePattern) {
  return firstColumnValue(block, ids, titlePattern);
}

/**
 * @param {{ id?: string, title?: string, type?: string }[]} columns
 * @param {Record<string, unknown>[]} records
 */
export function cellsFromRecords(columns, records) {
  const cells = {};
  (records || []).forEach((record, rowIndex) => {
    (columns || []).forEach((column, columnIndex) => {
      const text = formatLiveCell(recordValue(record, column), column);
      if (text) cells[`${columnIndex},${rowIndex}`] = text;
    });
  });
  return cells;
}

/**
 * Update the price row for one symbol. Appends a row when the symbol is new.
 * @param {{ id?: string, title?: string }[]} columns
 * @param {Record<string, string>} cells
 * @param {{ symbol: string, price: unknown, at?: number }} quote
 */
export function patchPriceCells(columns, cells, quote) {
  const next = { ...(cells || {}) };
  const list = columns || [];
  const symbolCol = list.findIndex((column) => column?.id === "symbol" || /^symbol$/i.test(column?.title || ""));
  const priceCol = list.findIndex((column) => column?.id === "price" || /^price$/i.test(column?.title || ""));
  const timeCol = list.findIndex((column) => column?.id === "updated" || /updated|time/i.test(column?.title || ""));
  const nameCol = list.findIndex((column) => column?.id === "name" || /^name$/i.test(column?.title || ""));
  const wanted = String(quote?.symbol || "").trim().toLowerCase();
  if (!wanted) return next;
  let row = -1;
  if (symbolCol >= 0) {
    for (const [key, value] of Object.entries(next)) {
      if (Number(String(key).split(",")[0]) !== symbolCol) continue;
      if (String(value || "").trim().toLowerCase() === wanted) {
        row = Number(String(key).split(",")[1]);
        break;
      }
    }
  }
  if (row < 0) {
    row = maxRow(next) + 1;
    if (symbolCol >= 0) next[`${symbolCol},${row}`] = quote.symbol;
    if (nameCol >= 0 && !next[`${nameCol},${row}`]) next[`${nameCol},${row}`] = quote.symbol;
  }
  if (priceCol >= 0) next[`${priceCol},${row}`] = formatPrice(quote.price);
  if (timeCol >= 0 && quote.at) next[`${timeCol},${row}`] = new Date(quote.at).toLocaleTimeString();
  return next;
}

/**
 * Keep the newest rows so a chart attached to a live sheet follows the tail.
 * @param {Record<string, string>} cells
 * @param {number} [keep]
 */
function columnId(columns, ids, titlePattern) {
  const list = columns || [];
  const found = list.find((column) => {
    const id = String(column?.id || "");
    if (id && ids.includes(id)) return true;
    return titlePattern.test(String(column?.title || "").trim());
  });
  return String(found?.id || "").trim();
}

/** Same quote as patchPriceCells, stored as a number on the raw row. */
export function patchPriceRecords(columns, records, quote) {
  const list = (Array.isArray(records) ? records : []).map((row) => ({ ...(row || {}) }));
  const symbolId = columnId(columns, ["symbol"], /^symbol$/i);
  const priceId = columnId(columns, ["price"], /^price$/i);
  const timeId = columnId(columns, ["updated", "timestamp", "time"], /updated|time/i);
  const nameId = columnId(columns, ["name"], /^name$/i);
  const wanted = String(quote?.symbol || "").trim().toLowerCase();
  if (!wanted) return list;
  let index = symbolId
    ? list.findIndex((row) => String(row?.[symbolId] || "").trim().toLowerCase() === wanted)
    : -1;
  if (index < 0) {
    const row = {};
    if (symbolId) row[symbolId] = quote.symbol;
    if (nameId) row[nameId] = quote.symbol;
    list.push(row);
    index = list.length - 1;
  }
  const price = Number(quote?.price);
  if (priceId && Number.isFinite(price)) list[index][priceId] = price;
  if (timeId && quote?.at) list[index][timeId] = quote.at;
  return list;
}

/**
 * Append raw live rows after the protected history and keep the newest tail.
 * @param {object[]} existing
 * @param {object[]} added
 * @param {number} [cap]
 * @param {number} [protectThrough]
 */
export function appendLiveRecords(existing, added, cap = 120, protectThrough = -1) {
  const base = Array.isArray(existing) ? existing : [];
  const floor = Number(protectThrough);
  const headCount = Number.isFinite(floor) && floor >= 0 ? Math.min(base.length, floor + 1) : 0;
  const head = base.slice(0, headCount);
  const tail = base.slice(headCount).concat(Array.isArray(added) ? added : []);
  const limit = Math.max(0, Math.floor(Number(cap) || 0));
  return head.concat(tail.length > limit ? tail.slice(tail.length - limit) : tail);
}

/** Project live rows onto column ids, keeping numbers as numbers. */
export function liveRecordsFromRows(columns, rows) {
  return (Array.isArray(rows) ? rows : [])
    .map((row) => {
      const record = {};
      for (const column of columns || []) {
        const id = String(column?.id || "").trim();
        if (!id) continue;
        const value = recordValue(row, column);
        if (typeof value === "number" && Number.isFinite(value)) record[id] = value;
        else if (typeof value === "boolean") record[id] = value;
        else if (typeof value === "string" && value.trim()) record[id] = value;
      }
      return record;
    })
    .filter((record) => Object.keys(record).length > 0);
}

export function tailCells(cells, keep = 80) {
  const rows = new Set();
  for (const key of Object.keys(cells || {})) {
    const row = Number(String(key).split(",")[1]);
    if (Number.isFinite(row)) rows.add(row);
  }
  const ordered = [...rows].sort((a, b) => a - b);
  if (ordered.length <= keep) return cells || {};
  const kept = ordered.slice(-keep);
  const indexOf = new Map(kept.map((row, index) => [row, index]));
  const next = {};
  for (const [key, value] of Object.entries(cells || {})) {
    const [col, rowText] = String(key).split(",");
    const row = Number(rowText);
    if (!indexOf.has(row)) continue;
    next[`${col},${indexOf.get(row)}`] = value;
  }
  return next;
}

function firstColumnValue(block, ids, titlePattern) {
  const columns = Array.isArray(block?.columns) ? block.columns : [];
  const index = columns.findIndex((column) => {
    const id = String(column?.id || "");
    if (id && ids.includes(id)) return true;
    return titlePattern.test(String(column?.title || "").trim());
  });
  if (index < 0) return "";
  const id = String(columns[index]?.id || "").trim();
  const stored = id && Array.isArray(block?.records) ? block.records.find((row) => row && row[id] != null && row[id] !== "") : null;
  if (stored) return String(stored[id]).trim();
  return String(block?.cells?.[`${index},0`] || "").trim();
}

const FIELD_ALIASES = {
  token_id: ["asset_id", "assetId"],
  asset_id: ["token_id"],
  p: ["price", "last_trade_price"],
  price: ["p"],
  timestamp: ["time", "t"],
  time: ["timestamp"],
  side: ["last_trade_side"],
};

function recordValue(record, column) {
  if (!record || typeof record !== "object") return "";
  const id = String(column?.id || "");
  if (id && record[id] != null && record[id] !== "") return record[id];
  for (const key of FIELD_ALIASES[id] || []) {
    if (record[key] != null && record[key] !== "") return record[key];
  }
  const wanted = String(column?.title || "").trim().toLowerCase();
  if (!wanted) return "";
  for (const key of Object.keys(record)) {
    const label = key.replace(/_/g, " ").toLowerCase();
    if (label === wanted || titleCase(key).toLowerCase() === wanted) return record[key];
  }
  return "";
}

function titleCase(id) {
  return String(id)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatLiveCell(value, column) {
  if (value == null || value === "") return "";
  if (typeof value === "boolean" || column?.type === "boolean") return value === true || value === "true" ? "Yes" : "No";
  if (column?.type === "date" || column?.type === "timestamp") {
    const date = asDate(value);
    return date ? date.toLocaleString() : String(value);
  }
  if (typeof value === "number" || column?.type === "number") {
    const n = Number(value);
    if (!Number.isFinite(n)) return String(value);
    return formatPrice(n);
  }
  return String(value);
}

function formatPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return String(value ?? "");
  const digits = Math.abs(n) >= 100 ? 2 : 6;
  return n.toLocaleString("en", { maximumFractionDigits: digits });
}

function asDate(value) {
  const n = Number(value);
  if (Number.isFinite(n) && n > 1e9) {
    const ms = n > 1e16 ? n / 1e6 : n > 1e12 ? n : n * 1000;
    const date = new Date(ms);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function maxRow(cells) {
  let max = -1;
  for (const key of Object.keys(cells || {})) {
    const row = Number(String(key).split(",")[1]);
    if (Number.isFinite(row)) max = Math.max(max, row);
  }
  return max;
}

/**
 * Append live cells under the rows already on the sheet.
 * Rows at or below `protectThrough` stay. Only newer live rows are limited to `cap`.
 * @param {Record<string, string>} existing
 * @param {Record<string, string>} added
 * @param {number} [cap]
 * @param {number} [protectThrough]
 */
export function appendLiveCells(existing, added, cap = 120, protectThrough = -1) {
  const base = maxRow(existing) + 1;
  const next = { ...(existing || {}) };
  for (const [key, value] of Object.entries(added || {})) {
    if (value == null || value === "") continue;
    const [col, row] = String(key).split(",");
    next[`${col},${base + Number(row || 0)}`] = value;
  }
  const rows = [];
  for (const key of Object.keys(next)) {
    const index = Number(String(key).split(",")[1]);
    if (Number.isFinite(index) && !rows.includes(index)) rows.push(index);
  }
  rows.sort((a, b) => a - b);
  const floor = Number(protectThrough);
  const safeFloor = Number.isFinite(floor) ? floor : -1;
  const droppable = rows.filter((index) => index > safeFloor);
  const limit = Math.max(0, Math.floor(Number(cap) || 0));
  if (droppable.length <= limit) return next;
  const keepNew = new Set(droppable.slice(droppable.length - limit));
  const kept = {};
  for (const [key, value] of Object.entries(next)) {
    const index = Number(String(key).split(",")[1]);
    if (index <= safeFloor || keepNew.has(index)) kept[key] = value;
  }
  return kept;
}
