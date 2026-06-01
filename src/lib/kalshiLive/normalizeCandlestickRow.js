function str(v) {
  if (v == null) return "";
  return String(v);
}

function ohlcPrefix(dist, prefix) {
  if (!dist || typeof dist !== "object") {
    return {
      [`${prefix}_open_dollars`]: "",
      [`${prefix}_high_dollars`]: "",
      [`${prefix}_low_dollars`]: "",
      [`${prefix}_close_dollars`]: "",
    };
  }
  const d = /** @type {Record<string, unknown>} */ (dist);
  return {
    [`${prefix}_open_dollars`]: str(d.open_dollars),
    [`${prefix}_high_dollars`]: str(d.high_dollars),
    [`${prefix}_low_dollars`]: str(d.low_dollars),
    [`${prefix}_close_dollars`]: str(d.close_dollars),
  };
}

/**
 * @param {string} marketTicker
 * @param {Record<string, unknown>} candle
 */
export function normalizeKalshiLiveCandlestickRow(marketTicker, candle) {
  const c = candle && typeof candle === "object" ? candle : {};
  const price = /** @type {Record<string, unknown>} */ (c.price || {});
  return {
    market_ticker: str(marketTicker),
    end_period_ts: c.end_period_ts != null ? Number(c.end_period_ts) : "",
    volume_fp: str(c.volume_fp),
    open_interest_fp: str(c.open_interest_fp),
    price_open_dollars: str(price.open_dollars),
    price_high_dollars: str(price.high_dollars),
    price_low_dollars: str(price.low_dollars),
    price_close_dollars: str(price.close_dollars),
    price_mean_dollars: str(price.mean_dollars),
    price_previous_dollars: str(price.previous_dollars),
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

/**
 * @param {Record<string, unknown>[]} rows
 * @param {string[] | undefined} selectedColumns
 */
export function projectKalshiLiveCandlestickRows(rows, selectedColumns) {
  const cols = Array.isArray(selectedColumns) ? selectedColumns : [];
  const list = Array.isArray(rows) ? rows : [];
  if (!cols.length) return [];
  return list.map((raw) => {
    const out = {};
    for (const name of cols) {
      out[name] = raw?.[name] ?? "";
    }
    return out;
  });
}
