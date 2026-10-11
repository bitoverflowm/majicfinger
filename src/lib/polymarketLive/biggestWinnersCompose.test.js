import assert from "node:assert/strict";

import {
  biggestWinnerEventLink,
  biggestWinnerSheetRow,
  polymarketBiggestWinnersPage,
  polymarketBiggestWinnersQuery,
  polymarketBiggestWinnersTarget,
  polymarketBiggestWinnersAttributeColumns,
} from "./biggestWinnersCompose.js";

const combo = biggestWinnerSheetRow(
  {
    win_rank: 4,
    kind: "combo",
    user_id: "0xabc",
    user_name: "ComboFan",
    pnl: 1200,
    initial_value: 40,
    final_value: 1240,
    resolved_at: 1710000000,
    condition_id: "0xcombo",
    position_id: "99",
    event_id: 0,
    event_slug: "",
    event_title: "Will A happen? / Will B happen?",
    profile_image: "",
  },
  { time_period: "week", category: "combos" },
);
assert.equal(combo.kind, "combo");
assert.equal(combo.event_id, 0);
assert.equal(combo.event_slug, "");
assert.equal(combo.event_title, "Will A happen? / Will B happen?");
assert.equal(combo.event_link, "");
assert.equal(biggestWinnerEventLink(combo), "");
assert.equal(combo.time_period, "week");
assert.equal(combo.category, "combos");

const market = biggestWinnerSheetRow(
  {
    win_rank: 1,
    kind: "market",
    user_name: "Zoomify",
    pnl: "9900",
    event_id: 42,
    event_slug: "fed-decision",
    event_title: "Fed decision",
  },
  { time_period: "day", category: "overall" },
);
assert.equal(market.event_link, "https://polymarket.com/event/fed-decision");
assert.equal(market.pnl, 9900);

const wrapped = polymarketBiggestWinnersPage([
  {
    data: [{ win_rank: 1, kind: "market" }],
    pagination: { next_cursor: "abc", has_more: true },
  },
]);
assert.equal(wrapped.rows.length, 1);
assert.equal(wrapped.cursor, "abc");
assert.equal(polymarketBiggestWinnersPage({ data: [], pagination: { next_cursor: null } }).cursor, "");

const query = polymarketBiggestWinnersQuery({
  time_period: { value: "month" },
  category: { value: "esports" },
});
assert.deepEqual(query, { time_period: "month", category: "esports" });
assert.equal(polymarketBiggestWinnersTarget({ preview: true }), 50);
assert.equal(polymarketBiggestWinnersTarget({ rowLimit: 10, preview: true }), 10);
assert.equal(polymarketBiggestWinnersTarget({ rowLimit: 5000, planLimit: 500000 }), 5000);
assert.equal(polymarketBiggestWinnersTarget({ rowLimit: 900000, planLimit: 500000 }), 500000);

const attributes = polymarketBiggestWinnersAttributeColumns([
  { id: "pnl", title: "PnL" },
  { id: "kind", title: "Kind" },
]);
assert.deepEqual(
  attributes.map((column) => column.id),
  ["time_period", "category", "pnl", "kind"],
);
assert.equal(attributes.find((column) => column.id === "category")?.queryOnly, true);
assert.ok(attributes.find((column) => column.id === "category")?.enumOptions.some(([slug]) => slug === "combos"));
assert.ok(attributes.find((column) => column.id === "category")?.enumOptions.some(([slug]) => slug === "esports"));

console.log("ok biggest winners compose");
