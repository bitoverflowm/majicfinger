import assert from "node:assert/strict";

import {
  flattenLastTradePricesRows,
  normalizePolymarketLastTradePricesComposeState,
} from "./lastTradePricesCompose.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("last trade prices compose follows market discovery defaults", () => {
  const state = normalizePolymarketLastTradePricesComposeState({});
  assert.equal(state.mode, "search");
  assert.equal(state.marketsFilters.mode, "advanced");
});

test("last trade prices flatten to one row per market", () => {
  const rows = flattenLastTradePricesRows(
    [
      { token_id: "yes-token", price: "0.45", side: "BUY" },
      { token_id: "other-token", price: "0.52", side: "SELL" },
    ],
    [
      {
        id: "42",
        title: "Will it rain?",
        slug: "will-it-rain",
        conditionId: "0xabc",
        tokenIds: ["yes-token", "no-token"],
        outcomes: ["Yes", "No"],
      },
      {
        id: "43",
        title: "Will it snow?",
        tokenIds: ["other-token", "other-no-token"],
        outcomes: ["Yes", "No"],
      },
    ],
  );

  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], {
    market_id: "42",
    market_title: "Will it rain?",
    market_slug: "will-it-rain",
    condition_id: "0xabc",
    token_id: "yes-token",
    outcome: "Yes",
    last_trade_price: "0.45",
    last_trade_side: "BUY",
  });
  assert.equal(rows[1].last_trade_price, "0.52");
  assert.equal(rows[1].last_trade_side, "SELL");
});

test("last trade prices project selected columns", () => {
  const rows = flattenLastTradePricesRows(
    [{ token_id: "token", price: "0.7", side: "BUY" }],
    [{ id: "1", tokenIds: ["token"] }],
    ["market_id", "last_trade_price", "last_trade_side"],
  );
  assert.deepEqual(rows, [
    { market_id: "1", last_trade_price: "0.7", last_trade_side: "BUY" },
  ]);
});
