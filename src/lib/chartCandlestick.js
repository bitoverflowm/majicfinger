/**
 * Strict candlestick shape detection + mapping for TradingView Lightweight Charts.
 *
 * Accepts Kalshi Live candlestick sheet rows (and close aliases), and only emits
 * CandlestickData when open/high/low/close are all finite numbers for that bar.
 */

/** @typedef {{ id: string; label: string; open: string; high: string; low: string; close: string }} CandlestickOhlcSet */

/** Preferred time column for Kalshi candlesticks. */
export const CANDLESTICK_TIME_KEYS = ["end_period_ts", "time", "timestamp", "ts"];

/** @type {CandlestickOhlcSet[]} */
export const CANDLESTICK_OHLC_SETS = [
  {
    id: "price",
    label: "Trade price",
    open: "price_open_dollars",
    high: "price_high_dollars",
    low: "price_low_dollars",
    close: "price_close_dollars",
  },
  {
    id: "yes_bid",
    label: "YES bid",
    open: "yes_bid_open_dollars",
    high: "yes_bid_high_dollars",
    low: "yes_bid_low_dollars",
    close: "yes_bid_close_dollars",
  },
  {
    id: "yes_ask",
    label: "YES ask",
    open: "yes_ask_open_dollars",
    high: "yes_ask_high_dollars",
    low: "yes_ask_low_dollars",
    close: "yes_ask_close_dollars",
  },
  {
    id: "generic",
    label: "OHLC",
    open: "open",
    high: "high",
    low: "low",
    close: "close",
  },
];

/**
 * @param {unknown} v
 * @returns {number | null}
 */
export function parseCandlestickNumber(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(String(v).trim());
  return Number.isFinite(n) ? n : null;
}

/**
 * Unix seconds for Lightweight Charts UTCTimestamp.
 * @param {unknown} raw
 * @returns {number | null}
 */
export function parseCandlestickTimeSec(raw) {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw)) {
    // ms → sec
    if (raw > 1e12) return Math.floor(raw / 1000);
    // µs → sec (unlikely but seen in some feeds)
    if (raw > 1e14) return Math.floor(raw / 1e6);
    return Math.floor(raw);
  }
  const s = String(raw).trim();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) {
    return parseCandlestickTimeSec(Number(s));
  }
  const ms = Date.parse(s);
  if (!Number.isFinite(ms)) return null;
  return Math.floor(ms / 1000);
}

/**
 * @param {Record<string, unknown>[]} rows
 * @returns {Set<string>}
 */
export function collectRowColumnKeys(rows) {
  /** @type {Set<string>} */
  const keys = new Set();
  const list = Array.isArray(rows) ? rows : [];
  for (let i = 0; i < Math.min(list.length, 40); i += 1) {
    const row = list[i];
    if (!row || typeof row !== "object") continue;
    for (const k of Object.keys(row)) keys.add(k);
  }
  return keys;
}

/**
 * @param {Set<string> | string[]} keys
 * @returns {string | null}
 */
export function findCandlestickTimeKey(keys) {
  const set = keys instanceof Set ? keys : new Set(keys || []);
  for (const k of CANDLESTICK_TIME_KEYS) {
    if (set.has(k)) return k;
  }
  return null;
}

/**
 * @param {Set<string> | string[]} keys
 * @returns {CandlestickOhlcSet[]}
 */
export function findAvailableCandlestickOhlcSets(keys) {
  const set = keys instanceof Set ? keys : new Set(keys || []);
  return CANDLESTICK_OHLC_SETS.filter(
    (ohlc) => set.has(ohlc.open) && set.has(ohlc.high) && set.has(ohlc.low) && set.has(ohlc.close),
  );
}

/**
 * True when rows look like Kalshi (or compatible) candlestick sheet data.
 * Requires a time column and at least one complete OHLC column quartet.
 *
 * @param {Record<string, unknown>[]} rows
 */
export function sheetHasCandlestickShape(rows) {
  const keys = collectRowColumnKeys(rows);
  return !!findCandlestickTimeKey(keys) && findAvailableCandlestickOhlcSets(keys).length > 0;
}

/**
 * Count rows with a complete finite OHLC bar for a given set.
 * @param {Record<string, unknown>[]} rows
 * @param {CandlestickOhlcSet} ohlc
 * @param {string} timeKey
 */
export function countValidCandlestickBars(rows, ohlc, timeKey) {
  let n = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row || typeof row !== "object") continue;
    if (parseCandlestickTimeSec(row[timeKey]) == null) continue;
    const open = parseCandlestickNumber(row[ohlc.open]);
    const high = parseCandlestickNumber(row[ohlc.high]);
    const low = parseCandlestickNumber(row[ohlc.low]);
    const close = parseCandlestickNumber(row[ohlc.close]);
    if (open == null || high == null || low == null || close == null) continue;
    if (high < low) continue;
    n += 1;
  }
  return n;
}

/**
 * Pick best OHLC set: prefer explicit id, else most valid bars, with price > yes_bid > yes_ask > generic.
 *
 * @param {Record<string, unknown>[]} rows
 * @param {string | null | undefined} preferredSetId
 */
export function resolveCandlestickMapping(rows, preferredSetId) {
  const keys = collectRowColumnKeys(rows);
  const timeKey = findCandlestickTimeKey(keys);
  const available = findAvailableCandlestickOhlcSets(keys);
  if (!timeKey || !available.length) {
    return { ok: false, timeKey: null, ohlc: null, available: [], reason: "missing_shape" };
  }

  if (preferredSetId && preferredSetId !== "auto") {
    const chosen = available.find((s) => s.id === preferredSetId);
    if (chosen) {
      return { ok: true, timeKey, ohlc: chosen, available, reason: null };
    }
  }

  let best = available[0];
  let bestCount = -1;
  for (const set of available) {
    const count = countValidCandlestickBars(rows, set, timeKey);
    if (count > bestCount) {
      best = set;
      bestCount = count;
    }
  }

  return { ok: true, timeKey, ohlc: best, available, reason: null };
}

/**
 * Map sheet rows → Lightweight Charts CandlestickData (strict).
 * Skips bars missing any OHLC value or with high < low. Dedupes/sorts by time.
 *
 * @param {Record<string, unknown>[]} rows
 * @param {{ ohlcSetId?: string | null }} [opts]
 * @returns {{
 *   ok: boolean;
 *   data: { time: number; open: number; high: number; low: number; close: number }[];
 *   timeKey: string | null;
 *   ohlc: CandlestickOhlcSet | null;
 *   available: CandlestickOhlcSet[];
 *   skipped: number;
 *   reason: string | null;
 * }}
 */
export function mapRowsToCandlestickSeriesData(rows, opts = {}) {
  const list = Array.isArray(rows) ? rows : [];
  const resolved = resolveCandlestickMapping(list, opts.ohlcSetId);
  if (!resolved.ok || !resolved.timeKey || !resolved.ohlc) {
    return {
      ok: false,
      data: [],
      timeKey: null,
      ohlc: null,
      available: resolved.available || [],
      skipped: list.length,
      reason: resolved.reason || "missing_shape",
    };
  }

  const { timeKey, ohlc, available } = resolved;
  /** @type {Map<number, { time: number; open: number; high: number; low: number; close: number }>} */
  const byTime = new Map();
  let skipped = 0;

  for (const row of list) {
    if (!row || typeof row !== "object") {
      skipped += 1;
      continue;
    }
    const time = parseCandlestickTimeSec(row[timeKey]);
    const open = parseCandlestickNumber(row[ohlc.open]);
    const high = parseCandlestickNumber(row[ohlc.high]);
    const low = parseCandlestickNumber(row[ohlc.low]);
    const close = parseCandlestickNumber(row[ohlc.close]);
    if (time == null || open == null || high == null || low == null || close == null) {
      skipped += 1;
      continue;
    }
    if (high < low) {
      skipped += 1;
      continue;
    }
    // Clamp wick extremes to body if feed is slightly inconsistent.
    const hi = Math.max(high, open, close);
    const lo = Math.min(low, open, close);
    byTime.set(time, { time, open, high: hi, low: lo, close });
  }

  const data = [...byTime.values()].sort((a, b) => a.time - b.time);
  return {
    ok: data.length > 0,
    data,
    timeKey,
    ohlc,
    available,
    skipped,
    reason: data.length ? null : "no_valid_bars",
  };
}
