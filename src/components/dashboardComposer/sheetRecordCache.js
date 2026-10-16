"use client";

/** Rows one sheet may keep in the saved dashboard. */
export const SAVED_SHEET_ROWS = 10000;
/** Every tab saves in one request, and the server takes 16 MB. */
const SAVED_ROWS_BYTES = 6 * 1024 * 1024;
const PREVIEW_ROWS = 50;

const rowBytes = new WeakMap();
const slices = new WeakMap();

function bytesPerRow(records) {
  const known = rowBytes.get(records);
  if (known) return known;
  const sample = records.slice(0, 20);
  const size = Math.max(16, Math.ceil(JSON.stringify(sample).length / Math.max(1, sample.length)));
  rowBytes.set(records, size);
  return size;
}

function leadingRows(records, rows) {
  const known = slices.get(records);
  if (known?.rows === rows) return known.slice;
  const slice = records.slice(0, rows);
  slices.set(records, { rows, slice });
  return slice;
}

function sheetRecords(block) {
  return block?.type === "sheet" && Array.isArray(block.records) && block.records.length ? block.records : null;
}

/**
 * Small sheets save whole first. Big ones keep as many leading rows as the budget allows,
 * and `trimmed` lists them so the full rows can stay in this browser.
 */
export function savedBlocksByPage(blocksByPage) {
  const sized = [];
  for (const list of Object.values(blocksByPage || {})) {
    for (const block of Array.isArray(list) ? list : []) {
      const records = sheetRecords(block);
      if (!records) continue;
      sized.push({ block, rows: Math.min(records.length, SAVED_SHEET_ROWS), per: bytesPerRow(records) });
    }
  }
  sized.sort((a, b) => a.rows * a.per - b.rows * b.per);
  const keep = new Map();
  let used = 0;
  for (const item of sized) {
    const room = Math.max(0, SAVED_ROWS_BYTES - used);
    const rows = Math.max(Math.min(item.rows, PREVIEW_ROWS), Math.min(item.rows, Math.floor(room / item.per)));
    used += rows * item.per;
    if (rows < item.block.records.length) keep.set(item.block, rows);
  }
  if (!keep.size) return { blocksByPage, trimmed: [] };
  const out = {};
  const trimmed = [];
  for (const [page, list] of Object.entries(blocksByPage)) {
    if (!Array.isArray(list)) {
      out[page] = list;
      continue;
    }
    out[page] = list.map((block) => {
      const rows = keep.get(block);
      if (rows == null) return block;
      trimmed.push({ pageId: page, block });
      return { ...block, records: leadingRows(block.records, rows) };
    });
  }
  return { blocksByPage: out, trimmed };
}

/** The server drops a table's rows when its sheet has records, so they never need to travel. */
export function savedTables(tables, blocksByPage) {
  const withRecords = new Set();
  for (const list of Object.values(blocksByPage || {})) {
    for (const block of Array.isArray(list) ? list : []) {
      if (sheetRecords(block)) withRecords.add(block.id);
    }
  }
  return (Array.isArray(tables) ? tables : []).map((table) => {
    const rows = Array.isArray(table?.rows) ? table.rows : null;
    if (!rows) return table;
    const cap = withRecords.has(table.id) ? 0 : PREVIEW_ROWS;
    return rows.length > cap ? { ...table, rows: rows.slice(0, cap) } : table;
  });
}

function columnsKey(columns) {
  return (columns || []).map((column) => column?.id || "").join("\0");
}

function cacheKey(owner, pageId, id) {
  return `${owner}:${pageId}:${id}`;
}

let dbPromise = null;

function openDb() {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("No IndexedDB"));
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open("lycheeSheetRecords", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("sheets");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }).catch((error) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

async function put(key, value) {
  try {
    const db = await openDb();
    await new Promise((resolve, reject) => {
      const tx = db.transaction("sheets", "readwrite");
      tx.objectStore("sheets").put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // The saved dashboard still has the leading rows.
  }
}

async function get(key) {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const request = db.transaction("sheets", "readonly").objectStore("sheets").get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

const written = new Map();
const timers = new Map();

/** Realtime can replace records every tick, so writes wait for the sheet to settle. */
export function rememberSheetRecords(owner, trimmed) {
  if (!owner) return;
  for (const { pageId, block } of trimmed || []) {
    const key = cacheKey(owner, pageId, block.id);
    if (written.get(key) === block.records) continue;
    written.set(key, block.records);
    window.clearTimeout(timers.get(key));
    timers.set(
      key,
      window.setTimeout(() => {
        timers.delete(key);
        void put(key, {
          pulledAt: Number(block.pulledAt) || 0,
          columns: columnsKey(block.columns),
          records: block.records,
        });
      }, 1500),
    );
  }
}

/** Full rows for a sheet the dashboard saved short, when this browser kept them from the same pull. */
export async function restoreSheetRecords(owner, pageId, block) {
  if (!owner || !Array.isArray(block?.records)) return null;
  const key = cacheKey(owner, pageId, block.id);
  const entry = await get(key);
  if (!entry || !Array.isArray(entry.records)) return null;
  if (entry.pulledAt !== (Number(block.pulledAt) || 0) || entry.columns !== columnsKey(block.columns)) return null;
  if (entry.records.length <= block.records.length) return null;
  written.set(key, entry.records);
  return entry.records;
}
