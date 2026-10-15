import assert from "node:assert/strict";

import { isPriceHistorySheet, priceHistoryLines, priceHistoryPoints } from "./priceHistorySeries.js";

const sheet = {
  type: "sheet",
  table: "getBatchPricesHistory",
  columns: [
    { id: "market_title" },
    { id: "t" },
    { id: "timestamp" },
    { id: "p" },
  ],
  cells: {
    "1,1": "1791452844",
    "2,1": "10/8/2026, 3:32:24 PM",
    "3,1": "0.0035",
    "1,0": "1791452719",
    "2,0": "10/8/2026, 3:30:19 PM",
    "3,0": "0.0034",
  },
};

assert.equal(isPriceHistorySheet(sheet), true);
assert.equal(isPriceHistorySheet({ type: "sheet", table: "trades", columns: [{ id: "yes_price" }] }), false);

const points = priceHistoryPoints(sheet);
assert.equal(points.length, 2);
assert.equal(points[0].price, 0.0034);
assert.equal(points[1].price, 0.0035);
assert.ok(points[0].t < points[1].t);
assert.equal(points[1].t, Date.parse("10/8/2026, 3:32:24 PM"));

const tokenHistory = {
  type: "sheet",
  table: "getTokenPriceHistory",
  columns: [
    { id: "market_title" },
    { id: "outcome" },
    { id: "observed_at" },
    { id: "price" },
    { id: "timestamp" },
  ],
  cells: {
    "2,0": "10/8/2026, 8:58:04 PM",
    "3,0": "0.005",
    "4,0": "1791453484",
    "2,1": "10/8/2026, 8:55:00 PM",
    "3,1": "0.005",
    "4,1": "1791453300",
  },
};

assert.equal(isPriceHistorySheet(tokenHistory), true);
const tokenPoints = priceHistoryPoints(tokenHistory);
assert.equal(tokenPoints.length, 2);
assert.equal(tokenPoints[0].price, 0.005);
assert.equal(tokenPoints[0].t, Date.parse("10/8/2026, 8:55:00 PM"));
assert.ok(tokenPoints[0].t < tokenPoints[1].t);

const bothOutcomes = {
  type: "sheet",
  table: "getBatchPricesHistory",
  columns: [{ id: "outcome" }, { id: "t" }, { id: "p" }],
  records: [
    { outcome: "No", t: "1791452719", p: "0.97" },
    { outcome: "Yes", t: "1791452719", p: "0.03" },
    { outcome: "No", t: "1791452844", p: "0.96" },
    { outcome: "Yes", t: "1791452844", p: "0.04" },
  ],
};
const lines = priceHistoryLines(bothOutcomes);
assert.deepEqual(lines.map((line) => line.outcome), ["Yes", "No"]);
assert.deepEqual(lines[0].points.map((point) => point.price), [0.03, 0.04]);
assert.deepEqual(lines[1].points.map((point) => point.price), [0.97, 0.96]);
assert.deepEqual(priceHistoryLines(sheet).map((line) => line.outcome), [""]);
assert.equal(priceHistoryLines(sheet)[0].points.length, 2);

console.log("price history series ok");
