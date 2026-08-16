import assert from "node:assert/strict";

import {
  buildPolymarketUserActivityQueryValues,
  normalizePolymarketUserActivityComposeState,
  projectPolymarketUserActivity,
} from "./userActivityCompose.js";

{
  const state = normalizePolymarketUserActivityComposeState({
    types: ["trade", "redeem", "unknown"],
    limit: 900,
    offset: -1,
    sortBy: "cash",
    side: "buy",
  });
  assert.deepEqual(state.types, ["TRADE", "REDEEM"]);
  assert.equal(state.limit, 500);
  assert.equal(state.offset, 0);
  assert.equal(state.sortBy, "CASH");
  assert.equal(state.side, "BUY");
  console.log("ok user activity compose normalization");
}

{
  const values = buildPolymarketUserActivityQueryValues({
    market: "",
    eventId: "123",
    types: ["TRADE", "REDEEM"],
    excludeDepositsWithdrawals: true,
    start: "1700000000",
    end: "1800000000",
    limit: 100,
    offset: 0,
    sortBy: "TIMESTAMP",
    sortDirection: "DESC",
    side: "SELL",
  });
  assert.equal(values.eventId, "123");
  assert.equal(values.type, "TRADE,REDEEM");
  assert.equal(values.side, "SELL");
  console.log("ok user activity query values");
}

{
  assert.throws(
    () => buildPolymarketUserActivityQueryValues({ market: "0xabc", eventId: "123" }),
    /not both/,
  );
  assert.throws(
    () => buildPolymarketUserActivityQueryValues({ start: "20", end: "10" }),
    /after start/,
  );
  console.log("ok user activity query validation");
}

{
  assert.deepEqual(
    projectPolymarketUserActivity(
      { proxyWallet: "0x1", type: "TRADE", usdcSize: 10 },
      ["proxyWallet", "type"],
    ),
    { proxyWallet: "0x1", type: "TRADE" },
  );
  console.log("ok user activity selected columns");
}
