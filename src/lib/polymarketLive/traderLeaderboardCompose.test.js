import assert from "node:assert/strict";

import {
  buildPolymarketTraderLeaderboardQueryValues,
  leaderboardSheetRow,
  normalizePolymarketTraderLeaderboardComposeState,
  polymarketLeaderboardAttributeColumns,
  polymarketLeaderboardCategoryOptions,
  polymarketLeaderboardPage,
  polymarketLeaderboardTarget,
  projectPolymarketTraderLeaderboardEntry,
} from "./traderLeaderboardCompose.js";

{
  const state = normalizePolymarketTraderLeaderboardComposeState({
    category: "SPORTS",
    timePeriod: "week",
    orderBy: "vol",
    limit: 2500,
    offset: 10,
  });
  assert.equal(state.category, "sports");
  assert.equal(state.time_period, "week");
  assert.equal(state.sort_by, "VOLUME");
  assert.equal(state.limit, 1000);
  assert.equal(state.offset, undefined);
  console.log("ok trader leaderboard compose normalization");
}

{
  const values = buildPolymarketTraderLeaderboardQueryValues({
    category: "crypto",
    time_period: "month",
    sort_by: "PNL",
    limit: 25,
    user: "0x1111111111111111111111111111111111111111",
  });
  assert.deepEqual(values, {
    time_period: "month",
    category: "crypto",
    user: "0x1111111111111111111111111111111111111111",
  });
  console.log("ok trader leaderboard query values");
}

{
  const row = leaderboardSheetRow(
    {
      rank: 4,
      user_id: "0xabc",
      user_name: "Ada",
      pnl: 12.5,
      volume: 80,
      verified: true,
      profile_image: "https://img",
      x_username: "ada",
    },
    { time_period: "day", category: "sports", sort_by: "PNL", user: "" },
  );
  assert.equal(row.time_period, "day");
  assert.equal(row.category, "sports");
  assert.equal(row.sort_by, "PNL");
  assert.equal(row.user, "");
  assert.equal(row.rank, 4);
  assert.equal(row.user_id, "0xabc");
  assert.equal(row.pnl, 12.5);
  assert.equal(row.volume, 80);
  assert.equal(row.verified, true);

  const lookedUp = leaderboardSheetRow(
    { user_id: "0xabc", rank_pnl: 3, rank_volume: 9, pnl: 1, volume: 2 },
    { time_period: "all", category: "overall", sort_by: "VOLUME", user: "0xabc" },
  );
  assert.equal(lookedUp.rank, 9);
  assert.equal(lookedUp.user, "0xabc");
  console.log("ok trader leaderboard sheet row");
}

{
  const page = polymarketLeaderboardPage({
    data: [{ rank: 1, user_id: "0x1" }],
    pagination: { next_cursor: "cursor-2", has_more: true },
  });
  assert.equal(page.rows.length, 1);
  assert.equal(page.cursor, "cursor-2");
  const wrapped = polymarketLeaderboardPage([{
    data: [{ rank: 2, user_id: "0x2" }],
    pagination: { next_cursor: "next" },
  }]);
  assert.equal(wrapped.rows[0].rank, 2);
  assert.equal(wrapped.cursor, "next");
  const standing = polymarketLeaderboardPage({ data: { user_id: "0x1", rank_pnl: 0 } });
  assert.equal(standing.single, true);
  assert.equal(standing.rows[0].rank_pnl, 0);
  console.log("ok trader leaderboard page");
}

{
  const options = polymarketLeaderboardCategoryOptions();
  const values = options.map(([value]) => value);
  assert.equal(options[0][0], "overall");
  assert.ok(values.includes("sports"));
  assert.ok(values.includes("politics"));
  assert.ok(values.includes("crypto"));
  assert.ok(values.includes("combos"));
  assert.ok(values.includes("esports"));
  assert.equal(new Set(values).size, values.length);
  const attributes = polymarketLeaderboardAttributeColumns([
    { id: "pnl", title: "Pnl", type: "number" },
    { id: "rank", title: "Rank", type: "number" },
  ]);
  assert.deepEqual(
    attributes.slice(0, 5).map((column) => column.id),
    ["time_period", "category", "sort_by", "user", "limit"],
  );
  assert.equal(attributes.find((column) => column.id === "category")?.queryOnly, true);
  assert.equal(attributes.find((column) => column.id === "category")?.control, "period");
  assert.ok(attributes.find((column) => column.id === "category")?.enumOptions?.some(([value]) => value === "sports"));
  assert.equal(attributes.find((column) => column.id === "pnl")?.queryOnly, undefined);
  console.log("ok trader leaderboard category dropdown");
}

{
  assert.equal(polymarketLeaderboardTarget({ limit: { value: "2500" } }, { preview: true }), 50);
  assert.equal(polymarketLeaderboardTarget({ limit: { value: "10" } }, { preview: true }), 10);
  assert.equal(
    polymarketLeaderboardTarget({ limit: { value: "2500" } }, { rowLimit: 500000, planLimit: 500000 }),
    2500,
  );
  assert.equal(
    polymarketLeaderboardTarget({ limit: { value: "2500" } }, { rowLimit: 100, planLimit: 500000 }),
    100,
  );
  console.log("ok trader leaderboard target");
}

{
  assert.deepEqual(
    projectPolymarketTraderLeaderboardEntry(
      { rank: 1, user_id: "0x1", pnl: 123, volume: 456 },
      ["rank", "pnl"],
      { sort_by: "PNL" },
    ),
    {
      rank: 1,
      user_id: "0x1",
      user_name: "",
      pnl: 123,
      volume: 456,
      verified: "",
      profile_image: "",
      x_username: "",
      user: "",
      time_period: "day",
      category: "overall",
      sort_by: "PNL",
    },
  );
  console.log("ok trader leaderboard selected columns");
}
