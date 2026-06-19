import assert from "node:assert/strict";
import {
  chartFilterRuleMatches,
  extractChartLineFilterGroupValues,
  normalizeChartLineFilters,
  reduceRowsForChartLineFilters,
} from "./chartLineFilters.js";
import { isPublishedChartBundleStale, chartSnapshotHash } from "./chartPublishStaleness.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

const rows = [
  { ticker: "A", lifecycle_checkpoint: 0, selected_yes_price: 10 },
  { ticker: "A", lifecycle_checkpoint: 1, selected_yes_price: 90 },
  { ticker: "B", lifecycle_checkpoint: 0, selected_yes_price: 20 },
  { ticker: "B", lifecycle_checkpoint: 1, selected_yes_price: 80 },
  { ticker: "C", lifecycle_checkpoint: 0, selected_yes_price: 30 },
];

test("reduceRowsForChartLineFilters keeps union of per-series matches", () => {
  const filters = normalizeChartLineFilters([
    { id: "f0", seriesKey: "line:0", column: "ticker", operator: "=", value: "A" },
    { id: "f1", seriesKey: "line:1", column: "ticker", operator: "=", value: "B" },
  ]);
  const out = reduceRowsForChartLineFilters(rows, filters);
  assert.equal(out.length, 4);
  assert.ok(out.every((r) => r.ticker === "A" || r.ticker === "B"));
});

test("extractChartLineFilterGroupValues collects ticker equals for Athena push-down", () => {
  const filters = normalizeChartLineFilters([
    { id: "f0", seriesKey: "line:0", column: "sheet-2::ticker", operator: "=", value: "RECNC-22DEC25" },
    { id: "f1", seriesKey: "line:1", column: "sheet-2::ticker", operator: "=", value: "RECSS-22DEC25" },
    { id: "f2", seriesKey: "line:2", column: "sheet-2::ticker", operator: "=", value: "RECNH-22DEC25" },
  ]);
  const tickers = extractChartLineFilterGroupValues(filters, "ticker");
  assert.deepEqual(tickers?.sort(), ["RECNC-22DEC25", "RECNH-22DEC25", "RECSS-22DEC25"]);
});

test("political convergence style filters reduce to ~24 rows (3 tickers x 8 checkpoints)", () => {
  const checkpoints = [0, 0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875];
  const tickers = ["RECNC-22DEC25", "RECSS-22DEC25", "RECNH-22DEC25"];
  const rows = [];
  for (const ticker of tickers) {
    for (const lifecycle_checkpoint of checkpoints) {
      rows.push({ ticker, lifecycle_checkpoint, selected_yes_price: 50 });
    }
  }
  assert.equal(rows.length, 24);
  const filters = normalizeChartLineFilters(
    tickers.map((ticker, i) => ({
      id: `f${i}`,
      seriesKey: `line:${i}`,
      column: "ticker",
      operator: "=",
      value: ticker,
    })),
  );
  const out = reduceRowsForChartLineFilters(rows, filters);
  assert.equal(out.length, 24);
});

test("chartFilterRuleMatches resolves scoped column keys", () => {
  const row = { ticker: "RECNC-22DEC25", "sheet-2::ticker": "RECNC-22DEC25" };
  assert.equal(
    chartFilterRuleMatches(row, {
      column: "sheet-2::ticker",
      operator: "=",
      value: "RECNC-22DEC25",
    }),
    true,
  );
});

test("isPublishedChartBundleStale detects newer dataset save", () => {
  const chart = {
    is_public: true,
    chart_properties: [{ rechartsBuilder: { v: 1, selX: "x", selY: ["y"] } }],
    published_bundle_meta: {
      source_data_set_saved_at: "2026-01-01T00:00:00.000Z",
    },
  };
  chart.published_bundle_meta.snapshot_hash = chartSnapshotHash(chart);
  const dataSet = { last_saved_date: new Date("2026-02-01T00:00:00.000Z") };
  assert.equal(isPublishedChartBundleStale(chart, dataSet), true);
});
