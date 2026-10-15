import assert from "node:assert/strict";
import { chartSpecsForSheet } from "./sheetCharts.js";

const orderBook = chartSpecsForSheet({
  type: "sheet",
  title: "Orderbook(s) · Example",
  table: "getOrderbooks",
  columns: [{ id: "side" }, { id: "price" }, { id: "size" }, { id: "outcome" }],
});
assert.deepEqual(
  orderBook.map((chart) => chart.chartView),
  ["order-book", "depth"],
);

const activity = chartSpecsForSheet({
  type: "sheet",
  title: "Zoomify's activity",
  table: "getTraderActivity",
  integrationId: "polymarket",
  columns: [{ id: "timestamp" }, { id: "type" }, { id: "usdcSize" }],
  records: [{ timestamp: 1, type: "TRADE", usdcSize: 2 }],
});
assert.deepEqual(
  activity.map((chart) => chart.chartView),
  ["activity-calendar", "activity-stack"],
);

const plain = chartSpecsForSheet({
  type: "sheet",
  title: "Notes",
  columns: [{ id: "name" }, { id: "note" }],
  records: [{ name: "A", note: "hello" }],
});
assert.equal(plain.length, 0);

console.log("sheet charts ok");
