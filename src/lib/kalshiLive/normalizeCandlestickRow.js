import {
  getKalshiLiveCandlestickFieldType,
  KALSHI_LIVE_CANDLESTICK_COLUMNS,
} from "@/lib/kalshiLive/candlesticksColumns";
import { parseKalshiFixedPointCount } from "@/lib/kalshiLive/kalshiFixedPoint";

/** Required dollar string from API → number. */
/** @param {unknown} v */
function coerceRequiredDollars(v) {
  if (v == null || v === "") return null;
  const n = Number(typeof v === "string" ? v.trim() : v);
  return Number.isFinite(n) ? n : null;
}

/** Nullable trade price from API → number | null. */
/** @param {unknown} v */
function coerceNullableDollars(v) {
  if (v == null || v === "") return null;
  const n = Number(typeof v === "string" ? v.trim() : v);
  return Number.isFinite(n) ? n : null;
}

/** @param {unknown} v */
function coerceUnixTimestamp(v) {
  if (v == null || v === "") return null;
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? n : null;
}

/** @param {string} field @param {unknown} v */
function coerceCandlestickField(field, v) {
  const kind = getKalshiLiveCandlestickFieldType(field);
  switch (kind) {
    case "timestamp":
      return coerceUnixTimestamp(v);
    case "nullable_number":
      return coerceNullableDollars(v);
    case "number":
      if (field === "volume_fp" || field === "open_interest_fp") {
        return parseKalshiFixedPointCount(v);
      }
      return coerceRequiredDollars(v);
    case "string":
    default:
      return v == null ? "" : String(v);
  }
}

function ohlcPrefix(dist, prefix) {
  const keys = ["open_dollars", "high_dollars", "low_dollars", "close_dollars"];
  /** @type {Record<string, number | null>} */
  const out = {};
  if (!dist || typeof dist !== "object") {
    for (const k of keys) {
      out[`${prefix}_${k}`] = null;
    }
    return out;
  }
  const d = /** @type {Record<string, unknown>} */ (dist);
  for (const k of keys) {
    out[`${prefix}_${k}`] = coerceRequiredDollars(d[k]);
  }
  return out;
}

/**
 * @param {string} marketTicker
 * @param {Record<string, unknown>} candle
 */
export function normalizeKalshiLiveCandlestickRow(marketTicker, candle) {
  const c = candle && typeof candle === "object" ? candle : {};
  const price = /** @type {Record<string, unknown>} */ (c.price || {});

  return {
    market_ticker: coerceCandlestickField("market_ticker", marketTicker),
    end_period_ts: coerceCandlestickField("end_period_ts", c.end_period_ts),
    volume_fp: coerceCandlestickField("volume_fp", c.volume_fp),
    open_interest_fp: coerceCandlestickField("open_interest_fp", c.open_interest_fp),
    price_open_dollars: coerceNullableDollars(price.open_dollars),
    price_high_dollars: coerceNullableDollars(price.high_dollars),
    price_low_dollars: coerceNullableDollars(price.low_dollars),
    price_close_dollars: coerceNullableDollars(price.close_dollars),
    price_mean_dollars: coerceNullableDollars(price.mean_dollars),
    price_previous_dollars: coerceNullableDollars(price.previous_dollars),
    price_min_dollars: coerceNullableDollars(price.min_dollars),
    price_max_dollars: coerceNullableDollars(price.max_dollars),
    ...ohlcPrefix(c.yes_bid, "yes_bid"),
    ...ohlcPrefix(c.yes_ask, "yes_ask"),
  };
}

/**
 * @param {{ market_ticker?: string; marketTicker?: string; candlesticks?: unknown[] }[]} marketGroups
 */
export function flattenKalshiLiveCandlestickGroups(marketGroups) {
  /** @type {Record<string, unknown>[]} */
  const rows = [];
  for (const group of Array.isArray(marketGroups) ? marketGroups : []) {
    const ticker = String(group.market_ticker || group.marketTicker || "").trim();
    const sticks = Array.isArray(group.candlesticks) ? group.candlesticks : [];
    for (const candle of sticks) {
      rows.push(normalizeKalshiLiveCandlestickRow(ticker, /** @type {Record<string, unknown>} */ (candle)));
    }
  }
  return rows;
}

/** @param {string} columnName */
function defaultCandlestickCell(columnName) {
  const kind = getKalshiLiveCandlestickFieldType(columnName);
  if (kind === "nullable_number" || kind === "timestamp" || kind === "number") return null;
  return "";
}

/**
 * @param {Record<string, unknown>[]} rows
 * @param {string[] | undefined} selectedColumns
 */
export function projectKalshiLiveCandlestickRows(rows, selectedColumns) {
  const cols = Array.isArray(selectedColumns) ? selectedColumns : [];
  const list = Array.isArray(rows) ? rows : [];
  if (!cols.length) return [];
  return list.map((raw) => {
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const name of cols) {
      if (Object.prototype.hasOwnProperty.call(raw, name)) {
        out[name] = raw[name];
      } else {
        out[name] = defaultCandlestickCell(name);
      }
    }
    return out;
  });
}

/** All normalized column names (for tests / ingest). */
export const KALSHI_LIVE_CANDLESTICK_ROW_KEYS = KALSHI_LIVE_CANDLESTICK_COLUMNS.map((c) => c.name);
