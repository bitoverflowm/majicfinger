import assert from "node:assert/strict";
import { describeSheet } from "./datasetDescriptor.js";
import { hasVisualTable, resolveVisualization, visualPresentationLabel } from "./presetRegistry.js";
import { chartSpecsForSheet } from "./sheetCharts.js";
import { layoutVolumeTiles, volumeTreemapModel } from "./volumeTreemap.js";

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

const series = {
  type: "sheet",
  title: "Series",
  table: "series",
  integrationId: "polymarket",
  columns: [
    { id: "series:id" },
    { id: "series:title" },
    { id: "series:volume24hr" },
    { id: "series:volume" },
  ],
  records: [
    { "series:id": "1", "series:title": "NFL", "series:volume24hr": 100, "series:volume": 900 },
    { "series:id": "2", "series:title": "NBA", "series:volume24hr": 40, "series:volume": 200 },
  ],
};
const seriesDataset = describeSheet(series);
assert.equal(hasVisualTable(seriesDataset), true);
assert.equal(visualPresentationLabel(seriesDataset), "Rich Table");
assert.equal(
  resolveVisualization(seriesDataset, { columnIds: series.columns.map((column) => column.id) }).view,
  "treemap",
);
assert.deepEqual(chartSpecsForSheet(series).map((chart) => chart.chartView), ["treemap"]);
assert.deepEqual(
  volumeTreemapModel(series, seriesDataset).tiles.map((tile) => tile.label),
  ["NFL", "NBA"],
);
const laid = layoutVolumeTiles(
  [
    { label: "FOMC", weight: 6020587, value: 6020587 },
    { label: "MLB", weight: 3431369, value: 3431369 },
    { label: "UFC", weight: 27575, value: 27575 },
    { label: "NFL", weight: 7944, value: 7944 },
    { label: "EPL", weight: 250, value: 250 },
    { label: "NBA", weight: 11, value: 11 },
  ],
  526,
  275,
);
assert.equal(laid.length, 6);
assert.ok(laid.every((tile) => tile.w >= 72 && tile.h >= 28));

const oneSeries = { ...series, records: [series.records[0]] };
assert.equal(
  resolveVisualization(describeSheet(oneSeries), { columnIds: oneSeries.columns.map((column) => column.id) }).view,
  "overview",
);

const staleSeries = {
  ...series,
  dataset: {
    datasetType: "series",
    sourceTable: "series",
    fields: { market: "id", label: "title", category: "category" },
    seriesKeys: ["id"],
    required: ["title"],
  },
};
const refreshed = describeSheet(staleSeries);
assert.equal(refreshed.fields.label, "series:title");
assert.equal(refreshed.fields.value, "series:volume24hr");
assert.equal(refreshed.seriesCount, 2);
assert.equal(
  resolveVisualization(refreshed, { columnIds: staleSeries.columns.map((column) => column.id) }).view,
  "treemap",
);
assert.deepEqual(chartSpecsForSheet(staleSeries).map((chart) => chart.chartView), ["treemap"]);

const kalshiSeries = describeSheet({
  type: "sheet",
  table: "series",
  integrationId: "kalshi",
  columns: [{ id: "ticker" }, { id: "title" }],
  records: [
    { ticker: "A", title: "Alpha" },
    { ticker: "B", title: "Beta" },
  ],
});
assert.equal(hasVisualTable(kalshiSeries), false);
assert.equal(resolveVisualization(kalshiSeries, { columnIds: ["ticker", "title"] }).view, "overview");

console.log("sheet charts ok");
