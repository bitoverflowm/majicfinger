import assert from "node:assert/strict";

import {
  emptyPolymarketPricesHistoryComposeState,
  flattenPricesHistoryRowsForMarket,
  minimumPolymarketPricesHistoryFidelity,
  normalizePolymarketPricesHistoryComposeState,
  normalizePolymarketPricesHistoryFidelity,
  selectPricesHistoryOutcomeTokens,
  POLYMARKET_PRICES_HISTORY_ENDPOINT_ID,
  POLYMARKET_PRICES_HISTORY_MAX_MARKETS_PER_REQUEST,
} from "./pricesHistoryCompose.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("prices history compose defaults and normalization", () => {
  const empty = emptyPolymarketPricesHistoryComposeState();
  assert.equal(empty.mode, "search");
  assert.equal(empty.outcomeSelection, "");
  assert.equal(empty.separateSheetPerOutcome, false);
  assert.equal(empty.windowMode, "interval");
  assert.equal(empty.interval, "max");
  assert.equal(empty.fidelity, 1);
  assert.equal(empty.sheetLayout, "meta_plus_per_market");

  const normalized = normalizePolymarketPricesHistoryComposeState({
    mode: "advanced",
    outcomeSelection: "BOTH",
    separateSheetPerOutcome: true,
    interval: "1w",
    fidelity: 60,
    startTs: "1700000000",
    endTs: "1700086400",
  });
  assert.equal(normalized.mode, "advanced");
  assert.equal(normalized.outcomeSelection, "both");
  assert.equal(normalized.separateSheetPerOutcome, true);
  assert.equal(normalized.windowMode, "date_range");
  assert.equal(normalized.interval, "1w");
  assert.equal(normalized.fidelity, 60);
  assert.equal(normalized.startTs, "1700000000");
  assert.equal(POLYMARKET_PRICES_HISTORY_ENDPOINT_ID, "getBatchPricesHistory");
  assert.equal(POLYMARKET_PRICES_HISTORY_MAX_MARKETS_PER_REQUEST, 20);
});

test("prices history fidelity falls back to 1 for unsupported values", () => {
  assert.equal(normalizePolymarketPricesHistoryFidelity(7), 1);
  assert.equal(normalizePolymarketPricesHistoryFidelity(15), 15);
  assert.equal(normalizePolymarketPricesHistoryFidelity("1440"), 1440);
  assert.equal(minimumPolymarketPricesHistoryFidelity("1m"), 10);
  assert.equal(minimumPolymarketPricesHistoryFidelity("1w"), 5);
  assert.equal(minimumPolymarketPricesHistoryFidelity("1d"), 1);

  assert.equal(
    normalizePolymarketPricesHistoryComposeState({
      interval: "1m",
      fidelity: 1,
    }).fidelity,
    10,
  );
  assert.equal(
    normalizePolymarketPricesHistoryComposeState({
      interval: "1m",
      fidelity: 1,
      startTs: "1700000000",
      endTs: "1700086400",
    }).fidelity,
    1,
  );
  assert.equal(
    normalizePolymarketPricesHistoryComposeState({
      windowMode: "interval",
      interval: "1m",
      fidelity: 1,
      startTs: "1700000000",
      endTs: "1700086400",
    }).fidelity,
    10,
  );
});

test("prices history selects yes/no/both tokens including non Yes/No labels", () => {
  const refs = [
    {
      id: "1",
      title: "Will it rain?",
      tokenIds: ["rain-yes", "rain-no"],
      outcomes: ["Yes", "No"],
    },
    {
      id: "2",
      title: "Liquid vs Aurora",
      tokenIds: ["liq", "aur"],
      outcomes: ["Team Liquid", "Aurora"],
    },
  ];
  assert.deepEqual(
    selectPricesHistoryOutcomeTokens(refs, "yes").map((p) => p.tokenId),
    ["rain-yes", "liq"],
  );
  assert.deepEqual(
    selectPricesHistoryOutcomeTokens(refs, "no").map((p) => [p.tokenId, p.outcome]),
    [
      ["rain-no", "No"],
      ["aur", "Aurora"],
    ],
  );
  assert.equal(selectPricesHistoryOutcomeTokens(refs, "both").length, 4);
});

test("prices history flattens batch history per market and sorts by time", () => {
  const ref = {
    id: "42",
    title: "Will it rain?",
    slug: "will-it-rain",
    conditionId: "0xabc",
    tokenIds: ["yes-token", "no-token"],
    outcomes: ["Yes", "No"],
  };
  const rows = flattenPricesHistoryRowsForMarket(
    {
      "yes-token": [
        { t: 200, p: 0.4 },
        { t: 100, p: 0.3 },
      ],
      "no-token": [{ t: 150, p: 0.7 }],
    },
    ref,
    [
      { tokenId: "yes-token", outcome: "Yes" },
      { tokenId: "no-token", outcome: "No" },
    ],
  );
  assert.equal(rows.length, 3);
  assert.deepEqual(
    rows.map((r) => [r.t, r.outcome, r.p]),
    [
      [100, "Yes", 0.3],
      [150, "No", 0.7],
      [200, "Yes", 0.4],
    ],
  );
  assert.equal(rows[0].timestamp, new Date(100 * 1000).toISOString());
  assert.equal(rows[0].market_title, "Will it rain?");
});

test("prices history empty history yields empty sheet rows", () => {
  const rows = flattenPricesHistoryRowsForMarket(
    { "yes-token": [] },
    { id: "1", tokenIds: ["yes-token"], outcomes: ["Yes"] },
    [{ tokenId: "yes-token", outcome: "Yes" }],
  );
  assert.deepEqual(rows, []);
});

test("prices history projects selected columns", () => {
  const rows = flattenPricesHistoryRowsForMarket(
    { tok: [{ t: 1, p: 0.5 }] },
    { id: "9", title: "Q", tokenIds: ["tok"] },
    [{ tokenId: "tok", outcome: "Yes" }],
    ["market_id", "p", "t"],
  );
  assert.deepEqual(rows, [{ market_id: "9", p: 0.5, t: 1 }]);
});
