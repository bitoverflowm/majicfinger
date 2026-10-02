import assert from "node:assert/strict";

import { buildBucketGrid, bucketModesForColumn, suggestedNumericBucketSize } from "@/components/dashboardComposer/bucketSheet";
import { assignSummaryInput, describeSummaryFormula, settleSummaryCells, summaryCellKey } from "@/components/dashboardComposer/summarySheet";
import { attachRandomSample, previewRandomSample } from "@/components/dashboardComposer/randomSampleRequest";
import { normalizeRandomSampleConfig } from "@/lib/dataLake/randomSample";
import { polymarketHistoricalColumnList } from "@/components/dashboardComposer/integrationBuildCatalog";
import {
  POLYMARKET_BLOCKS_CONNECT_COLUMNS,
  POLYMARKET_MARKETS_CONNECT_COLUMNS,
  POLYMARKET_TRADES_CONNECT_COLUMNS,
} from "@/lib/polymarketConnectColumns";
import { buildComposeFiltersWhereSql } from "@/lib/dataLake/composeWherePredicateSql";

const columns = [
  { id: "created_time", title: "Created time", type: "date" },
  { id: "count", title: "Size", type: "number" },
  { id: "ticker", title: "Ticker", type: "text" },
  { id: "volume", title: "Volume", type: "number" },
];

const rows = [
  { created_time: "2025-12-01T10:00:00Z", count: 10, ticker: "A", volume: 10 },
  { created_time: "2025-12-01T18:00:00Z", count: 25, ticker: "B", volume: 25 },
  { created_time: "2025-12-02T01:00:00Z", count: 5, ticker: "A", volume: 40 },
];

const byDay = buildBucketGrid({
  columns,
  rows,
  bucketColumnId: "created_time",
  mode: "time",
  timeInterval: "day",
  metric: "sum",
  valueColumnId: "count",
});
assert.equal(byDay.ready, true);
assert.equal(byDay.rows.length, 2);
assert.equal(byDay.rows[0].bucket, "2025-12-01");
assert.equal(byDay.rows[0].metric, 35);
assert.equal(byDay.rows[1].metric, 5);
assert.equal(byDay.columns.at(-1).title, "Sum of Size");

const counted = buildBucketGrid({
  columns,
  rows,
  bucketColumnId: "ticker",
  mode: "category",
  metric: "count",
  groupByIds: [],
});
assert.equal(counted.rows.find((row) => row.bucket === "A").count, 2);
assert.equal(counted.rows.find((row) => row.bucket === "B").count, 1);

const scientific = buildBucketGrid({
  columns,
  rows: [
    { created_time: "1.737392628078202E18", count: 2, ticker: "A", volume: 1 },
    { created_time: "1.737392628078202E18", count: 3, ticker: "B", volume: 1 },
  ],
  bucketColumnId: "created_time",
  mode: "time",
  timeInterval: "day",
  metric: "count",
});
assert.equal(scientific.rows.length, 1);
assert.equal(scientific.rows[0].bucket.includes("invalid"), false);
assert.equal(scientific.rows[0].count, 2);

const ranged = buildBucketGrid({
  columns,
  rows,
  bucketColumnId: "volume",
  mode: "number",
  numericBucketSize: 20,
  metric: "count",
});
assert.equal(ranged.rows.length, 2);
assert.equal(bucketModesForColumn(columns[0]).join(","), "time,category");
assert.equal(bucketModesForColumn(columns[1]).join(","), "number,category");
assert.equal(suggestedNumericBucketSize(rows, "volume") > 0, true);

const request = attachRandomSample(
  { lake: "kalshi", table: "markets", limit: 500000, compose: { select: [{ column: "ticker", alias: "ticker" }] } },
  { size: 25, mode: "seeded", seed: "s_preview" },
);
assert.equal(request.limit, undefined);
assert.equal(normalizeRandomSampleConfig(request.compose.randomSample).mode, "seeded");
assert.equal(request.compose.randomSample.size, 25);
assert.equal(request.compose.randomSample.seed, "s_preview");

const unseeded = attachRandomSample({ limit: 10, compose: {} }, { size: 8, mode: "unseeded" });
assert.equal(unseeded.compose.randomSample.mode, "unseeded");
assert.equal("seed" in unseeded.compose.randomSample, false);

const preview = previewRandomSample(rows, { size: 2, mode: "seeded", seed: "s_preview" });
assert.equal(preview.length, 2);
assert.deepEqual(
  previewRandomSample(rows, { size: 2, mode: "seeded", seed: "s_preview" }).map((row) => row.ticker),
  preview.map((row) => row.ticker),
);

assert.equal(describeSummaryFormula("= SUM(Size)"), "Sum of Size");
assert.equal(describeSummaryFormula("= AVERAGE(Yes price)"), "Average of Yes price");
assert.equal(describeSummaryFormula("= AVERAGE(Size"), "Average of Size");
assert.equal(describeSummaryFormula("= SUM(Buckets!Count)"), "Sum of Count on Buckets");

const moved = assignSummaryInput({}, 2, "label", "= AVERAGE(Size)");
assert.equal(moved.columnId, "value");
assert.equal(moved.cells[summaryCellKey("value", 2)], "= AVERAGE(Size)");
assert.equal(moved.cells[summaryCellKey("label", 2)], "Average of Size");

const kept = assignSummaryInput({ [summaryCellKey("label", 0)]: "Contracts" }, 0, "label", "= SUM(Size)");
assert.equal(kept.cells[summaryCellKey("label", 0)], "Contracts");
assert.equal(kept.cells[summaryCellKey("value", 0)], "= SUM(Size)");

const renamed = assignSummaryInput(
  {
    [summaryCellKey("label", 0)]: "Sum of Size",
    [summaryCellKey("value", 0)]: "= SUM(Size)",
  },
  0,
  "value",
  "= AVERAGE(Size)",
);
assert.equal(renamed.cells[summaryCellKey("label", 0)], "Average of Size");

const settled = settleSummaryCells({ [summaryCellKey("label", 1)]: "= SUM(Size)" });
assert.equal(settled[summaryCellKey("value", 1)], "= SUM(Size)");
assert.equal(settled[summaryCellKey("label", 1)], "Sum of Size");

for (const [table, expected] of [
  ["markets", POLYMARKET_MARKETS_CONNECT_COLUMNS],
  ["trades", POLYMARKET_TRADES_CONNECT_COLUMNS],
  ["blocks", POLYMARKET_BLOCKS_CONNECT_COLUMNS],
]) {
  const columns = polymarketHistoricalColumnList(table);
  assert.deepEqual(columns.map((column) => column.id), expected.map((column) => column.name));
  assert.ok(columns.every((column) => column.description));
}
const blockColumns = polymarketHistoricalColumnList("blocks");
assert.equal(blockColumns.find((column) => column.id === "timestamp").dateEpoch, "iso");
assert.equal(polymarketHistoricalColumnList("markets").find((column) => column.id === "end_date").dateEpoch, "unix");
assert.equal(polymarketHistoricalColumnList("markets").find((column) => column.id === "active").type, "boolean");

const isoSql = buildComposeFiltersWhereSql({
  filters: { and: [{ column: "timestamp", kind: "date", op: "gt", value: 1705276800000 }], or: [] },
  lake: "polymarket",
  table: "blocks",
});
assert.ok(isoSql.includes("from_iso8601_timestamp"));

console.log("enrichPreview.test.js ok");
