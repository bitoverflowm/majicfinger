import assert from "node:assert/strict";
import { aggregateBucketRows, getNumericBucketForValue } from "./aggregateBucketRows.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("bucket groups by additional dimensions and bucket column", () => {
  const rows = [
    { lifecycle_checkpoint: 0, selected_yes_price: 5, ticker: "A", selected_result: "yes" },
    { lifecycle_checkpoint: 0, selected_yes_price: 15, ticker: "B", selected_result: "no" },
    { lifecycle_checkpoint: 0, selected_yes_price: 8, ticker: "C", selected_result: "yes" },
    { lifecycle_checkpoint: 0.25, selected_yes_price: 12, ticker: "D", selected_result: "no" },
    { lifecycle_checkpoint: 0.25, selected_yes_price: 3, ticker: "E", selected_result: "yes" },
  ];

  const out = aggregateBucketRows(rows, {
    bucketColumn: "selected_yes_price",
    bucketOutputColumn: "yes_price_bucket",
    bucketMode: "number",
    numericBucketSize: 10,
    groupByColumns: ["lifecycle_checkpoint"],
    aggregations: [
      { type: "count_distinct", valueColumn: "ticker", outputColumn: "market_count" },
      { type: "average", valueColumn: "selected_yes_price", outputColumn: "avg_probability" },
      {
        type: "conditional_rate",
        filterColumn: "selected_result",
        filterOperator: "=",
        filterValue: "yes",
        outputColumn: "yes_rate",
      },
    ],
  });

  assert.equal(out.length, 3);

  const cp0_3_12 = out.find((r) => r.lifecycle_checkpoint === 0 && r.yes_price_bucket === "3-12");
  assert.ok(cp0_3_12, "expected checkpoint 0 bucket 3-12");
  assert.equal(cp0_3_12.market_count, 2);
  assert.equal(cp0_3_12.avg_probability, 6.5);
  assert.equal(cp0_3_12.yes_rate, 1);

  const cp0_13_15 = out.find((r) => r.lifecycle_checkpoint === 0 && r.yes_price_bucket === "13-15");
  assert.ok(cp0_13_15, "expected checkpoint 0 bucket 13-15");
  assert.equal(cp0_13_15.market_count, 1);
  assert.equal(cp0_13_15.yes_rate, 0);

  const cp25_3_12 = out.find((r) => r.lifecycle_checkpoint === 0.25 && r.yes_price_bucket === "3-12");
  assert.ok(cp25_3_12, "expected checkpoint 0.25 bucket 3-12");
  assert.equal(cp25_3_12.market_count, 2);
  assert.equal(cp25_3_12.yes_rate, 0.5);
});

test("numeric buckets anchor at column min with non-overlapping inclusive labels", () => {
  const config = { step: 10, anchorMin: 1, anchorMax: 99 };
  const label = (n) => getNumericBucketForValue(n, config).label;
  assert.equal(label(1), "1-10");
  assert.equal(label(10), "1-10");
  assert.equal(label(11), "11-20");
  assert.equal(label(20), "11-20");
  assert.equal(label(99), "91-99");
});

test("passthrough copies representative value without creating extra groups", () => {
  const rows = [
    { lifecycle_checkpoint: 0, selected_yes_price: 5, title: "Market A" },
    { lifecycle_checkpoint: 0, selected_yes_price: 7, title: "Market B" },
    { lifecycle_checkpoint: 0.5, selected_yes_price: 5, title: "Market C" },
  ];

  const out = aggregateBucketRows(rows, {
    bucketColumn: "selected_yes_price",
    bucketOutputColumn: "yes_price_bucket",
    bucketMode: "number",
    numericBucketSize: 10,
    groupByColumns: ["lifecycle_checkpoint"],
    passthroughColumns: ["title"],
    aggregations: [{ type: "count", outputColumn: "row_count" }],
  });

  assert.equal(out.length, 2);
  assert.equal(out[0].title, "Market A");
  assert.equal(out[0].row_count, 2);
});
