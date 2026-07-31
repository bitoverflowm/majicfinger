import {
  getKalshiLiveCandlestickFieldType,
  KALSHI_LIVE_CANDLESTICK_COLUMNS,
} from "@/lib/kalshiLive/candlesticksColumns";
import { parseKalshiFixedPointCount } from "@/lib/kalshiLive/kalshiFixedPoint";

/** @param {unknown} v */
function coerceRequiredDollars(v) {
  if (v == null || v === "") return null;
  const n = Number(typeof v === "string" ? v.trim() : v);
  return Number.isFinite(n) ? n : null;
}

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

/**
 * Historical API uses `open`; live uses `open_dollars`. Accept either.
 * @param {Record<string, unknown> | null | undefined} dist
 * @param {string} shortKey
 */
function pickDollars(dist, shortKey) {
  if (!dist || typeof dist !== "object") return null;
  const d = /** @type {Record<string, unknown>} */ (dist);
  if (d[`${shortKey}_dollars`] != null && d[`${shortKey}_dollars`] !== "") {
    return coerceNullableDollars(d[`${shortKey}_dollars`]);
  }
  return coerceNullableDollars(d[shortKey]);
}

/**
 * @param {unknown} dist
 * @param {string} prefix
 */
function ohlcPrefix(dist, prefix) {
  const keys = ["open", "high", "low", "close"];
  /** @type {Record<string, number | null>} */
  const out = {};
  const obj = dist && typeof dist === "object" ? /** @type {Record<string, unknown>} */ (dist) : null;
  for (const k of keys) {
    out[`${prefix}_${k}_dollars`] = pickDollars(obj, k);
  }
  return out;
}

/**
 * Normalize a historical (or live-shaped) candlestick into Live sheet columns.
 *
 * @param {string} marketTicker
 * @param {Record<string, unknown>} candle
 */
export function normalizeKalshiHistoricalV2CandlestickRow(marketTicker, candle) {
  const c = candle && typeof candle === "object" ? candle : {};
  const price = /** @type {Record<string, unknown>} */ (c.price || {});

  const volumeRaw = c.volume_fp != null ? c.volume_fp : c.volume;
  const oiRaw = c.open_interest_fp != null ? c.open_interest_fp : c.open_interest;

  return {
    market_ticker: marketTicker == null ? "" : String(marketTicker),
    end_period_ts: coerceUnixTimestamp(c.end_period_ts),
    volume_fp: parseKalshiFixedPointCount(volumeRaw),
    open_interest_fp: parseKalshiFixedPointCount(oiRaw),
    price_open_dollars: pickDollars(price, "open"),
    price_high_dollars: pickDollars(price, "high"),
    price_low_dollars: pickDollars(price, "low"),
    price_close_dollars: pickDollars(price, "close"),
    price_mean_dollars: pickDollars(price, "mean"),
    price_previous_dollars: pickDollars(price, "previous"),
    price_min_dollars: pickDollars(price, "min"),
    price_max_dollars: pickDollars(price, "max"),
    ...ohlcPrefix(c.yes_bid, "yes_bid"),
    ...ohlcPrefix(c.yes_ask, "yes_ask"),
  };
}

/**
 * @param {{ market_ticker?: string; marketTicker?: string; candlesticks?: unknown[] }[]} marketGroups
 */
export function flattenKalshiHistoricalV2CandlestickGroups(marketGroups) {
  /** @type {Record<string, unknown>[]} */
  const rows = [];
  for (const group of Array.isArray(marketGroups) ? marketGroups : []) {
    const ticker = String(group.market_ticker || group.marketTicker || "").trim();
    const sticks = Array.isArray(group.candlesticks) ? group.candlesticks : [];
    for (const candle of sticks) {
      rows.push(
        normalizeKalshiHistoricalV2CandlestickRow(
          ticker,
          /** @type {Record<string, unknown>} */ (candle),
        ),
      );
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
export function projectKalshiHistoricalV2CandlestickRows(rows, selectedColumns) {
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

export const KALSHI_HISTORICAL_V2_CANDLESTICK_ROW_KEYS = KALSHI_LIVE_CANDLESTICK_COLUMNS.map(
  (c) => c.name,
);
