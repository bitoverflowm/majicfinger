import assert from "node:assert/strict";

import {
  emptyPolymarketHolderTradedMarketsComposeState,
  normalizePolymarketHolderTradedMarketsComposeState,
  projectPolymarketHolderTradedMarkets,
} from "./holderTradedMarketsCompose.js";

{
  assert.deepEqual(emptyPolymarketHolderTradedMarketsComposeState(), { addresses: "" });
  assert.deepEqual(normalizePolymarketHolderTradedMarketsComposeState(null), { addresses: "" });
  assert.deepEqual(
    normalizePolymarketHolderTradedMarketsComposeState({ addresses: "0xabc", extra: 1 }),
    { addresses: "0xabc" },
  );
  console.log("ok traded markets compose normalization");
}

{
  assert.deepEqual(
    projectPolymarketHolderTradedMarkets({ user: "0xabc", traded: 42 }, "0xabc", []),
    { user: "0xabc", traded: 42 },
  );
  assert.deepEqual(
    projectPolymarketHolderTradedMarkets({ user: "0xabc", traded: 42 }, "0xabc", ["traded"]),
    { traded: 42 },
  );
  console.log("ok traded markets selected columns");
}

{
  assert.deepEqual(projectPolymarketHolderTradedMarkets({ traded: 0 }, "0xdef", []), {
    user: "0xdef",
    traded: 0,
  });
  assert.deepEqual(projectPolymarketHolderTradedMarkets(null, "0xdef", []), {
    user: "0xdef",
    traded: "",
  });
  console.log("ok traded markets fallbacks");
}
