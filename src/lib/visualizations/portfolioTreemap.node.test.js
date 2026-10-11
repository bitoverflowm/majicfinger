import assert from "node:assert/strict";

import { SPECTRUM_HEAT_DEFAULTS } from "@/components/spectrumui/charts/heatmapColors.js";
import { describeSheet } from "./datasetDescriptor.js";
import { hasVisualTable, isStatsDataset, resolveVisualization, visualizationChoices } from "./presetRegistry.js";
import { buildVisualTable, formatPositionUsd, marketMonogram } from "./visualTable.js";
import { formatPnl4, pnlColorCap, pnlFill, positionTreemapModel, zeroValueSummary } from "./portfolioTreemap.js";

const sheet = {
  type: "sheet",
  integrationId: "polymarket",
  table: "getTraderPositions",
  columns: [
    { id: "title" },
    { id: "outcome" },
    { id: "current_value" },
    { id: "unrealized_pnl" },
  ],
  cells: {
    "0,0": "Highest temperature in London",
    "1,0": "Yes",
    "2,0": "1.5",
    "3,0": "-0.0051",
    "0,1": "P2P",
    "1,1": "No",
    "2,1": "0",
    "3,1": "-10.6999",
    "0,4": "Highest temperature in Madrid",
    "1,4": "Yes",
    "2,4": "0.4",
    "3,4": "0.02",
  },
};

const dataset = describeSheet(sheet);
assert.equal(dataset.datasetType, "trader_positions");
assert.equal(dataset.category, "portfolio");
assert.equal(isStatsDataset(dataset), false);
assert.equal(hasVisualTable(dataset), true);
assert.deepEqual(
  visualizationChoices(dataset, ["title", "outcome", "current_value", "unrealized_pnl"]).map((choice) => choice.label),
  ["Portfolio", "Visual Table"],
);
assert.equal(
  resolveVisualization(dataset, {
    columnIds: ["title", "outcome", "current_value", "unrealized_pnl"],
  }).view,
  "treemap",
);
assert.equal(
  resolveVisualization(
    describeSheet({
      type: "sheet",
      integrationId: "polymarket",
      table: "getCurrentPositions",
      columns: [{ id: "title" }, { id: "currentValue" }],
    }),
  ).view,
  "bars",
);

const model = positionTreemapModel(sheet, dataset);
assert.deepEqual(
  model.tiles.map((tile) => tile.label),
  ["Highest temperature in London · Yes", "Highest temperature in Madrid · Yes"],
);
assert.equal(model.tiles[0].row, 0);
assert.equal(model.tiles[1].row, 4);
assert.equal(model.zeros.length, 1);
assert.equal(model.zeros[0].row, 1);
assert.equal(model.zeros[0].label, "P2P · No");
assert.equal(model.summary, "1 zero-value position · −10.6999 USDC unrealized P&L");
assert.equal(model.cap, 0.02);
assert.equal(pnlColorCap([{ pnl: -10.6999 }, { pnl: -0.0051 }]), 10.6999);

const palette = SPECTRUM_HEAT_DEFAULTS.light;
assert.equal(pnlFill(-0.0051, 2, palette), palette.flat);
assert.equal(pnlFill(-2, 2, palette).toLowerCase(), palette.down.toLowerCase());
const subtle = pnlFill(-0.0051, 0.02, palette);
const loud = pnlFill(0.02, 0.02, palette);
assert.notEqual(subtle, loud);
assert.equal(loud.toLowerCase(), palette.up.toLowerCase());
assert.equal(formatPnl4(-0.0051), "−0.0051");
assert.equal(formatPnl4(0.02), "+0.0200");
assert.equal(
  zeroValueSummary([
    { pnl: -10.6999 },
    { pnl: -0.005 },
  ]),
  "2 zero-value positions · −10.7049 USDC unrealized P&L",
);

const log = buildVisualTable(
  [
    {
      title: "Highest temperature in London",
      outcome: "Yes",
      status: "OPEN",
      icon: "https://images.example/london.png",
      current_size: 1.8835,
      current_value: 1.5,
      unrealized_pnl: -0.0051,
      name: "Zoomify",
    },
    {
      title: "Over $8M committed to the P2P Protocol public sale?",
      outcome: "Yes",
      status: "REDEEMABLE",
      current_size: 13.7699,
      current_value: 0,
      unrealized_pnl: -10.6999,
      name: "Zoomify",
    },
  ],
  dataset,
);
assert.deepEqual(log.columns.map((column) => column.id), ["position", "status", "size", "value", "unrealized"]);
assert.deepEqual(log.caption, ["Zoomify"]);
assert.equal(log.rows[0].market, "Highest temperature in London");
assert.equal(log.rows[0].outcome, "Yes");
assert.equal(log.rows[0].status, "Open");
assert.equal(log.rows[0].icon, "https://images.example/london.png");
assert.equal(log.rows[1].status, "Redeemable");
assert.equal(log.rows[1].value, 0);
assert.equal(log.rows[1].pnl, -10.6999);
assert.equal(marketMonogram("Will the highest temperature in Madrid be 30°C on October 12?"), "MA");
assert.equal(marketMonogram("Over $8M committed to the P2P Protocol public sale?"), "P2");
assert.equal(formatPositionUsd(-0.0051), "−$0.0051");
assert.equal(formatPositionUsd(-10.6999), "−$10.70");

console.log("portfolioTreemap.node.test.js ok");
