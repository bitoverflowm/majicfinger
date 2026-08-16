import assert from "node:assert/strict";

import {
  buildPolymarketTraderLeaderboardQueryValues,
  normalizePolymarketTraderLeaderboardComposeState,
  projectPolymarketTraderLeaderboardEntry,
} from "./traderLeaderboardCompose.js";

{
  const state = normalizePolymarketTraderLeaderboardComposeState({
    category: "sports",
    timePeriod: "week",
    orderBy: "vol",
    limit: 100,
    offset: -4,
  });
  assert.equal(state.category, "SPORTS");
  assert.equal(state.timePeriod, "WEEK");
  assert.equal(state.orderBy, "VOL");
  assert.equal(state.limit, 50);
  assert.equal(state.offset, 0);
  console.log("ok trader leaderboard compose normalization");
}

{
  const values = buildPolymarketTraderLeaderboardQueryValues({
    category: "CRYPTO",
    timePeriod: "MONTH",
    orderBy: "PNL",
    limit: 25,
    offset: 10,
    user: "0x1111111111111111111111111111111111111111",
    userName: "trader",
  });
  assert.deepEqual(values, {
    category: "CRYPTO",
    timePeriod: "MONTH",
    orderBy: "PNL",
    limit: "25",
    offset: "10",
    user: "0x1111111111111111111111111111111111111111",
    userName: "trader",
  });
  console.log("ok trader leaderboard query values");
}

{
  assert.deepEqual(
    projectPolymarketTraderLeaderboardEntry(
      { rank: "1", proxyWallet: "0x1", pnl: 123, vol: 456 },
      ["rank", "pnl"],
    ),
    { rank: "1", pnl: 123 },
  );
  console.log("ok trader leaderboard selected columns");
}
