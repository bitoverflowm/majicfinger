import assert from "node:assert/strict";

import {
  mergePolymarketPositionCohorts,
  mergePolymarketPositionMarkets,
  polymarketPositionAttributeColumns,
  polymarketPositionPage,
  polymarketPositionPageParams,
  polymarketPositionQuery,
  polymarketPositionSort,
  polymarketPositionTarget,
  polymarketPositionWalks,
  positionSheetRow,
} from "./traderPositionsCompose.js";

const CONDITION = `0x${"ab".repeat(32)}`;
const USER = "0x0000000000000000000000000000000000000001";

const openQuery = polymarketPositionQuery(
  {
    status: { value: "OPEN" },
    condition: { value: CONDITION },
    title: { value: "bitcoin" },
    filter_type: { value: "TOKENS" },
    filter_amount: { value: "1" },
    include_archived: { value: "true" },
    time_range: { from: "2026-10-01", to: "2026-10-07" },
    event_id: { value: "12, 12, no, 4" },
  },
  [{ columnId: "current_value", direction: "desc" }],
);
assert.equal(openQuery.status, "OPEN");
assert.equal(openQuery.condition, CONDITION);
assert.equal(openQuery.title, "bitcoin");
assert.equal(openQuery.event_id, "12,4");
assert.equal(openQuery.filter_type, "TOKENS");
assert.equal(openQuery.filter_amount, 1);
assert.equal(openQuery.include_archived, true);
assert.equal(openQuery.sort_by, "CURRENT_VALUE");
assert.equal(openQuery.sort_direction, "DESC");
assert.ok(openQuery.start > 0 && openQuery.end > openQuery.start);

const first = polymarketPositionPageParams(USER, openQuery, "", 50);
assert.equal(first.status, "OPEN");
assert.equal(first.sort_by, "CURRENT_VALUE");
assert.equal(first.condition, CONDITION);
assert.equal(first.limit, "50");

const next = polymarketPositionPageParams(USER, openQuery, "cursor-1", 50);
assert.equal(next.cursor, "cursor-1");
assert.equal(next.condition, CONDITION);
assert.equal(next.title, "bitcoin");
assert.equal(next.start, String(openQuery.start));
assert.equal("status" in next, false);
assert.equal("sort_by" in next, false);
assert.equal("limit" in next, false);

const closed = polymarketPositionQuery(
  { status: { value: "CLOSED" }, include_archived: { value: "true" } },
  [{ columnId: "title", direction: "asc" }, { columnId: "last_event_at", direction: "asc" }],
);
assert.equal(closed.include_archived, false);
assert.equal(closed.sort_by, "TIMESTAMP");
assert.equal(closed.sort_direction, "ASC");
assert.deepEqual(polymarketPositionSort([]), { sort_by: "", sort_direction: "" });

assert.equal(polymarketPositionTarget({ preview: true }), 50);
assert.equal(polymarketPositionTarget({ rowLimit: 1000, planLimit: 500000 }), 1000);
assert.equal(polymarketPositionTarget({ planLimit: 500000 }), 500000);

const page = polymarketPositionPage([{ data: [{ token_id: "1" }], pagination: { next_cursor: "next" } }]);
assert.equal(page.rows.length, 1);
assert.equal(page.cursor, "next");
assert.equal(polymarketPositionPage([{ data: null, pagination: {} }]).rows.length, 0);

const row = positionSheetRow(
  {
    title: "Will it rain?",
    condition_id: CONDITION,
    current_size: 0,
    first_entry_at: 0,
    last_event_at: 1710000000,
    outcome_index: 999,
    redeemable: false,
    verified: true,
    proxy_wallet: USER,
  },
  USER,
);
assert.equal(row.current_size, 0);
assert.equal(row.first_entry_at, "");
assert.equal(row.last_event_at, 1710000000);
assert.equal(row.outcome_index, 999);
assert.equal(row.redeemable, false);
assert.equal(row.user, USER);

const markets = mergePolymarketPositionMarkets([], [row], [USER]);
assert.equal(markets[0][0], CONDITION);
assert.equal(markets[0][1], `Will it rain? · ${CONDITION}`);
assert.equal(mergePolymarketPositionMarkets(markets, [row], [USER]), markets);

const attributes = polymarketPositionAttributeColumns(
  [{ id: "title" }, { id: "current_value" }, { id: "status" }],
  markets,
);
assert.equal(attributes.some((column) => column.id === "sort_by"), false);
assert.equal(attributes.find((column) => column.id === "condition")?.control, "multi-add");
assert.equal(attributes.find((column) => column.id === "status")?.control, "multi-add");
assert.equal(attributes.find((column) => column.id === "condition")?.enumOptions[0][0], CONDITION);

const second = `0x${"cd".repeat(32)}`;
const many = polymarketPositionQuery({
  condition: { values: [CONDITION, CONDITION.toUpperCase(), "nope", second] },
});
assert.equal(many.condition, `${CONDITION},${second}`);
const overflowIds = Array.from({ length: 21 }, (_, index) => `0x${index.toString(16).padStart(64, "0")}`);
const overflow = polymarketPositionQuery({
  status: { values: ["OPEN", "CLOSED"] },
  include_archived: { value: "true" },
  condition: { values: overflowIds },
});
assert.equal(overflow.condition.split(",").length, 21);
assert.deepEqual(overflow.statuses, ["OPEN", "CLOSED"]);
const walks = polymarketPositionWalks(overflow);
assert.equal(walks.length, 4);
assert.equal(walks[0].status, "OPEN");
assert.equal(walks[0].condition.split(",").length, 20);
assert.equal(walks[0].include_archived, true);
assert.equal(walks[1].condition.split(",").length, 1);
assert.equal(walks[2].status, "CLOSED");
assert.equal(walks[2].include_archived, false);
assert.equal(walks[3].include_archived, false);

const merged = mergePolymarketPositionCohorts(
  [
    [{ user: USER, token_id: "1", condition_id: CONDITION, outcome: "Yes", title: "open" }],
    [
      { user: USER, token_id: "1", condition_id: CONDITION, outcome: "Yes", title: "duplicate" },
      { user: USER, token_id: "2", condition_id: CONDITION, outcome: "No", title: "closed" },
    ],
  ],
  10,
);
assert.deepEqual(merged.map((row) => row.title), ["open", "closed"]);
assert.equal(attributes.find((column) => column.id === "time_range")?.control, "query-range");
assert.equal(attributes.find((column) => column.id === "title")?.queryOnly, true);
assert.equal(attributes.some((column) => column.id === "current_value"), true);
