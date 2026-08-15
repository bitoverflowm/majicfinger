import assert from "node:assert/strict";

import {
  flattenSpreadsRows,
  normalizePolymarketSpreadsComposeState,
} from "./spreadsCompose.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("spreads compose follows market discovery defaults", () => {
  const state = normalizePolymarketSpreadsComposeState({});
  assert.equal(state.mode, "search");
  assert.equal(state.marketsFilters.mode, "advanced");
});

test("spreads flatten to one row per market", () => {
  const rows = flattenSpreadsRows(
    {
      "yes-token": "0.02",
      "other-token": "0.015",
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
    spread: "0.02",
  });
  assert.equal(rows[1].spread, "0.015");
});

test("spreads project selected columns", () => {
  const rows = flattenSpreadsRows(
    { token: "0.04" },
    [{ id: "1", tokenIds: ["token"] }],
    ["market_id", "spread"],
  );
  assert.deepEqual(rows, [{ market_id: "1", spread: "0.04" }]);
});
