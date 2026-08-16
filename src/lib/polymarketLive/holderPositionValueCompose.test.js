import assert from "node:assert/strict";

import {
  buildPolymarketHolderPositionValueQueryValues,
  normalizePolymarketHolderPositionValueComposeState,
  projectPolymarketHolderPositionValue,
} from "./holderPositionValueCompose.js";

{
  const state = normalizePolymarketHolderPositionValueComposeState({
    addresses: "0xabc",
    market: " 0xmarket ",
  });
  assert.equal(state.addresses, "0xabc");
  assert.deepEqual(buildPolymarketHolderPositionValueQueryValues(state), {
    market: "0xmarket",
  });
  console.log("ok holder position value compose");
}

{
  assert.deepEqual(
    projectPolymarketHolderPositionValue(
      { user: "0x1", value: 123.45 },
      ["user", "value"],
    ),
    { user: "0x1", value: 123.45 },
  );
  console.log("ok holder position value selected columns");
}
