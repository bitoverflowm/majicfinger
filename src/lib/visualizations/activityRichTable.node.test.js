import assert from "node:assert/strict";

import { describeSheet } from "./datasetDescriptor.js";
import { buildActivityRichTable } from "./activityRichTable.js";
import { hasVisualTable, resolveVisualization, visualPresentationLabel, visualizationChoices } from "./presetRegistry.js";

const sheet = {
  type: "sheet",
  integrationId: "polymarket",
  table: "getTraderActivity",
  columns: [
    { id: "timestamp" },
    { id: "type" },
    { id: "title" },
    { id: "outcome" },
    { id: "side" },
    { id: "size" },
    { id: "usdc_size" },
    { id: "price" },
    { id: "name" },
    { id: "is_combo" },
  ],
  cells: {
    "0,0": "10/12/2026, 12:45:00 AM",
    "1,0": "TRADE",
    "2,0": "Will the highest temperature in Munich be 9°C on October 12?",
    "3,0": "No",
    "4,0": "BUY",
    "5,0": "1.081",
    "6,0": "1.08",
    "7,0": "0.999",
    "8,0": "Zoomify",
    "9,0": "No",
    "0,1": "10/12/2026, 1:10:00 AM",
    "1,1": "SPLIT",
    "2,1": "Will the highest temperature in Munich be 9°C on October 12?",
    "3,1": "Yes",
    "5,1": "4",
    "6,1": "1.2K",
    "7,1": "0",
    "8,1": "Zoomify",
    "0,2": "10/5/2026, 9:00:00 PM",
    "1,2": "REDEEM",
    "2,2": "Election night",
    "6,2": "20",
    "8,2": "Zoomify",
  },
};

const dataset = describeSheet(sheet);
assert.equal(dataset.datasetType, "trader_activity");
assert.equal(hasVisualTable(dataset), true);
assert.equal(visualPresentationLabel(dataset), "Rich Table");
assert.equal(visualPresentationLabel({ datasetType: "trader_positions" }), "Visual Table");
assert.deepEqual(visualizationChoices(dataset, ["timestamp", "type", "title"]), []);
assert.equal(resolveVisualization(dataset, { columnIds: ["timestamp", "type", "title"] }).view, "table");

const model = buildActivityRichTable(
  [
    { timestamp: sheet.cells["0,0"], type: "TRADE", title: sheet.cells["2,0"], outcome: "No", side: "BUY", size: "1.081", usdc_size: "1.08", price: "0.999", name: "Zoomify", is_combo: "No" },
    { timestamp: sheet.cells["0,1"], type: "SPLIT", title: sheet.cells["2,1"], outcome: "Yes", size: "4", usdc_size: "1.2K", price: "0", name: "Zoomify" },
    { timestamp: "10/5/2026, 9:00:00 PM", type: "REDEEM", title: "Election night", usdc_size: "20", name: "Zoomify" },
  ],
  dataset,
);

assert.equal(model.caption, "Zoomify");
assert.deepEqual(model.tags.map((tag) => tag.type), ["TRADE", "SPLIT", "REDEEM"]);
assert.deepEqual(model.tags.map((tag) => tag.count), [1, 1, 1]);
assert.equal(model.rows[1].usdc, 1200);
assert.equal(model.rows[1].price, 0);
assert.equal(model.rows[0].side, "BUY");
assert.equal(model.rows[0].outcome, "No");
assert.equal(model.rows[0].combo, false);
assert.ok(model.rows[0].ms > 1e12);
assert.match(model.rows[0].time, /Oct/);

const tradesOnly = buildActivityRichTable(
  [
    { type: "TRADE", title: "One", timestamp: "1791687896", price: "0", size: "1" },
    { type: "TRADE", title: "Two", timestamp: "1791687956", price: "0.5", size: "2" },
  ],
  dataset,
);
assert.deepEqual(tradesOnly.tags, []);
assert.equal(tradesOnly.rows[0].type, "TRADE");
assert.equal(tradesOnly.rows[0].price, 0);
assert.doesNotMatch(tradesOnly.rows[0].time, /Oct/);

console.log("ok activity rich table");
