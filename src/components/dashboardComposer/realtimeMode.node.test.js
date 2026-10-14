import assert from "node:assert/strict";

import { showRealtimeMenu, tabHasLiveMarket } from "./realtimeMode.js";
import { cellsFromQueryRows, polymarketReplayPick, sheetReplayKind, sheetReplayRequest } from "./replayTabQueries.js";
import { recordsFromRows } from "./integrationRunSheets.js";
import { sheetRecords } from "@/lib/visualizations/datasetDescriptor.js";
import { sanitizeWorkspaceDashboard } from "@/lib/workspaceDashboardDocument.js";

assert.equal(showRealtimeMenu([{ current: true, on: true }, { current: false, on: false }]), false);
assert.equal(showRealtimeMenu([{ current: true, on: false }, { current: false, on: true }]), true);
assert.equal(showRealtimeMenu([{ current: true, on: true }, { current: false, on: true }]), true);
assert.equal(showRealtimeMenu([{ current: true, on: false }]), false);
assert.equal(
  tabHasLiveMarket([
    { type: "sheet", integrationId: "polymarket", table: "getBatchPricesHistory", pull: { closed: true, closeAt: 1 } },
  ]),
  false,
);
assert.equal(
  tabHasLiveMarket([
    { type: "sheet", integrationId: "polymarket", table: "getBatchPricesHistory", pull: { closed: false, closeAt: Date.parse("2026-11-01T00:00:00Z") } },
  ]),
  true,
);

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

const leaderboard = {
  type: "sheet",
  integrationId: "polymarket",
  table: "getTraderLeaderboard",
  rowCount: 2,
  columns: [
    { id: "user_name" },
    { id: "time_period" },
    { id: "category" },
    { id: "sort_by" },
  ],
  cells: { "1,0": "week", "2,0": "politics", "3,0": "VOLUME" },
};
assert.equal(sheetReplayRequest(leaderboard).rowLimit, 2);
assert.equal(sheetReplayRequest(leaderboard).filters.time_period.value, "week");
assert.equal(sheetReplayRequest(leaderboard).filters.category.value, "politics");
assert.equal(sheetReplayRequest(leaderboard).filters.sort_by.value, "VOLUME");
assert.equal(sheetReplayRequest(leaderboard).address, "");

const stored = sheetReplayRequest({
  type: "sheet",
  table: "getTraderLeaderboard",
  rowCount: 2,
  query: { rowLimit: 2, filters: { time_period: { value: "day" }, category: { value: "overall" }, sort_by: { value: "PNL" } } },
});
assert.equal(stored.rowLimit, 2);
assert.equal(stored.filters.time_period.value, "day");

const positions = sheetReplayRequest({
  type: "sheet",
  table: "getTraderPositions",
  rowCount: 2,
  columns: [{ id: "user" }, { id: "title" }],
  cells: { "0,0": "0xf0318c32136c2db7fec88b84869aee6a1106c80c" },
});
assert.equal(positions.rowLimit, 0);
assert.equal(positions.address, "0xf0318c32136c2db7fec88b84869aee6a1106c80c");

const fromId = sheetReplayRequest({
  id: "run-live-getTraderPositions-0xf0318c32136c2db7fec88b84869aee6a1106c80c",
  type: "sheet",
  table: "getTraderPositions",
  rowCount: 2,
  columns: [{ id: "title" }],
  cells: { "0,0": "Manchester City" },
});
assert.equal(fromId.address, "0xf0318c32136c2db7fec88b84869aee6a1106c80c");
assert.equal(fromId.filters, null);

const pnl = sheetReplayRequest({
  id: "run-live-getTraderPnlSeries-0x6ac5bb06a9eb05641fd5e82640268b92f3ab4b6e",
  type: "sheet",
  table: "getTraderPnlSeries",
  rowCount: 325,
  columns: [{ id: "timestamp" }],
});
assert.equal(pnl.address, "0x6ac5bb06a9eb05641fd5e82640268b92f3ab4b6e");
assert.equal(pnl.filters.interval.value, "max");
assert.equal(pnl.filters.fidelity.value, "1d");

const fromRecords = sheetReplayRequest({
  type: "sheet",
  table: "getTraderLeaderboard",
  rowCount: 2,
  records: [{ time_period: "day", category: "overall", sort_by: "PNL", user_name: "theowalcott" }],
  columns: [{ id: "user_name" }],
});
assert.equal(fromRecords.filters.time_period.value, "day");
assert.equal(fromRecords.filters.sort_by.value, "PNL");

const saved = sanitizeWorkspaceDashboard({
  tabs: [{ id: "welcome", name: "Welcome" }],
  blocks: {
    welcome: [{
      id: "run-getTraderLeaderboard",
      type: "sheet",
      title: "Trader Leaderboard Rankings",
      integrationId: "polymarket",
      table: "getTraderLeaderboard",
      rowCount: 2,
      columns: [{ id: "user_name", title: "User Name" }],
      cells: { "0,0": "BreakTheBank" },
      query: {
        rowLimit: 2,
        filters: { time_period: { value: "day" }, category: { value: "overall" }, sort_by: { value: "PNL" } },
        sortKeys: [{ columnId: "pnl", direction: "desc" }],
      },
    }],
  },
});
const kept = saved.blocks.welcome[0].query;
assert.equal(kept.rowLimit, 2);
assert.equal(kept.filters.sort_by.value, "PNL");
assert.equal(kept.sortKeys[0].columnId, "pnl");

const raw = recordsFromRows(
  [{ id: "current_value" }, { id: "title" }],
  [{ current_value: 361500, title: "Arsenal" }],
);
assert.equal(raw[0].current_value, 361500);
assert.equal(
  sheetRecords({
    columns: [{ id: "current_value" }],
    records: raw,
    cells: { "0,0": "361.5K" },
  })[0].current_value,
  361500,
);

const withRecords = sanitizeWorkspaceDashboard({
  tabs: [{ id: "welcome", name: "Welcome" }],
  blocks: {
    welcome: [{
      id: "run-positions",
      type: "sheet",
      title: "Positions",
      columns: [{ id: "current_value", title: "Value", type: "number" }],
      cells: { "0,0": "361.5K" },
      records: [{ current_value: 361500, title: "Arsenal" }],
      query: { rowLimit: 500000, address: "0xf0318c32136c2db7fec88b84869aee6a1106c80c" },
    }],
  },
});
const walletPull = sanitizeWorkspaceDashboard({
  tabs: [{ id: "welcome", name: "Welcome" }],
  blocks: {
    welcome: [{
      id: "run-live-getTraderPositions-0xf0318c32136c2db7fec88b84869aee6a1106c80c",
      type: "sheet",
      title: "Positions",
      table: "getTraderPositions",
      integrationId: "polymarket",
      pull: { table: "getTraderPositions", address: "0xf0318c32136c2db7fec88b84869aee6a1106c80c", kind: "profile" },
    }],
  },
});
assert.equal(walletPull.blocks.welcome[0].pull.address, "0xf0318c32136c2db7fec88b84869aee6a1106c80c");
assert.equal(walletPull.blocks.welcome[0].pull.kind, "profile");

assert.equal(withRecords.blocks.welcome[0].records[0].current_value, 361500);
assert.equal(withRecords.blocks.welcome[0].cells, undefined);

const lifted = sanitizeWorkspaceDashboard({
  tabs: [{ id: "welcome", name: "Welcome" }],
  blocks: {
    welcome: [{
      id: "run-positions",
      type: "sheet",
      title: "Positions",
      columns: [{ id: "current_value", title: "Value", type: "number" }],
      cells: { "0,0": "361.5K" },
    }],
  },
  tables: [{
    id: "run-positions",
    title: "Positions",
    columns: [{ id: "current_value", title: "Value" }],
    rows: [{ current_value: 361500 }],
  }],
});
assert.equal(lifted.blocks.welcome[0].records[0].current_value, 361500);
assert.equal(lifted.blocks.welcome[0].cells, undefined);
assert.equal(lifted.tables[0].rows.length, 0);

const addressed = sheetReplayRequest({
  type: "sheet",
  table: "getTraderPositions",
  rowCount: 2,
  records: [{ user: "0xf0318c32136c2db7fec88b84869aee6a1106c80c", current_value: 361500 }],
  columns: [{ id: "user" }],
  cells: { "0,0": "not-an-address" },
});
assert.equal(addressed.address, "0xf0318c32136c2db7fec88b84869aee6a1106c80c");

console.log("realtime mode ok");
