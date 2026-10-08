import assert from "node:assert/strict";

import { showRealtimeMenu } from "./realtimeMode.js";
import { cellsFromQueryRows, polymarketReplayPick, sheetReplayKind } from "./replayTabQueries.js";

assert.equal(showRealtimeMenu([{ current: true, on: true }, { current: false, on: false }]), false);
assert.equal(showRealtimeMenu([{ current: true, on: false }, { current: false, on: true }]), true);
assert.equal(showRealtimeMenu([{ current: true, on: true }, { current: false, on: true }]), true);
assert.equal(showRealtimeMenu([{ current: true, on: false }]), false);

const history = {
  type: "sheet",
  integrationId: "polymarket",
  table: "getBatchPricesHistory",
  pull: { table: "getBatchPricesHistory", tokens: ["1"] },
};
assert.equal(sheetReplayKind(history), "polymarket");
assert.equal(sheetReplayKind({ type: "sheet", enrichment: { operation: "function" }, integrationId: "polymarket", table: "getMarkets" }), "");
assert.equal(
  sheetReplayKind({ type: "sheet", provenance: { kind: "compose", lake: "kalshi", table: "trades" } }),
  "compose",
);

const cells = cellsFromQueryRows(
  [
    { id: "t", type: "number", exact: true, title: "T" },
    { id: "p", type: "number", title: "P" },
  ],
  [
    { t: 1791447563, p: 0.0035 },
    { t: 1791447496, p: 0.0035 },
  ],
);
assert.equal(cells["0,0"], "1791447563");
assert.equal(cells["0,1"], "1791447496");
assert.notEqual(cells["0,0"], cells["0,1"]);

const fromGrid = polymarketReplayPick({
  title: "Price History",
  columns: [{ id: "market_title" }, { id: "token_id" }],
  cells: { "1,2175": "30206184746199268756" },
});
assert.deepEqual(fromGrid.tokenIds, ["30206184746199268756"]);
assert.equal(
  polymarketReplayPick({ title: "Price History", columns: [{ id: "token_id" }], cells: {} }),
  null,
);

console.log("realtime mode ok");
