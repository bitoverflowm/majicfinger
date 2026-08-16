import assert from "node:assert/strict";

import {
  buildPolymarketHolderTradesQueryValues,
  normalizePolymarketHolderTradesComposeState,
  projectPolymarketHolderTrade,
} from "./holderTradesCompose.js";

{
  const state = normalizePolymarketHolderTradesComposeState({
    limit: 20000,
    offset: -1,
    filterType: "cash",
    side: "sell",
  });
  assert.equal(state.limit, 10000);
  assert.equal(state.offset, 0);
  assert.equal(state.filterType, "CASH");
  assert.equal(state.side, "SELL");
  console.log("ok holder trades compose normalization");
}

{
  const values = buildPolymarketHolderTradesQueryValues({
    market: "",
    eventId: "123",
    takerOnly: true,
    filterType: "TOKENS",
    filterAmount: "10",
    side: "BUY",
    start: "1700000000",
    end: "1800000000",
    limit: 100,
    offset: 0,
  });
  assert.equal(values.eventId, "123");
  assert.equal(values.filterType, "TOKENS");
  assert.equal(values.filterAmount, "10");
  assert.equal(values.side, "BUY");
  console.log("ok holder trades query values");
}

{
  assert.throws(
    () => buildPolymarketHolderTradesQueryValues({ filterType: "CASH", filterAmount: "" }),
    /together/,
  );
  assert.throws(
    () => buildPolymarketHolderTradesQueryValues({ market: "0xabc", eventId: "123" }),
    /not both/,
  );
  console.log("ok holder trades query validation");
}

{
  assert.deepEqual(
    projectPolymarketHolderTrade(
      { proxyWallet: "0x1", side: "BUY", price: 0.5 },
      ["proxyWallet", "price"],
    ),
    { proxyWallet: "0x1", price: 0.5 },
  );
  console.log("ok holder trades selected columns");
}
