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

/**
 * IndexedDB copies values on the main thread, about 3 seconds for 500k rows in one go.
 * Rows go in chunks with a pause between, so the page keeps responding.
 */
const CHUNK_ROWS = 10000;

const pause = () => new Promise((resolve) => window.setTimeout(resolve, 0));

const chunkKey = (key, index) => `${key}#${index}`;

async function writeRecords(key, block) {
  const records = block.records;
  const chunks = Math.ceil(records.length / CHUNK_ROWS);
  // No entry while chunks are mid-write, so a reload never reads half old, half new rows.
  await put(key, null);
  for (let index = 0; index < chunks; index += 1) {
    if (written.get(key) !== records) return;
    await put(chunkKey(key, index), records.slice(index * CHUNK_ROWS, (index + 1) * CHUNK_ROWS));
    await pause();
  }
  if (written.get(key) !== records) return;
  await put(key, {
    pulledAt: Number(block.pulledAt) || 0,
    columns: columnsKey(block.columns),
    rows: records.length,
    bytes: records.length * bytesPerRow(records),
    chunks,
  });
}

async function readRecords(entry, key) {
  if (Array.isArray(entry.records)) return entry.records;
  const out = [];
  for (let index = 0; index < (entry.chunks || 0); index += 1) {
    const part = await get(chunkKey(key, index));
    if (!Array.isArray(part)) return null;
    for (const row of part) out.push(row);
    await pause();
  }
  return out.length === entry.rows ? out : null;
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
        void writeRecords(key, block);
      }, 1500),
    );
  }
}

/** Full rows for a sheet the dashboard saved short, when this browser kept them from the same pull. */
export async function restoreSheetRecords(owner, pageId, block) {
  if (!owner || !Array.isArray(block?.records)) return null;
  const key = cacheKey(owner, pageId, block.id);
  const entry = await get(key);
  if (!entry) return null;
  if (entry.pulledAt !== (Number(block.pulledAt) || 0) || entry.columns !== columnsKey(block.columns)) return null;
  const rows = Array.isArray(entry.records) ? entry.records.length : entry.rows || 0;
  if (rows <= block.records.length) return null;
  const records = await readRecords(entry, key);
  if (!records) return null;
  written.set(key, records);
  return records;
}

/** Drops every sheet this browser kept for a tab. Resolves to the bytes freed. */
export async function forgetSheetRecords(owner, pageId) {
  if (!owner || !pageId) return 0;
  const prefix = cacheKey(owner, pageId, "");
  for (const key of [...written.keys()]) {
    if (!key.startsWith(prefix)) continue;
    written.delete(key);
    window.clearTimeout(timers.get(key));
    timers.delete(key);
  }
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      let bytes = 0;
      const tx = db.transaction("sheets", "readwrite");
      const store = tx.objectStore("sheets");
      const request = store.openCursor(IDBKeyRange.bound(prefix, `${prefix}\uffff`));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        const value = cursor.value;
        if (value && !Array.isArray(value)) {
          bytes += Number(value.bytes) || (Array.isArray(value.records) ? value.records.length * bytesPerRow(value.records) : 0);
        }
        cursor.delete();
        cursor.continue();
      };
      tx.oncomplete = () => resolve(bytes);
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    return 0;
  }
}

/** Roughly what a tab's blocks take up, without serializing big sheets. */
export function estimateBlocksBytes(blocks) {
  let bytes = 0;
  for (const block of Array.isArray(blocks) ? blocks : []) {
    if (!block || typeof block !== "object") continue;
    const records = sheetRecords(block);
    const { records: _records, cells, ...rest } = block;
    try {
      bytes += JSON.stringify(rest).length;
    } catch {
      // A block that cannot serialize adds nothing.
    }
    if (records) bytes += records.length * bytesPerRow(records);
    else if (cells && typeof cells === "object") bytes += JSON.stringify(cells).length;
  }
  return bytes;
}
