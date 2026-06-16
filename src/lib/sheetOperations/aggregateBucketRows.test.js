import assert from "node:assert/strict";
import { aggregateBucketRows } from "./aggregateBucketRows.js";

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

  assert.equal(out.length, 4);

  const cp0_0_10 = out.find((r) => r.lifecycle_checkpoint === 0 && r.yes_price_bucket === "0-10");
  assert.ok(cp0_0_10, "expected checkpoint 0 bucket 0-10");
  assert.equal(cp0_0_10.market_count, 2);
  assert.equal(cp0_0_10.avg_probability, 6.5);
  assert.equal(cp0_0_10.yes_rate, 1);

  const cp0_10_20 = out.find((r) => r.lifecycle_checkpoint === 0 && r.yes_price_bucket === "10-20");
  assert.ok(cp0_10_20, "expected checkpoint 0 bucket 10-20");
  assert.equal(cp0_10_20.market_count, 1);
  assert.equal(cp0_10_20.yes_rate, 0);

  const cp25_0_10 = out.find((r) => r.lifecycle_checkpoint === 0.25 && r.yes_price_bucket === "0-10");
  assert.ok(cp25_0_10, "expected checkpoint 0.25 bucket 0-10");
  assert.equal(cp25_0_10.market_count, 1);
  assert.equal(cp25_0_10.yes_rate, 1);

  const cp25_10_20 = out.find((r) => r.lifecycle_checkpoint === 0.25 && r.yes_price_bucket === "10-20");
  assert.ok(cp25_10_20, "expected checkpoint 0.25 bucket 10-20");
  assert.equal(cp25_10_20.market_count, 1);
  assert.equal(cp25_10_20.yes_rate, 0);
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
