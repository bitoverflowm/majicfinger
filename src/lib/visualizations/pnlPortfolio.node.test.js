import assert from "node:assert/strict";

import { describeSheet } from "./datasetDescriptor.js";
import { resolveVisualization } from "./presetRegistry.js";
import { pnlPortfolioPoints, pnlPortfolioRanges, portfolioDrawdowns } from "./pnlPortfolio.js";

const sheet = {
  type: "sheet",
  integrationId: "polymarket",
  table: "getTraderPnlSeries",
  columns: [
    { id: "timestamp" },
    { id: "economic_pnl" },
    { id: "realized_pnl" },
    { id: "position_pnl" },
  ],
  cells: {
    "0,0": "1000",
    "1,0": "50",
    "2,0": "40",
    "0,1": "2000",
    "1,1": "",
    "2,1": "",
    "3,1": "",
    "0,2": "3000",
    "1,2": "30",
    "2,2": "20",
  },
};

const dataset = describeSheet(sheet);
assert.equal(dataset.datasetType, "trader_pnl");
assert.equal(dataset.category, "portfolio");
assert.equal(
  resolveVisualization(dataset, { columnIds: ["timestamp", "economic_pnl", "realized_pnl"] }).view,
  "portfolio",
);

const points = pnlPortfolioPoints(sheet);
assert.equal(points.length, 2);
assert.equal(points[0].t, 1000 * 1000);
assert.equal(points[0].value, 50);
assert.equal(points[0].basis, 40);
assert.equal(points[1].value, 30);
assert.equal(points[1].basis, 20);
assert.equal(pnlPortfolioPoints({ columns: [{ id: "timestamp" }, { id: "position_pnl" }], cells: { "0,0": "5", "1,0": "8" } })[0].value, 8);

const rising = portfolioDrawdowns([10, 12, 9]);
assert.equal(rising[0], 0);
assert.equal(rising[1], 0);
assert.ok(Math.abs(rising[2] - ((9 - 12) / 12) * 100) < 1e-9);

const losing = portfolioDrawdowns([-10, -8, -14]);
assert.equal(losing[1], 0);
assert.ok(losing[2] < 0);
assert.ok(Math.abs(losing[2] - ((-14 - -8) / 8) * 100) < 1e-9);

const hourly = pnlPortfolioRanges([
  { t: 0 },
  { t: 3_600_000 },
  { t: 7_200_000 },
]);
assert.equal(hourly.find((range) => range.label === "1W")?.bars, 24 * 7);
assert.equal(hourly.find((range) => range.label === "ALL")?.bars, null);
