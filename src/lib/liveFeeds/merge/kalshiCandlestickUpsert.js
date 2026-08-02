/**
 * Upsert Kalshi candlestick rows by end_period_ts; upsert markets metadata by ticker.
 */

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
 * Apply an event-candlesticks incremental tick onto a dataSheets map.
 *
 * @param {Record<string, object>} dataSheets
 * @param {import("@/lib/liveFeeds/feedConfig").LiveFeedConfig} feed
 * @param {{
 *   metaRows: Record<string, unknown>[];
 *   byMarket: { ticker: string; rows: Record<string, unknown>[] }[];
 * }} tick
 * @param {{ softRowCap?: number }} [opts]
 * @returns {Record<string, object>}
 */
export function applyKalshiCandlestickUpsertToSheets(dataSheets, feed, tick, opts = {}) {
  const softRowCap = opts.softRowCap ?? 2000;
  const next = { ...(dataSheets || {}) };
  const metaId = feed.sheets.marketsMetadataSheetId;
  const metaSheet = next[metaId];
  if (metaSheet && Array.isArray(tick.metaRows)) {
    const existing = Array.isArray(metaSheet.data) ? metaSheet.data : [];
    next[metaId] = {
      ...metaSheet,
      data: upsertMarketMetaRowsByTicker(existing, tick.metaRows),
    };
  }

  for (const market of Array.isArray(tick.byMarket) ? tick.byMarket : []) {
    const ticker = String(market.ticker || "").trim().toUpperCase();
    const sheetId = feed.sheets.marketSheetIdsByTicker?.[ticker];
    if (!sheetId) continue;
    const sheet = next[sheetId];
    if (!sheet) continue;
    const existing = Array.isArray(sheet.data) ? sheet.data : [];
    next[sheetId] = {
      ...sheet,
      data: upsertCandlestickRowsByEndPeriodTs(existing, market.rows || [], { softRowCap }),
    };
  }

  return next;
}
