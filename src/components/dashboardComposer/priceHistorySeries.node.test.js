import assert from "node:assert/strict";

import { isPriceHistorySheet, priceHistoryPoints } from "./priceHistorySeries.js";

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

console.log("price history series ok");
