/**
 * @param {Record<string, unknown>} row
 */
export function normalizeKalshiLiveHolderTradeRow(row) {
  const r = row && typeof row === "object" ? row : {};
  const numOrNull = (v) => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return {
    trade_id: r.trade_id == null ? "" : String(r.trade_id),
    create_date: r.create_date == null ? "" : String(r.create_date),
    ticker: r.ticker == null ? "" : String(r.ticker),
    market_id: r.market_id == null ? "" : String(r.market_id),
    price: numOrNull(r.price),
    price_dollars: r.price_dollars == null ? "" : String(r.price_dollars),
    count: numOrNull(r.count),
    count_fp: r.count_fp == null ? "" : String(r.count_fp),
    taker_side: r.taker_side == null ? "" : String(r.taker_side),
    maker_action: r.maker_action == null ? "" : String(r.maker_action),
    taker_action: r.taker_action == null ? "" : String(r.taker_action),
    maker_nickname: r.maker_nickname == null ? "" : String(r.maker_nickname),
    taker_nickname: r.taker_nickname == null ? "" : String(r.taker_nickname),
    maker_social_id: r.maker_social_id == null ? "" : String(r.maker_social_id),
    taker_social_id: r.taker_social_id == null ? "" : String(r.taker_social_id),
  };
}

/**
 * @param {unknown[]} trades
 * @param {string[]} [selectedColumns]
 */
export function projectKalshiLiveHolderTradeRows(trades, selectedColumns) {
  void selectedColumns;
  const list = Array.isArray(trades) ? trades : [];
  return list.map((raw) =>
    normalizeKalshiLiveHolderTradeRow(
      /** @type {Record<string, unknown>} */ (raw && typeof raw === "object" ? raw : {}),
    ),
  );
}
