import assert from "node:assert/strict";

import {
  buildPolymarketClosedPositionsQueryValues,
  normalizePolymarketClosedPositionsComposeState,
  projectPolymarketClosedPosition,
} from "./closedPositionsCompose.js";

{
  const state = normalizePolymarketClosedPositionsComposeState({
    limit: 500,
    offset: -1,
    sortBy: "timestamp",
    sortDirection: "asc",
  });
  assert.equal(state.limit, 50);
  assert.equal(state.offset, 0);
  assert.equal(state.sortBy, "TIMESTAMP");
  assert.equal(state.sortDirection, "ASC");
  console.log("ok closed positions compose normalization");
}

{
  const values = buildPolymarketClosedPositionsQueryValues({
    addresses: "",
    market: "",
    eventId: "123",
    title: "election",
    limit: 10,
    offset: 0,
    sortBy: "REALIZEDPNL",
    sortDirection: "DESC",
  });
  assert.equal(values.eventId, "123");
  assert.equal(values.title, "election");
  assert.equal(values.limit, "10");
  console.log("ok closed positions query values");
}

{
  assert.throws(
    () => buildPolymarketClosedPositionsQueryValues({ market: "0xabc", eventId: "123" }),
    /not both/,
  );
  console.log("ok closed positions rejects market and event filters together");
}

{
  assert.deepEqual(
    projectPolymarketClosedPosition(
      { proxyWallet: "0x1", title: "Market", realizedPnl: 12 },
      ["proxyWallet", "realizedPnl"],
    ),
    { proxyWallet: "0x1", realizedPnl: 12 },
  );
  console.log("ok closed positions selected columns");
}
