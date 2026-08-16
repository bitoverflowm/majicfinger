import assert from "node:assert/strict";

import {
  flattenLastTradePricesRows,
  normalizePolymarketLastTradePricesComposeState,
  selectLastTradePriceOutcomeTokens,
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
  assert.equal(state.outcomeSelection, "");
  assert.equal(
    normalizePolymarketLastTradePricesComposeState({ outcomeSelection: "BOTH" }).outcomeSelection,
    "both",
  );
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

test("last trade prices select NO or both outcomes for every market", () => {
  const payload = [
    { token_id: "rain-yes", price: "0.45", side: "BUY" },
    { token_id: "rain-no", price: "0.55", side: "SELL" },
    { token_id: "snow-yes", price: "0.2", side: "SELL" },
    { token_id: "snow-no", price: "0.8", side: "BUY" },
  ];
  const refs = [
    {
      id: "42",
      title: "Will it rain?",
      tokenIds: ["rain-yes", "rain-no"],
      outcomes: ["Yes", "No"],
    },
    {
      id: "43",
      title: "Will it snow?",
      tokenIds: ["snow-yes", "snow-no"],
      outcomes: ["Yes", "No"],
    },
  ];

  const noRows = flattenLastTradePricesRows(payload, refs, undefined, "no");
  assert.deepEqual(
    noRows.map((row) => [row.market_id, row.outcome, row.token_id]),
    [
      ["42", "No", "rain-no"],
      ["43", "No", "snow-no"],
    ],
  );

  const bothRows = flattenLastTradePricesRows(payload, refs, undefined, "both");
  assert.deepEqual(
    bothRows.map((row) => [row.market_id, row.outcome, row.token_id]),
    [
      ["42", "Yes", "rain-yes"],
      ["42", "No", "rain-no"],
      ["43", "Yes", "snow-yes"],
      ["43", "No", "snow-no"],
    ],
  );
});

test("last trade prices fall back to token order for non Yes/No outcomes", () => {
  const refs = [
    {
      id: "77",
      title: "Team Liquid vs Aurora",
      tokenIds: ["liquid-token", "aurora-token"],
      outcomes: ["Team Liquid", "Aurora"],
    },
  ];

  assert.deepEqual(
    selectLastTradePriceOutcomeTokens(refs, "no").map((p) => [p.tokenId, p.outcome]),
    [["aurora-token", "Aurora"]],
  );

  const bothRows = flattenLastTradePricesRows(
    [{ token_id: "aurora-token", price: "0.02", side: "BUY" }],
    refs,
    undefined,
    "both",
  );
  assert.deepEqual(
    bothRows.map((row) => [row.outcome, row.token_id, row.last_trade_price]),
    [
      ["Team Liquid", "liquid-token", ""],
      ["Aurora", "aurora-token", "0.02"],
    ],
  );
});

test("last trade prices tolerate Gamma json string refs", () => {
  const rows = flattenLastTradePricesRows(
    [{ token_id: "no-token", price: "0.85", side: "BUY" }],
    [
      {
        id: "9",
        tokenIds: '["yes-token", "no-token"]',
        outcomes: '["Yes", "No"]',
      },
    ],
    undefined,
    "no",
  );
  assert.deepEqual(
    rows.map((row) => [row.outcome, row.token_id, row.last_trade_price]),
    [["No", "no-token", "0.85"]],
  );
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
