import assert from "node:assert/strict";

import {
  flattenMidpointPricesRows,
  normalizePolymarketMidpointPricesComposeState,
} from "./midpointPricesCompose.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("midpoint prices compose follows market price discovery defaults", () => {
  const state = normalizePolymarketMidpointPricesComposeState({});
  assert.equal(state.mode, "search");
  assert.equal(state.marketsFilters.mode, "advanced");
});

test("midpoint prices flatten to one row per market", () => {
  const rows = flattenMidpointPricesRows(
    {
      "yes-token": "0.46",
      "other-token": "0.62",
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
    midpoint_price: "0.46",
  });
  assert.equal(rows[1].midpoint_price, "0.62");
});

test("midpoint prices project selected columns", () => {
  const rows = flattenMidpointPricesRows(
    { token: "0.25" },
    [{ id: "1", tokenIds: ["token"] }],
    ["market_id", "midpoint_price"],
  );
  assert.deepEqual(rows, [{ market_id: "1", midpoint_price: "0.25" }]);
});
