import { parseKalshiFixedPointCount } from "@/lib/kalshiLive/kalshiFixedPoint";

function jsonCell(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Coerce a Kalshi Live /markets item into a flat sheet row with stable types.
 * Omits deprecated fields: title, subtitle, expiration_time, liquidity_dollars.
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
  const bool = (k) => {
    const v = m[k];
    if (v == null || v === "") return null;
    return Boolean(v);
  };
  const int = (k) => {
    const v = m[k];
    if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  };
  const num = (k) => {
    const v = m[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const fp = (k) => parseKalshiFixedPointCount(m[k]);

  return {
    ticker: str("ticker"),
    event_ticker: str("event_ticker"),
    market_type: str("market_type"),
    yes_sub_title: str("yes_sub_title"),
    no_sub_title: str("no_sub_title"),
    created_time: str("created_time"),
    updated_time: str("updated_time"),
    open_time: str("open_time"),
    close_time: str("close_time"),
    latest_expiration_time: str("latest_expiration_time"),
    settlement_timer_seconds: int("settlement_timer_seconds"),
    status: str("status"),
    yes_bid_dollars: str("yes_bid_dollars"),
    yes_bid_size_fp: fp("yes_bid_size_fp"),
    yes_ask_dollars: str("yes_ask_dollars"),
    yes_ask_size_fp: fp("yes_ask_size_fp"),
    no_bid_dollars: str("no_bid_dollars"),
    no_ask_dollars: str("no_ask_dollars"),
    last_price_dollars: str("last_price_dollars"),
    volume_fp: fp("volume_fp"),
    volume_24h_fp: fp("volume_24h_fp"),
    result: str("result"),
    can_close_early: bool("can_close_early"),
    open_interest_fp: fp("open_interest_fp"),
    notional_value_dollars: str("notional_value_dollars"),
    previous_yes_bid_dollars: str("previous_yes_bid_dollars"),
    previous_yes_ask_dollars: str("previous_yes_ask_dollars"),
    previous_price_dollars: str("previous_price_dollars"),
    expiration_value: str("expiration_value"),
    rules_primary: str("rules_primary"),
    rules_secondary: str("rules_secondary"),
    price_level_structure: str("price_level_structure"),
    price_ranges: jsonCell(m.price_ranges),
    expected_expiration_time: str("expected_expiration_time"),
    settlement_value_dollars: str("settlement_value_dollars"),
    settlement_ts: str("settlement_ts"),
    occurrence_datetime: str("occurrence_datetime"),
    fee_waiver_expiration_time: str("fee_waiver_expiration_time"),
    early_close_condition: str("early_close_condition"),
    strike_type: str("strike_type"),
    floor_strike: num("floor_strike"),
    cap_strike: num("cap_strike"),
    functional_strike: str("functional_strike"),
    custom_strike: jsonCell(m.custom_strike),
    mve_collection_ticker: str("mve_collection_ticker"),
    mve_selected_legs: jsonCell(m.mve_selected_legs),
    primary_participant_key: str("primary_participant_key"),
    is_provisional: bool("is_provisional"),
    exchange_index: int("exchange_index"),
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
