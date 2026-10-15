import assert from "node:assert/strict";
import { claimSheetId, layoutRunCharts, layoutRunSheets } from "./integrationRunSheets.js";

const sheets = layoutRunSheets(
  [
    { id: "events", title: "Events", span: "full", columns: [{ id: "title" }], rows: [{ title: "A" }] },
    { id: "markets", title: "Markets", columns: [{ id: "title" }], rows: [{ title: "B" }] },
  ],
  { originY: 88 },
);
const charts = new Map([
  ["events", [{ id: "chart-events-treemap", type: "chart", sourceSheetId: "events", w: 540, h: 360 }]],
]);
const held = layoutRunCharts(sheets, charts, { holdSheetId: "events" });
assert.equal(held.charts.length, 0);
assert.equal(held.sheets[0].y, 88);

const shown = layoutRunCharts(sheets, charts);
assert.equal(shown.charts.length, 1);
assert.equal(shown.charts[0].x, 28);
assert.equal(shown.charts[0].y, 88 + 420 + 16);
assert.ok(shown.sheets[1].y > shown.charts[0].y);

const occupied = new Set(["run-series", "chart-run-series-treemap"]);
const claimed = new Map();
assert.equal(claimSheetId("run-series", occupied, claimed), "run-series-2");
assert.equal(claimSheetId("run-series", occupied, claimed), "run-series-2");
assert.equal(claimSheetId("run-events", occupied, claimed), "run-events");
occupied.add("run-series-2");
const again = new Map();
assert.equal(claimSheetId("run-series", occupied, again), "run-series-3");

console.log("run chart layout ok");
