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
    next[metaId] = {
      ...metaSheet,
      data: upsertMarketMetaRowsByTicker(existing, tick.metaRows),
      liveDataRevision: revision,
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
    next[sheetId] = {
      ...sheet,
      data: upsertCandlestickRowsByEndPeriodTs(existing, incoming, { softRowCap }),
      liveDataRevision: revision,
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
