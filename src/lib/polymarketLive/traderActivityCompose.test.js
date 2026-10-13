import assert from "node:assert/strict";

import {
  activitySheetRow,
  defaultPolymarketActivityFilters,
  mergePolymarketActivityCohorts,
  polymarketActivityAttributeColumns,
  polymarketActivityPage,
  polymarketActivityPageParams,
  polymarketActivityQuery,
  polymarketActivityTarget,
  polymarketActivityTypes,
  polymarketActivityWalks,
} from "./traderActivityCompose.js";

const CONDITION = `0x${"ab".repeat(32)}`;
const USER = "0x39125313116835eb6a55688350813921c9360246";

const defaults = polymarketActivityQuery(defaultPolymarketActivityFilters());
assert.equal(defaults.type, "");
assert.equal(defaults.side, "");
assert.equal(defaults.exclude_deposits_withdrawals, true);
assert.equal(defaults.conflict, false);
assert.equal(polymarketActivityTypes({ values: ["tip", "TIP", "nope", "TRADE"] }).join(","), "TIP,TRADE");

const query = polymarketActivityQuery({
  type: { values: ["TRADE", "TIP"] },
  condition: { values: [CONDITION, CONDITION, "nope"] },
  side: { value: "buy" },
  event_id: { value: "" },
  time_range: { from: "2026-10-01", to: "2026-10-07" },
  exclude_deposits_withdrawals: { value: "false" },
});
assert.equal(query.type, "TRADE,TIP");
assert.equal(query.condition, CONDITION);
assert.equal(query.side, "BUY");
assert.equal(query.exclude_deposits_withdrawals, false);
assert.equal(query.conflict, false);
assert.ok(query.start > 0 && query.end > query.start);

const both = polymarketActivityQuery({
  condition: { values: [CONDITION] },
  event_id: { value: "12, 12, no, 4" },
});
assert.equal(both.event_id, "12,4");
assert.equal(both.conflict, true);

const first = polymarketActivityPageParams(USER, query, "", 50);
assert.equal(first.user, USER);
assert.equal(first.limit, "50");
assert.equal(first.type, "TRADE,TIP");
assert.equal(first.side, "BUY");
assert.equal(first.condition, CONDITION);
assert.equal(first.exclude_deposits_withdrawals, "false");
assert.equal("cursor" in first, false);
assert.equal("sort_by" in first, false);
assert.equal("sort_direction" in first, false);

const next = polymarketActivityPageParams(USER, query, "cursor-1", 5000);
assert.equal(next.cursor, "cursor-1");
assert.equal(next.limit, "1000");
assert.equal(next.type, "TRADE,TIP");
assert.equal(next.start, String(query.start));

assert.equal(polymarketActivityTarget({ preview: true }), 50);
assert.equal(polymarketActivityTarget({ preview: true, planLimit: 20 }), 20);
assert.equal(polymarketActivityTarget({ rowLimit: 1000, planLimit: 500000 }), 1000);
assert.equal(polymarketActivityTarget({ planLimit: 500000 }), 500000);

const many = Array.from({ length: 21 }, (_, index) => `0x${index.toString(16).padStart(64, "0")}`);
assert.equal(polymarketActivityWalks(polymarketActivityQuery({ condition: { values: many } })).length, 2);

const page = polymarketActivityPage([{ data: [{ type: "TRADE", price: 0 }], pagination: { next_cursor: "next" } }]);
assert.equal(page.rows.length, 1);
assert.equal(page.cursor, "next");
assert.equal(polymarketActivityPage([{ data: null }]).rows.length, 0);

const row = activitySheetRow(
  {
    timestamp: 1791687896,
    type: "TRADE",
    title: "Will it rain?",
    size: 1.081,
    usdc_size: 0,
    price: 0,
    outcome_index: 999,
    condition_id: CONDITION,
    side: "BUY",
    proxy_wallet: USER,
  },
  USER,
);
assert.equal(row.timestamp, 1791687896);
assert.equal(row.price, 0);
assert.equal(row.usdc_size, 0);
assert.equal(row.outcome_index, 999);
assert.equal(row.is_combo, false);
assert.equal(row.user, USER);

const merged = mergePolymarketActivityCohorts(
  [
    [row, { ...row, transaction_hash: "0x2" }],
    [{ ...row, transaction_hash: "0x2" }, { ...row, transaction_hash: "0x3" }],
  ],
  10,
);
assert.equal(merged.length, 3);

const attributes = polymarketActivityAttributeColumns([{ id: "title" }, { id: "type" }, { id: "side" }]);
assert.deepEqual(attributes.slice(0, 6).map((column) => column.id), [
  "type",
  "side",
  "condition",
  "event_id",
  "time_range",
  "exclude_deposits_withdrawals",
]);
assert.equal(attributes[0].control, "multi-add");
assert.equal(attributes[0].enumOptions.some((option) => option[0] === "TIP"), true);
assert.equal(attributes.filter((column) => column.id === "type").length, 1);
assert.equal(attributes.some((column) => column.id === "title"), true);
assert.equal(attributes.at(-1).id, "title");

console.log("ok trader activity compose");
