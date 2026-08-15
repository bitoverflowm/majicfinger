import assert from "node:assert/strict";

import {
  flattenMarketPricesRows,
  normalizePolymarketMarketPricesComposeState,
} from "./marketPricesCompose.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("market price compose defaults to search", () => {
  const state = normalizePolymarketMarketPricesComposeState({});
  assert.equal(state.mode, "search");
  assert.deepEqual(state.marketRefs, []);
  assert.equal(state.marketsFilters.mode, "advanced");
});

test("market price compose preserves resolved token ids", () => {
  const state = normalizePolymarketMarketPricesComposeState({
    marketRefs: [
      {
        id: "42",
        title: "Will it rain?",
        tokenIds: ["yes-token", "no-token"],
        outcomes: ["Yes", "No"],
      },
    ],
  });
  assert.deepEqual(state.marketRefs[0].tokenIds, ["yes-token", "no-token"]);
  assert.deepEqual(state.marketRefs[0].outcomes, ["Yes", "No"]);
});

test("market prices flatten to one row per market with buy and sell columns", () => {
  const rows = flattenMarketPricesRows(
    {
      "yes-token": {
        BUY: 0.45,
        SELL: 0.47,
      },
      "other-token": {
        BUY: 0.61,
        SELL: 0.63,
      },
    },
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
        slug: "will-it-snow",
        conditionId: "0xdef",
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
    buy_price: 0.45,
    sell_price: 0.47,
  });
  assert.equal(rows[1].buy_price, 0.61);
  assert.equal(rows[1].sell_price, 0.63);
});

test("market prices project selected columns", () => {
  const rows = flattenMarketPricesRows(
    { token: { BUY: 0.2, SELL: 0.3 } },
    [{ id: "1", tokenIds: ["token"] }],
    ["market_id", "buy_price", "sell_price"],
  );
  assert.deepEqual(rows, [{ market_id: "1", buy_price: 0.2, sell_price: 0.3 }]);
});
