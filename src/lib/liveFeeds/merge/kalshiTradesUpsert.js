/**
 * Upsert Kalshi trade rows by trade_id; soft-cap by created_time (keep newest).
 * Stamps liveFlash / liveDataRevision like candlestick upserts.
 */

import { coerceDataTypes } from "@/lib/coerceDataTypes";
import {
  mergeLiveSheetRowPreserve,
  shouldApplyLiveCell,
} from "@/lib/liveFeeds/merge/kalshiCandlestickUpsert";

/**
 * Normalize created_time to unix seconds for ordering / min_ts.
 * @param {unknown} raw
 * @returns {number | null}
 */
export function normalizeTradeCreatedTs(raw) {
  if (raw == null || raw === "") return null;
  if (raw instanceof Date) {
    const ms = raw.getTime();
    if (!Number.isFinite(ms)) return null;
    return Math.floor(ms / 1000);
  }
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  // ms → sec
  if (n > 1e12) return Math.floor(n / 1000);
  // already seconds (or small ms-like — treat as sec if < 1e12)
  return Math.floor(n);
}

/**
 * @param {Record<string, unknown> | null | undefined} row
 * @returns {string | null}
 */
export function liveTradeRowKey(row) {
  if (!row || typeof row !== "object") return null;
  const id = String(row.trade_id || "").trim();
  return id ? `trade:${id}` : null;
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
export function buildTradesLiveFlashRows(existing, incoming) {
  /** @type {Map<string, Record<string, unknown>>} */
  const byId = new Map();
  for (const row of Array.isArray(existing) ? existing : []) {
    const id = String(row?.trade_id || "").trim();
    if (id) byId.set(id, row);
  }

  /** @type {Record<string, { isNew: boolean, columns?: string[] }>} */
  const rows = {};
  for (const row of Array.isArray(incoming) ? incoming : []) {
    const id = String(row?.trade_id || "").trim();
    if (!id) continue;
    const key = `trade:${id}`;
    const prev = byId.get(id);
    if (!prev) {
      rows[key] = { isNew: true };
      continue;
    }
    /** @type {string[]} */
    const columns = [];
    for (const [field, value] of Object.entries(row)) {
      if (field === "trade_id" || field === "_origIndex") continue;
      if (!shouldApplyLiveCell(value, prev[field])) continue;
      if (!liveCellEqual(prev[field], value)) columns.push(field);
    }
    if (columns.length) rows[key] = { isNew: false, columns };
  }
  return rows;
}

/**
 * Max created_time (unix sec) across trade rows, or null if none.
 * @param {Record<string, unknown>[]} rows
 * @returns {number | null}
 */
export function maxTradeCreatedTs(rows) {
  /** @type {number | null} */
  let max = null;
  for (const row of Array.isArray(rows) ? rows : []) {
    const ts = normalizeTradeCreatedTs(row?.created_time);
    if (ts == null) continue;
    if (max == null || ts > max) max = ts;
  }
  return max;
}

/**
 * Upsert by trade_id; keep newest softRowCap by created_time.
 * @param {Record<string, unknown>[]} existing
 * @param {Record<string, unknown>[]} incoming
 * @param {{ softRowCap?: number }} [opts]
 * @returns {Record<string, unknown>[]}
 */
export function upsertTradeRowsByTradeId(existing, incoming, opts = {}) {
  const softRowCap = Math.floor(Number(opts.softRowCap)) || 50_000;
  /** @type {Map<string, Record<string, unknown>>} */
  const byId = new Map();

  for (const row of Array.isArray(existing) ? existing : []) {
    const id = String(row?.trade_id || "").trim();
    if (!id) continue;
    byId.set(id, { ...row, trade_id: id });
  }

  for (const row of Array.isArray(incoming) ? incoming : []) {
    const id = String(row?.trade_id || "").trim();
    if (!id) continue;
    const merged = mergeLiveSheetRowPreserve(byId.get(id), row);
    merged.trade_id = id;
    byId.set(id, merged);
  }

  let rows = [...byId.values()];
  rows.sort((a, b) => {
    const ta = normalizeTradeCreatedTs(a.created_time) ?? 0;
    const tb = normalizeTradeCreatedTs(b.created_time) ?? 0;
    if (ta !== tb) return ta - tb;
    return String(a.trade_id || "").localeCompare(String(b.trade_id || ""));
  });
  if (rows.length > softRowCap) {
    rows = rows.slice(rows.length - softRowCap);
  }
  return rows;
}

/**
 * @param {Record<string, unknown>[]} existing
 * @param {Record<string, unknown>[]} incoming
 */
function countTradeUpsertChanges(existing, incoming) {
  /** @type {Set<string>} */
  const prevIds = new Set();
  for (const row of Array.isArray(existing) ? existing : []) {
    const id = String(row?.trade_id || "").trim();
    if (id) prevIds.add(id);
  }
  let received = 0;
  let added = 0;
  let updated = 0;
  /** @type {number | null} */
  let latestTs = null;
  for (const row of Array.isArray(incoming) ? incoming : []) {
    const id = String(row?.trade_id || "").trim();
    if (!id) continue;
    received += 1;
    if (prevIds.has(id)) updated += 1;
    else added += 1;
    const ts = normalizeTradeCreatedTs(row.created_time);
    if (ts != null && (latestTs == null || ts > latestTs)) latestTs = ts;
  }
  return { received, added, updated, latestTs };
}

/**
 * Apply a trades incremental tick onto a dataSheets map (one sheet per ticker).
 *
 * @param {Record<string, object>} dataSheets
 * @param {{ sheets?: { marketSheetIdsByTicker?: Record<string, string> } }} feed
 * @param {{ byMarket: { ticker: string; rows: Record<string, unknown>[] }[] }} tick
 * @param {{ softRowCap?: number }} [opts]
 */
export function applyKalshiTradesUpsertToSheets(dataSheets, feed, tick, opts = {}) {
  const softRowCap = opts.softRowCap ?? 50_000;
  const next = { ...(dataSheets || {}) };
  const revision = Date.now();

  let marketsMatched = 0;
  let marketsUnmatched = 0;
  let tradesReceived = 0;
  let tradesAdded = 0;
  let tradesUpdated = 0;
  /** @type {number | null} */
  let latestCreatedTs = null;

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
    const diff = countTradeUpsertChanges(existing, incoming);
    tradesReceived += diff.received;
    tradesAdded += diff.added;
    tradesUpdated += diff.updated;
    if (diff.latestTs != null && (latestCreatedTs == null || diff.latestTs > latestCreatedTs)) {
      latestCreatedTs = diff.latestTs;
    }
    const flashRows = buildTradesLiveFlashRows(existing, incoming);
    const hasFlash = Object.keys(flashRows).length > 0;
    next[sheetId] = {
      ...sheet,
      data: upsertTradeRowsByTradeId(existing, incoming, { softRowCap }),
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
      tradesReceived,
      tradesAdded,
      tradesUpdated,
      latestCreatedTs,
    },
  };
}

/**
 * True when rows look like Kalshi trades (for public overlay routing).
 * @param {Record<string, unknown>[]} rows
 */
export function sheetDataLooksLikeTrades(rows) {
  const list = Array.isArray(rows) ? rows : [];
  let tradeish = 0;
  for (let i = 0; i < Math.min(list.length, 24); i += 1) {
    const row = list[i];
    if (!row || typeof row !== "object") continue;
    if (row.trade_id != null && String(row.trade_id).trim()) tradeish += 1;
  }
  return tradeish > 0;
}
