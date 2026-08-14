import assert from "node:assert/strict";

import {
  flattenSamplingMarketsRows,
  normalizePolymarketSamplingMarketsComposeState,
} from "./samplingMarketsCompose.js";
import { parseSamplingMarketsPage } from "./polymarketSamplingMarketsPull.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("sampling markets limit normalizes and caps", () => {
  assert.equal(normalizePolymarketSamplingMarketsComposeState({ limit: 25 }).limit, 25);
  assert.equal(normalizePolymarketSamplingMarketsComposeState({ limit: 999999 }).limit, 10000);
  assert.equal(normalizePolymarketSamplingMarketsComposeState({ limit: 0 }).limit, 100);
});

test("sampling page parser unwraps proxy raw response", () => {
  const page = parseSamplingMarketsPage([
    {
      count: 2,
      next_cursor: "abc",
      data: [{ condition_id: "0x1" }, { condition_id: "0x2" }],
    },
  ]);
  assert.equal(page.count, 2);
  assert.equal(page.nextCursor, "abc");
  assert.equal(page.data.length, 2);
});

test("sampling market rows project columns and serialize nested values", () => {
  const rows = flattenSamplingMarketsRows(
    [
      {
        condition_id: "0x1",
        question: "Will it rain?",
        tokens: [{ token_id: "1", outcome: "Yes", price: 0.7 }],
        tags: ["weather", "daily"],
      },
    ],
    ["condition_id", "question", "tokens", "tags"],
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].condition_id, "0x1");
  assert.equal(rows[0].question, "Will it rain?");
  assert.equal(typeof rows[0].tokens, "string");
  assert.equal(rows[0].tags, "weather, daily");
});
