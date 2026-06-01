import { parseKalshiFixedPointCount } from "@/lib/kalshiLive/kalshiFixedPoint";
import { KALSHI_LIVE_TRADES_COLUMNS } from "@/lib/kalshiLive/tradesColumns";

/** @param {unknown} v */
function coerceDollars(v) {
  if (v == null || v === "") return null;
  const n = Number(typeof v === "string" ? v.trim() : v);
  return Number.isFinite(n) ? n : null;
}

/** @param {unknown} v */
function coerceTimestamp(v) {
  if (v == null || v === "") return null;
  const s = String(v).trim();
  const d = new Date(s);
  const ms = d.getTime();
  if (Number.isFinite(ms)) return ms;
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? n : null;
}

/**
 * @param {Record<string, unknown>} raw
 * @returns {Record<string, unknown>}
 */
export function normalizeKalshiLiveTradeRow(raw) {
  if (!raw || typeof raw !== "object") return {};
  const t = /** @type {Record<string, unknown>} */ (raw);

  const str = (k) => {
    const v = t[k];
    if (v == null) return "";
    return String(v);
  };

  return {
    trade_id: str("trade_id"),
    ticker: str("ticker"),
    count_fp: parseKalshiFixedPointCount(t.count_fp),
    yes_price_dollars: coerceDollars(t.yes_price_dollars),
    no_price_dollars: coerceDollars(t.no_price_dollars),
    taker_outcome_side: str("taker_outcome_side"),
    taker_book_side: str("taker_book_side"),
    taker_side: str("taker_side"),
    created_time: coerceTimestamp(t.created_time),
  };
}

/**
 * @param {unknown[]} trades
 * @returns {Record<string, unknown>[]}
 */
export function normalizeKalshiLiveTrades(trades) {
  return (Array.isArray(trades) ? trades : []).map((raw) =>
    normalizeKalshiLiveTradeRow(/** @type {Record<string, unknown>} */ (raw)),
  );
}

/**
 * @param {Record<string, unknown>[]} rows
 * @param {string[] | undefined} selectedColumns
 */
export function projectKalshiLiveTradeRows(rows, selectedColumns) {
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
        const col = KALSHI_LIVE_TRADES_COLUMNS.find((c) => c.name === name);
        const kind = col?.type;
        out[name] =
          kind === "number" || kind === "timestamp" ? null : "";
      }
    }
    return out;
  });
}
