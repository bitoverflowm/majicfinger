import assert from "node:assert/strict";

import { describeSheet } from "./datasetDescriptor.js";
import { isSavedChartView, resolveVisualization } from "./presetRegistry.js";
import {
  LYCHEE_RED,
  activityDailyCounts,
  activityStackModel,
  defaultActivityCharts,
} from "./activityCharts.js";

const noon = (month, day) => Date.UTC(2026, month, day, 12, 0, 0);

const rows = [
  { ms: noon(9, 12), type: "TRADE", side: "BUY", usdc: 5000 },
  { ms: noon(9, 12), type: "TRADE", side: "BUY", usdc: 1 },
  { ms: noon(9, 12), type: "TRADE", side: "SELL", usdc: 20 },
  { ms: noon(9, 12), type: "REDEEM", side: "", usdc: 9000 },
  { ms: noon(9, 13), type: "SPLIT", side: "", usdc: 1200 },
  { ms: noon(9, 15), type: "TRADE", side: "BUY", usdc: 4 },
  { ms: null, type: "MERGE", side: "BUY", usdc: 99 },
];

const days = activityDailyCounts(rows);
assert.equal(days.length, 4);
assert.deepEqual(days.map((day) => day.value), [4, 1, 0, 1]);
assert.equal(days.reduce((sum, day) => sum + day.value, 0), 6);

const stack = activityStackModel(rows);
assert.deepEqual(stack.data.map((bar) => bar.label), ["Oct 12", "Oct 13", "Oct 15"]);
assert.equal(stack.data[0].tradeBuy, 5001);
assert.equal(stack.data[0].tradeSell, 20);
assert.equal(stack.data[0].redeem, 9000);
assert.equal(stack.data[1].split, 1200);
assert.equal(stack.data[1].tradeBuy, 0);
assert.equal(stack.data[2].tradeBuy, 4);
assert.equal(stack.series[0].id, "tradeBuy");
assert.equal(stack.series[0].label, "Trade · Buy");
assert.equal(stack.series[0].color, LYCHEE_RED);
assert.equal(stack.series.find((series) => series.id === "tradeSell")?.label, "Trade · Sell");
assert.notEqual(stack.series.find((series) => series.id === "tradeSell")?.color, LYCHEE_RED);
assert.equal(stack.series.find((series) => series.id === "redeem")?.label, "Redeem");
assert.deepEqual(stack.series.map((series) => series.id), ["tradeBuy", "tradeSell", "split", "redeem"]);

const empty = activityStackModel([{ ms: null, type: "TRADE", side: "BUY" }]);
assert.deepEqual(empty.data, []);
assert.deepEqual(activityDailyCounts([]), []);

const charts = defaultActivityCharts("Zoomify's activity");
assert.deepEqual(charts.map((chart) => chart.chartView), ["activity-calendar", "activity-stack"]);
assert.deepEqual(charts.map((chart) => chart.title), ["Zoomify's activity · daily", "Zoomify's activity · dollars"]);

const sheet = {
  type: "sheet",
  integrationId: "polymarket",
  table: "getTraderActivity",
  columns: [{ id: "timestamp" }, { id: "type" }],
  cells: { "0,0": String(Math.floor(noon(9, 12) / 1000)), "1,0": "TRADE" },
};
assert.equal(
  resolveVisualization(describeSheet(sheet), { columnIds: ["timestamp", "type"] }).view,
  "activity-calendar",
);
assert.equal(isSavedChartView("activity-calendar"), true);
assert.equal(isSavedChartView("activity-stack"), true);

console.log("activityCharts.node.test.js ok");
