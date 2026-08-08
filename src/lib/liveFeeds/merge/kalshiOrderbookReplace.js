/**
 * Replace Kalshi orderbook sheets with a full snapshot each tick.
 * Levels appear/disappear; key flash by ticker|side|price_dollars.
 */

import { coerceDataTypes } from "@/lib/coerceDataTypes";
import { shouldApplyLiveCell } from "@/lib/liveFeeds/merge/kalshiCandlestickUpsert";

/**
 * @param {Record<string, unknown> | null | undefined} row
 * @returns {string | null}
 */
export function liveOrderbookRowKey(row) {
  if (!row || typeof row !== "object") return null;
  const ticker = String(row.ticker || "").trim().toUpperCase();
  const side = String(row.side || "").trim().toLowerCase();
  const price = Number(row.price_dollars);
  if (!ticker || (side !== "yes" && side !== "no") || !Number.isFinite(price)) return null;
  return `ob:${ticker}|${side}|${price}`;
}

/**
 * @param {unknown} a
 * @param {unknown} b
 */
function liveCellEqual(a, b) {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  if (typeof a === "number" || typeof b === "number") {
    const na = Number(a);
    const nb = Number(b);
    if (Number.isFinite(na) && Number.isFinite(nb)) return na === nb;
  }
  return String(a) === String(b);
}

/**
 * @param {Record<string, unknown>[]} existing
 * @param {Record<string, unknown>[]} incoming
 * @returns {Record<string, { isNew: boolean, columns?: string[] }>}
 */
export function buildOrderbookLiveFlashRows(existing, incoming) {
  /** @type {Map<string, Record<string, unknown>>} */
  const byKey = new Map();
  for (const row of Array.isArray(existing) ? existing : []) {
    const key = liveOrderbookRowKey(row);
    if (key) byKey.set(key, row);
  }

  /** @type {Record<string, { isNew: boolean, columns?: string[] }>} */
  const rows = {};
  for (const row of Array.isArray(incoming) ? incoming : []) {
    const key = liveOrderbookRowKey(row);
    if (!key) continue;
    const prev = byKey.get(key);
    if (!prev) {
      rows[key] = { isNew: true };
      continue;
    }
    /** @type {string[]} */
    const columns = [];
    for (const [field, value] of Object.entries(row)) {
      if (field === "_origIndex") continue;
      if (!shouldApplyLiveCell(value, prev[field])) continue;
      if (!liveCellEqual(prev[field], value)) columns.push(field);
    }
    if (columns.length) rows[key] = { isNew: false, columns };
  }
  return rows;
}

/**
 * Sort orderbook levels: side (yes then no), then level_index, then price.
 * @param {Record<string, unknown>[]} rows
 * @param {{ softRowCap?: number }} [opts]
 */
export function normalizeOrderbookSnapshotRows(rows, opts = {}) {
  const softRowCap = Math.floor(Number(opts.softRowCap)) || 500;
  let next = (Array.isArray(rows) ? rows : []).map((row) => ({ ...row }));
  next.sort((a, b) => {
    const sa = String(a.side || "");
    const sb = String(b.side || "");
    if (sa !== sb) return sa === "yes" ? -1 : sa === "no" ? 1 : sa.localeCompare(sb);
    const ia = Number(a.level_index);
    const ib = Number(b.level_index);
    if (Number.isFinite(ia) && Number.isFinite(ib) && ia !== ib) return ia - ib;
    return Number(a.price_dollars) - Number(b.price_dollars);
  });
  if (next.length > softRowCap) next = next.slice(0, softRowCap);
  return next;
}

/**
 * @param {Record<string, unknown>[]} existing
 * @param {Record<string, unknown>[]} incoming
 */
function countOrderbookReplaceChanges(existing, incoming) {
  /** @type {Set<string>} */
  const prevKeys = new Set();
  for (const row of Array.isArray(existing) ? existing : []) {
    const key = liveOrderbookRowKey(row);
    if (key) prevKeys.add(key);
  }
  let received = 0;
  let added = 0;
  let updated = 0;
  let removed = 0;
  /** @type {Set<string>} */
  const nextKeys = new Set();
  for (const row of Array.isArray(incoming) ? incoming : []) {
    const key = liveOrderbookRowKey(row);
    if (!key) continue;
    received += 1;
    nextKeys.add(key);
    if (prevKeys.has(key)) updated += 1;
    else added += 1;
  }
  for (const key of prevKeys) {
    if (!nextKeys.has(key)) removed += 1;
  }
  return { received, added, updated, removed };
}

/**
 * Apply an orderbook snapshot tick onto a dataSheets map (one sheet per ticker).
 *
 * @param {Record<string, object>} dataSheets
 * @param {{ sheets?: { marketSheetIdsByTicker?: Record<string, string> } }} feed
 * @param {{ byMarket: { ticker: string; rows: Record<string, unknown>[] }[] }} tick
 * @param {{ softRowCap?: number }} [opts]
 */
export function applyKalshiOrderbookReplaceToSheets(dataSheets, feed, tick, opts = {}) {
  const softRowCap = opts.softRowCap ?? 500;
  const next = { ...(dataSheets || {}) };
  const revision = Date.now();

  let marketsMatched = 0;
  let marketsUnmatched = 0;
  let levelsReceived = 0;
  let levelsAdded = 0;
  let levelsUpdated = 0;
  let levelsRemoved = 0;

  const markets = Array.isArray(tick.byMarket) ? tick.byMarket : [];
  for (const market of markets) {
    const ticker = String(market.ticker || "").trim().toUpperCase();
    const sheetId = String(feed?.sheets?.marketSheetIdsByTicker?.[ticker] || "").trim();
    const sheet = sheetId ? next[sheetId] : null;
    if (!sheetId || !sheet) {
      marketsUnmatched += 1;
      continue;
    }
    marketsMatched += 1;
    const existing = Array.isArray(sheet.data) ? sheet.data : [];
    const incoming = coerceDataTypes(Array.isArray(market.rows) ? market.rows : []);
    const snapshot = normalizeOrderbookSnapshotRows(incoming, { softRowCap });
    const diff = countOrderbookReplaceChanges(existing, snapshot);
    levelsReceived += diff.received;
    levelsAdded += diff.added;
    levelsUpdated += diff.updated;
    levelsRemoved += diff.removed;
    const flashRows = buildOrderbookLiveFlashRows(existing, snapshot);
    const hasFlash = Object.keys(flashRows).length > 0 || diff.removed > 0;
    next[sheetId] = {
      ...sheet,
      data: snapshot,
      liveDataRevision: revision,
      liveFlash: hasFlash ? { revision, rows: flashRows } : null,
    };
  }

  return {
    dataSheets: next,
    stats: {
      marketsInTick: markets.length,
      marketsMatched,
      marketsUnmatched,
      levelsReceived,
      levelsAdded,
      levelsUpdated,
      levelsRemoved,
    },
  };
}

/**
 * True when rows look like Kalshi orderbook levels.
 * @param {Record<string, unknown>[]} rows
 */
export function sheetDataLooksLikeOrderbook(rows) {
  const list = Array.isArray(rows) ? rows : [];
  let hits = 0;
  for (let i = 0; i < Math.min(list.length, 24); i += 1) {
    const row = list[i];
    if (!row || typeof row !== "object") continue;
    const side = String(row.side || "").toLowerCase();
    if (
      (side === "yes" || side === "no") &&
      row.price_dollars != null &&
      row.quantity_fp != null
    ) {
      hits += 1;
    }
  }
  return hits > 0;
}
