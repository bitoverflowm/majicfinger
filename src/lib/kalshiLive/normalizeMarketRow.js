import { parseKalshiFixedPointCount } from "@/lib/kalshiLive/kalshiFixedPoint";

/**
 * Coerce a Kalshi Live /markets item into a flat sheet row with stable types.
 * @param {Record<string, unknown>} raw
 * @returns {Record<string, unknown>}
 */
export function normalizeKalshiLiveMarketRow(raw) {
  if (!raw || typeof raw !== "object") return {};
  const m = /** @type {Record<string, unknown>} */ (raw);

  const str = (k) => {
    const v = m[k];
    if (v == null) return "";
    return String(v);
  };
  const bool = (k) => Boolean(m[k]);
  const int = (k) => {
    const v = m[k];
    if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  };
  const fp = (k) => parseKalshiFixedPointCount(m[k]);

  return {
    ticker: str("ticker"),
    event_ticker: str("event_ticker"),
    title: str("title"),
    subtitle: str("subtitle"),
    yes_sub_title: str("yes_sub_title"),
    no_sub_title: str("no_sub_title"),
    status: str("status"),
    created_time: str("created_time"),
    updated_time: str("updated_time"),
    open_time: str("open_time"),
    close_time: str("close_time"),
    latest_expiration_time: str("latest_expiration_time"),
    expected_expiration_time: str("expected_expiration_time"),
    expiration_time: str("expiration_time"),
    settlement_ts: str("settlement_ts"),
    occurrence_datetime: str("occurrence_datetime"),
    yes_bid_dollars: str("yes_bid_dollars"),
    yes_ask_dollars: str("yes_ask_dollars"),
    no_bid_dollars: str("no_bid_dollars"),
    no_ask_dollars: str("no_ask_dollars"),
    last_price_dollars: str("last_price_dollars"),
    volume_fp: fp("volume_fp"),
    volume_24h_fp: fp("volume_24h_fp"),
    open_interest_fp: fp("open_interest_fp"),
    liquidity_dollars: str("liquidity_dollars"),
    settlement_value_dollars: str("settlement_value_dollars"),
    can_close_early: bool("can_close_early"),
    fractional_trading_enabled: bool("fractional_trading_enabled"),
    is_provisional: bool("is_provisional"),
    exchange_index: int("exchange_index"),
    mve_collection_ticker: str("mve_collection_ticker"),
    rules_primary: str("rules_primary"),
    rules_secondary: str("rules_secondary"),
  };
}

/**
 * @param {unknown[]} markets
 * @param {string[]} selectedColumns
 */
export function projectKalshiLiveMarketRows(markets, selectedColumns) {
  const cols =
    Array.isArray(selectedColumns) && selectedColumns.length
      ? selectedColumns
      : null;
  return (Array.isArray(markets) ? markets : []).map((raw) => {
    const row = normalizeKalshiLiveMarketRow(
      /** @type {Record<string, unknown>} */ (raw),
    );
    if (!cols) return row;
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const c of cols) {
      if (Object.prototype.hasOwnProperty.call(row, c)) out[c] = row[c];
    }
    return out;
  });
}
