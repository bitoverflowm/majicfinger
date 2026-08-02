/**
 * Upsert Kalshi candlestick rows by end_period_ts; upsert markets metadata by ticker.
 * Also stamps `liveFlash` on updated sheets so the visible grid can purple-highlight
 * new / changed cells when the user is looking at that sheet.
 */

/**
 * Stable row key for live flash matching (grid + upsert).
 * @param {Record<string, unknown> | null | undefined} row
 * @returns {string | null}
 */
export function liveSheetRowKey(row) {
  if (!row || typeof row !== "object") return null;
  const ts = Math.floor(Number(row.end_period_ts));
  if (Number.isFinite(ts)) return `ts:${ts}`;
  const ticker = String(row.ticker || row.market_ticker || "")
    .trim()
    .toUpperCase();
  if (ticker) return `t:${ticker}`;
  return null;
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
 * Diff incoming candle rows against existing for grid flash highlights.
 * @param {Record<string, unknown>[]} existing
 * @param {Record<string, unknown>[]} incoming
 * @returns {Record<string, { isNew: boolean, columns?: string[] }>}
 */
export function buildCandlestickLiveFlashRows(existing, incoming) {
  /** @type {Map<number, Record<string, unknown>>} */
  const byTs = new Map();
  for (const row of Array.isArray(existing) ? existing : []) {
    const ts = Math.floor(Number(row?.end_period_ts));
    if (Number.isFinite(ts)) byTs.set(ts, row);
  }

  /** @type {Record<string, { isNew: boolean, columns?: string[] }>} */
  const rows = {};
  for (const row of Array.isArray(incoming) ? incoming : []) {
    const ts = Math.floor(Number(row?.end_period_ts));
    if (!Number.isFinite(ts)) continue;
    const key = `ts:${ts}`;
    const prev = byTs.get(ts);
    if (!prev) {
      rows[key] = { isNew: true };
      continue;
    }
    /** @type {string[]} */
    const columns = [];
    for (const [field, value] of Object.entries(row)) {
      if (field === "end_period_ts" || field === "_origIndex") continue;
      if (!liveCellEqual(prev[field], value)) columns.push(field);
    }
    if (columns.length) rows[key] = { isNew: false, columns };
  }
  return rows;
}

/**
 * Diff incoming market meta rows against existing for grid flash highlights.
 * @param {Record<string, unknown>[]} existing
 * @param {Record<string, unknown>[]} incoming
 * @param {{ tickerKey?: string }} [opts]
 * @returns {Record<string, { isNew: boolean, columns?: string[] }>}
 */
export function buildMarketMetaLiveFlashRows(existing, incoming, opts = {}) {
  const tickerKey = String(opts.tickerKey || "ticker").trim() || "ticker";
  const keyOf = (row) => {
    const a = String(row?.[tickerKey] || row?.market_ticker || row?.ticker || "")
      .trim()
      .toUpperCase();
    return a ? `t:${a}` : null;
  };

  /** @type {Map<string, Record<string, unknown>>} */
  const byKey = new Map();
  for (const row of Array.isArray(existing) ? existing : []) {
    const k = keyOf(row);
    if (k) byKey.set(k, row);
  }

  /** @type {Record<string, { isNew: boolean, columns?: string[] }>} */
  const rows = {};
  for (const row of Array.isArray(incoming) ? incoming : []) {
    const key = keyOf(row);
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
      if (!liveCellEqual(prev[field], value)) columns.push(field);
    }
    if (columns.length) rows[key] = { isNew: false, columns };
  }
  return rows;
}

/**
 * @param {Record<string, unknown>[]} existing
 * @param {Record<string, unknown>[]} incoming
 * @param {{ softRowCap?: number }} [opts]
 * @returns {Record<string, unknown>[]}
 */
export function upsertCandlestickRowsByEndPeriodTs(existing, incoming, opts = {}) {
  const softRowCap = Math.floor(Number(opts.softRowCap)) || 2000;
  /** @type {Map<number, Record<string, unknown>>} */
  const byTs = new Map();
  /** @type {number[]} */
  const order = [];

  for (const row of Array.isArray(existing) ? existing : []) {
    const ts = Math.floor(Number(row?.end_period_ts));
    if (!Number.isFinite(ts)) continue;
    if (!byTs.has(ts)) order.push(ts);
    byTs.set(ts, { ...row });
  }

  for (const row of Array.isArray(incoming) ? incoming : []) {
    const ts = Math.floor(Number(row?.end_period_ts));
    if (!Number.isFinite(ts)) continue;
    if (!byTs.has(ts)) order.push(ts);
    byTs.set(ts, { ...(byTs.get(ts) || {}), ...row, end_period_ts: ts });
  }

  order.sort((a, b) => a - b);
  let rows = order.map((ts) => byTs.get(ts)).filter(Boolean);
  if (rows.length > softRowCap) {
    rows = rows.slice(rows.length - softRowCap);
  }
  return /** @type {Record<string, unknown>[]} */ (rows);
}

/**
 * Upsert market metadata rows by ticker key.
 * @param {Record<string, unknown>[]} existing
 * @param {Record<string, unknown>[]} incoming
 * @param {{ tickerKey?: string }} [opts]
 * @returns {Record<string, unknown>[]}
 */
export function upsertMarketMetaRowsByTicker(existing, incoming, opts = {}) {
  const tickerKey = String(opts.tickerKey || "ticker").trim() || "ticker";
  /** @type {Map<string, Record<string, unknown>>} */
  const byTicker = new Map();
  /** @type {string[]} */
  const order = [];

  const keyOf = (row) => {
    const a = String(row?.[tickerKey] || row?.market_ticker || row?.ticker || "")
      .trim()
      .toUpperCase();
    return a;
  };

  for (const row of Array.isArray(existing) ? existing : []) {
    const k = keyOf(row);
    if (!k) continue;
    if (!byTicker.has(k)) order.push(k);
    byTicker.set(k, { ...row });
  }

  for (const row of Array.isArray(incoming) ? incoming : []) {
    const k = keyOf(row);
    if (!k) continue;
    if (!byTicker.has(k)) order.push(k);
    byTicker.set(k, { ...(byTicker.get(k) || {}), ...row });
  }

  return order.map((k) => byTicker.get(k)).filter(Boolean);
}

/**
 * Diff candlestick upsert for tick diagnostics.
 * @param {Record<string, unknown>[]} existing
 * @param {Record<string, unknown>[]} incoming
 */
function countCandlestickUpsertChanges(existing, incoming) {
  /** @type {Set<number>} */
  const prevTs = new Set();
  for (const row of Array.isArray(existing) ? existing : []) {
    const ts = Math.floor(Number(row?.end_period_ts));
    if (Number.isFinite(ts)) prevTs.add(ts);
  }
  let received = 0;
  let added = 0;
  let updated = 0;
  let latestTs = null;
  for (const row of Array.isArray(incoming) ? incoming : []) {
    const ts = Math.floor(Number(row?.end_period_ts));
    if (!Number.isFinite(ts)) continue;
    received += 1;
    if (prevTs.has(ts)) updated += 1;
    else added += 1;
    if (latestTs == null || ts > latestTs) latestTs = ts;
  }
  return { received, added, updated, latestTs };
}

/**
 * Apply an event-candlesticks incremental tick onto a dataSheets map.
 *
 * @param {Record<string, object>} dataSheets
 * @param {import("@/lib/liveFeeds/feedConfig").LiveFeedConfig} feed
 * @param {{
 *   metaRows: Record<string, unknown>[];
 *   byMarket: { ticker: string; rows: Record<string, unknown>[] }[];
 * }} tick
 * @param {{ softRowCap?: number }} [opts]
 * @returns {{
 *   dataSheets: Record<string, object>;
 *   stats: {
 *     marketsInTick: number;
 *     marketsMatched: number;
 *     marketsUnmatched: number;
 *     candlesReceived: number;
 *     candlesAdded: number;
 *     candlesUpdated: number;
 *     metaUpdated: boolean;
 *     latestEndPeriodTs: number | null;
 *   };
 * }}
 */
export function applyKalshiCandlestickUpsertToSheets(dataSheets, feed, tick, opts = {}) {
  const softRowCap = opts.softRowCap ?? 2000;
  const next = { ...(dataSheets || {}) };
  const revision = Date.now();
  const metaId = feed.sheets.marketsMetadataSheetId;
  const metaSheet = next[metaId];
  let metaUpdated = false;
  if (metaSheet && Array.isArray(tick.metaRows) && tick.metaRows.length) {
    const existing = Array.isArray(metaSheet.data) ? metaSheet.data : [];
    const flashRows = buildMarketMetaLiveFlashRows(existing, tick.metaRows);
    const hasFlash = Object.keys(flashRows).length > 0;
    next[metaId] = {
      ...metaSheet,
      data: upsertMarketMetaRowsByTicker(existing, tick.metaRows),
      liveDataRevision: revision,
      liveFlash: hasFlash ? { revision, rows: flashRows } : null,
    };
    metaUpdated = true;
  }

  let marketsMatched = 0;
  let marketsUnmatched = 0;
  let candlesReceived = 0;
  let candlesAdded = 0;
  let candlesUpdated = 0;
  /** @type {number | null} */
  let latestEndPeriodTs = null;

  const markets = Array.isArray(tick.byMarket) ? tick.byMarket : [];
  for (const market of markets) {
    const ticker = String(market.ticker || "").trim().toUpperCase();
    const sheetId = feed.sheets.marketSheetIdsByTicker?.[ticker];
    if (!sheetId || !next[sheetId]) {
      marketsUnmatched += 1;
      continue;
    }
    marketsMatched += 1;
    const sheet = next[sheetId];
    const existing = Array.isArray(sheet.data) ? sheet.data : [];
    const incoming = Array.isArray(market.rows) ? market.rows : [];
    const diff = countCandlestickUpsertChanges(existing, incoming);
    candlesReceived += diff.received;
    candlesAdded += diff.added;
    candlesUpdated += diff.updated;
    if (diff.latestTs != null && (latestEndPeriodTs == null || diff.latestTs > latestEndPeriodTs)) {
      latestEndPeriodTs = diff.latestTs;
    }
    const flashRows = buildCandlestickLiveFlashRows(existing, incoming);
    const hasFlash = Object.keys(flashRows).length > 0;
    next[sheetId] = {
      ...sheet,
      data: upsertCandlestickRowsByEndPeriodTs(existing, incoming, { softRowCap }),
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
      candlesReceived,
      candlesAdded,
      candlesUpdated,
      metaUpdated,
      latestEndPeriodTs,
    },
  };
}
