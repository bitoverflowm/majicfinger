import assert from "node:assert/strict";
import {
  WHALE_NOTIONAL_USD,
  annotateTradeIntents,
  mapKalshiTradeRow,
  mapPolymarketTradeRow,
  unwrapPolymarketTradeRows,
} from "./tradesFeedModel.ts";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("Kalshi maps book side + outcome (not PRINT)", () => {
  const row = mapKalshiTradeRow(
    {
      trade_id: "t1",
      yes_price_dollars: "0.46",
      count_fp: "100",
      taker_book_side: "bid",
      taker_outcome_side: "yes",
      taker_side: "yes",
      created_time: "2026-11-27T00:00:00Z",
      is_block_trade: false,
    },
    0,
    "KXTEST",
  );
  assert.equal(row?.action, "buy");
  assert.equal(row?.outcome, "yes");
  assert.equal(row?.fillPrice, 0.46);
  assert.equal(row?.big, false);
});

test("Kalshi block trade and large notional mark BIG", () => {
  const block = mapKalshiTradeRow(
    {
      trade_id: "t2",
      yes_price_dollars: "0.10",
      count_fp: "10",
      taker_book_side: "ask",
      taker_outcome_side: "no",
      created_time: "2026-11-27T00:00:00Z",
      is_block_trade: true,
    },
    0,
    "KXTEST",
  );
  assert.equal(block?.action, "sell");
  assert.equal(block?.outcome, "no");
  assert.equal(block?.big, true);
  assert.equal(block?.blockTrade, true);

  const whale = mapKalshiTradeRow(
    {
      trade_id: "t3",
      yes_price_dollars: "0.50",
      count_fp: String(WHALE_NOTIONAL_USD / 0.5),
      taker_book_side: "bid",
      taker_outcome_side: "yes",
      created_time: "2026-11-27T00:00:00Z",
    },
    0,
    "KXTEST",
  );
  assert.equal(whale?.big, true);
});

test("Polymarket unwraps v2 skipFlatten envelope and maps identity", () => {
  const rows = unwrapPolymarketTradeRows([
    {
      data: [
        {
          proxy_wallet: "0xabc",
          name: "honeli",
          pseudonym: "Watery-Confidentiality",
          side: "BUY",
          outcome: "No",
          price: 0.46,
          size: 200,
          timestamp: 1_700_000_000,
          transaction_hash: "0xhash",
        },
      ],
      pagination: {},
    },
  ]);
  assert.equal(rows.length, 1);
  const mapped = mapPolymarketTradeRow(rows[0], 0, "0xcond", null);
  assert.equal(mapped?.action, "buy");
  assert.equal(mapped?.outcome, "no");
  assert.equal(mapped?.traderLabel, "honeli");
  assert.equal(mapped?.price, 0.54);
  assert.equal(mapped?.fillPrice, 0.46);
});

test("intent heuristics need traderId and real prior fills", () => {
  const annotated = annotateTradeIntents([
    {
      id: "1",
      price: 0.5,
      fillPrice: 0.5,
      action: "buy",
      outcome: "yes",
      traderId: "0x1",
      at: 3,
    },
    {
      id: "2",
      price: 0.5,
      fillPrice: 0.5,
      action: "buy",
      outcome: "yes",
      traderId: "0x1",
      at: 2,
    },
    {
      id: "3",
      price: 0.5,
      fillPrice: 0.5,
      action: "buy",
      outcome: "no",
      traderId: "0x1",
      at: 1,
    },
    {
      id: "4",
      price: 0.5,
      fillPrice: 0.5,
      action: "sell",
      outcome: "yes",
      traderId: "0x2",
      at: 0,
    },
    {
      id: "5",
      price: 0.5,
      fillPrice: 0.5,
      action: "buy",
      outcome: "yes",
      traderId: null,
      at: 0,
    },
  ]);
  assert.equal(annotated[0].intent, "loading_up");
  assert.equal(annotated[1].intent, "building_opposite");
  assert.equal(annotated[2].intent ?? null, null);
  assert.equal(annotated[3].intent, "offloading");
  assert.equal(annotated[4].intent ?? null, null);
});
