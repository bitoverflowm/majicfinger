/**
 * The trade from one public trader's side. `price_dollars` is always the YES price,
 * and the maker holds the side opposite the taker.
 *
 * @param {Record<string, unknown>} r
 * @param {string} [perspective] nickname to read the trade for
 */
export function kalshiLiveTraderSideOfTrade(r, perspective = "") {
  const taker = String(r?.taker_nickname || "").trim();
  const maker = String(r?.maker_nickname || "").trim();
  const want = String(perspective || "").trim().toLowerCase();
  let role = "";
  if (want) {
    if (taker && taker.toLowerCase() === want) role = "taker";
    else if (maker && maker.toLowerCase() === want) role = "maker";
  } else if (taker) role = "taker";
  else if (maker) role = "maker";
  const takerSide = String(r?.taker_side || "").trim().toLowerCase();
  const side = takerSide === "yes" || takerSide === "no"
    ? (role === "maker" ? (takerSide === "yes" ? "no" : "yes") : takerSide)
    : "";
  const action = String(r?.taker_action || "").trim().toUpperCase();
  const yes = Number(r?.price_dollars);
  const price = Number.isFinite(yes) && side ? (side === "yes" ? yes : 1 - yes) : null;
  const count = Number(r?.count_fp ?? r?.count);
  const rounded = price == null ? null : Math.round(price * 10000) / 10000;
  return {
    trader_nickname: role === "maker" ? maker : role === "taker" ? taker : "",
    trader_role: role,
    trader_side: side ? side.toUpperCase() : "",
    trader_action: action === "BUY" || action === "SELL" ? action : "",
    trader_price: rounded,
    notional: rounded != null && Number.isFinite(count) ? Math.round(rounded * count * 100) / 100 : null,
    activity_type: "TRADE",
  };
}

/**
 * @param {Record<string, unknown>} row
 * @param {string} [perspective] nickname the trades were filtered by
 */
export function normalizeKalshiLiveHolderTradeRow(row, perspective = "") {
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
    ...kalshiLiveTraderSideOfTrade(r, perspective),
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
