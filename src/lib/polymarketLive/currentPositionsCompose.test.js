import assert from "node:assert/strict";

import {
  buildPolymarketCurrentPositionsQueryValues,
  normalizePolymarketCurrentPositionsComposeState,
  projectPolymarketCurrentPosition,
} from "./currentPositionsCompose.js";

{
  const state = normalizePolymarketCurrentPositionsComposeState({
    limit: 999,
    offset: -2,
    sortBy: "cashpnl",
    sortDirection: "asc",
  });
  assert.equal(state.limit, 500);
  assert.equal(state.offset, 0);
  assert.equal(state.sortBy, "CASHPNL");
  assert.equal(state.sortDirection, "ASC");
  console.log("ok current positions compose normalization");
}

{
  const values = buildPolymarketCurrentPositionsQueryValues({
    addresses: "",
    market: "0xabc",
    eventId: "",
    sizeThreshold: 2,
    redeemable: true,
    mergeable: false,
    includeArchived: false,
    limit: 50,
    offset: 0,
    sortBy: "TOKENS",
    sortDirection: "DESC",
    title: "election",
  });
  assert.equal(values.market, "0xabc");
  assert.equal(values.sizeThreshold, "2");
  assert.equal(values.redeemable, "true");
  assert.equal(values.title, "election");
  console.log("ok current positions query values");
}

{
  assert.throws(
    () =>
      buildPolymarketCurrentPositionsQueryValues({
        market: "0xabc",
        eventId: "123",
      }),
    /not both/,
  );
  console.log("ok current positions rejects market and event filters together");
}

{
  const row = projectPolymarketCurrentPosition(
    { proxyWallet: "0x1", title: "Market", size: 5, cashPnl: 2 },
    ["proxyWallet", "size", "cashPnl"],
  );
  assert.deepEqual(row, { proxyWallet: "0x1", size: 5, cashPnl: 2 });
  console.log("ok current positions selected columns");
}
