import assert from "node:assert/strict";

import {
  expandOrderBookSummaryToRows,
  normalizePolymarketOrderbooksComposeState,
  normalizePolymarketOrderbooksSide,
  orderbooksMarketRefFromSuggestion,
  parseTokenIdList,
} from "./orderbooksCompose.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("orderbooks side normalizes", () => {
  assert.equal(normalizePolymarketOrderbooksSide("buy"), "buy");
  assert.equal(normalizePolymarketOrderbooksSide("sell"), "sell");
  assert.equal(normalizePolymarketOrderbooksSide("both"), "both");
  assert.equal(normalizePolymarketOrderbooksSide("nope"), "both");
});

test("parseTokenIdList accepts json string and csv", () => {
  assert.deepEqual(parseTokenIdList('["111","222"]'), ["111", "222"]);
  assert.deepEqual(parseTokenIdList("111, 222"), ["111", "222"]);
});

test("compose defaults include side and meta layout", () => {
  const s = normalizePolymarketOrderbooksComposeState({});
  assert.equal(s.side, "both");
  assert.equal(s.sheetLayout, "meta_plus_per_market");
  assert.equal(s.mode, "search");
});

test("market ref extracts clobTokenIds from suggestion raw", () => {
  const ref = orderbooksMarketRefFromSuggestion({
    entity: "market",
    id: "42",
    slug: "will-it-rain",
    conditionId: "0xabc",
    title: "Will it rain?",
    raw: {
      clobTokenIds: '["yes-token","no-token"]',
      outcomes: '["Yes","No"]',
    },
  });
  assert.ok(ref);
  assert.deepEqual(ref.tokenIds, ["yes-token", "no-token"]);
  assert.deepEqual(ref.outcomes, ["Yes", "No"]);
});

test("expand orderbook filters by side and stamps outcome", () => {
  const book = {
    market: "0xabc",
    asset_id: "yes-token",
    timestamp: "1",
    bids: [{ price: "0.55", size: "10" }],
    asks: [{ price: "0.57", size: "8" }],
    last_trade_price: "0.56",
  };
  const meta = {
    id: "42",
    title: "Will it rain?",
    conditionId: "0xabc",
    tokenIds: ["yes-token", "no-token"],
    outcomes: ["Yes", "No"],
  };
  const both = expandOrderBookSummaryToRows(book, { side: "both", marketMeta: meta });
  assert.equal(both.length, 2);
  assert.equal(both[0].side, "BUY");
  assert.equal(both[1].side, "SELL");
  assert.equal(both[0].outcome, "Yes");
  assert.equal(both[0].market_title, "Will it rain?");

  const buy = expandOrderBookSummaryToRows(book, { side: "buy", marketMeta: meta });
  assert.equal(buy.length, 1);
  assert.equal(buy[0].side, "BUY");

  const sell = expandOrderBookSummaryToRows(book, {
    side: "sell",
    marketMeta: meta,
    selectedColumns: ["side", "price", "size"],
  });
  assert.equal(sell.length, 1);
  assert.deepEqual(Object.keys(sell[0]).sort(), ["price", "side", "size"]);
});
