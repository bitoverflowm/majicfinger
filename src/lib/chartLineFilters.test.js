import assert from "node:assert/strict";
import {
  chartFilterRuleMatches,
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
