import assert from "node:assert/strict";
import { kalshiLiveTraderSideOfTrade, normalizeKalshiLiveHolderTradeRow } from "./normalizeHolderTradeRow.js";
import { kalshiLiveHiddenPositionRow, normalizeKalshiLiveHolderPositionRows, normalizeKalshiLiveHolderPositionStatus } from "./holderPositionsColumns.js";
import { kalshiLiveProfileMetricFields } from "./holderProfileColumns.js";

const takerYes = normalizeKalshiLiveHolderTradeRow({
  trade_id: "t1",
  ticker: "KXEPL-ARS",
  price_dollars: "0.6100",
  count: 6,
  count_fp: "6.38",
  taker_side: "yes",
  taker_action: "buy",
  taker_nickname: "hkin",
  maker_nickname: "",
  create_date: "2026-10-18T11:22:13Z",
});
assert.equal(takerYes.trader_nickname, "hkin");
assert.equal(takerYes.trader_role, "taker");
assert.equal(takerYes.trader_side, "YES");
assert.equal(takerYes.trader_action, "BUY");
assert.equal(takerYes.trader_price, 0.61);
assert.equal(takerYes.notional, 3.89);
assert.equal(takerYes.activity_type, "TRADE");
assert.equal(takerYes.count, 6);

const takerNo = kalshiLiveTraderSideOfTrade({ price_dollars: "0.0750", count_fp: "400.00", taker_side: "no", taker_action: "buy", taker_nickname: "Ada" });
assert.equal(takerNo.trader_side, "NO");
assert.equal(takerNo.trader_price, 0.925);
assert.equal(takerNo.notional, 370);

const maker = kalshiLiveTraderSideOfTrade(
  { price_dollars: "0.4000", count_fp: "10", taker_side: "yes", taker_action: "buy", taker_nickname: "Bea", maker_nickname: "Cy" },
  "cy",
);
assert.equal(maker.trader_nickname, "Cy");
assert.equal(maker.trader_role, "maker");
assert.equal(maker.trader_side, "NO");
assert.equal(maker.trader_price, 0.6);

const anonymous = kalshiLiveTraderSideOfTrade({ price_dollars: "0.5", count_fp: "1", taker_side: "yes", taker_action: "sell" });
assert.equal(anonymous.trader_nickname, "");
assert.equal(anonymous.trader_action, "SELL");

const positions = normalizeKalshiLiveHolderPositionRows(
  {
    social_id: "s1",
    visibility_state: "visible",
    holdings: [
      {
        event_ticker: "KXGAME-26SEP28",
        series_ticker: "KXGAME",
        total_absolute_position: 125744,
        market_holdings: [{ market_id: "m1", market_ticker: "KXGAME-26SEP28-SLV", signed_open_position: -125744, pnl: 13220095 }],
      },
    ],
  },
  { nickname: "BitcoinTradingChallenge", status: "closed" },
);
assert.equal(positions.length, 1);
assert.equal(positions[0].side, "NO");
assert.equal(positions[0].position, 125744);
assert.equal(positions[0].signed_position, -125744);
assert.equal(positions[0].pnl, 1322.01);
assert.equal(positions[0].status, "closed");
assert.equal(positions[0].visibility, "visible");
assert.equal(kalshiLiveHiddenPositionRow("Ada").visibility, "hidden");
assert.equal(normalizeKalshiLiveHolderPositionStatus("bogus"), "open");
assert.equal(normalizeKalshiLiveHolderPositionStatus("closed"), "closed");

const metrics = kalshiLiveProfileMetricFields({
  metrics: { pnl: 82370179034, dollars_traded: 659654197535, volume_fp: "111069006.00", open_interest_fp: "383869.00", num_markets_traded: 23271 },
});
assert.equal(metrics.pnl, 8237017.9);
assert.equal(metrics.dollars_traded, 65965419.75);
assert.equal(metrics.volume, 111069006);
assert.equal(metrics.open_interest, 383869);
assert.equal(metrics.num_markets_traded, 23271);
assert.equal(metrics.metrics_period, "all_time");
assert.equal(kalshiLiveProfileMetricFields(null).pnl, null);

console.log("kalshi trader rows ok");
