import assert from "node:assert/strict";
import {
  inferOutcomeMapping,
  parseProgressValue,
  suggestGroupColumn,
  suggestProgressColumn,
} from "@/lib/sheetOperations/quant/columnInference.js";
import { computeRelativePosition } from "@/lib/sheetOperations/quant/relativePosition.js";
import { computeBrierScore } from "@/lib/sheetOperations/quant/brierScore.js";
import { runPredictionMarketLifecycleAccuracy } from "@/lib/sheetOperations/quant/predictionMarketPreset.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

const tradeRows = [
  { market_id: "M1", trade_time: "2024-01-01", yes_price: 40, resolution: "YES" },
  { market_id: "M1", trade_time: "2024-02-01", yes_price: 55, resolution: "YES" },
  { market_id: "M1", trade_time: "2024-03-01", yes_price: 70, resolution: "YES" },
  { market_id: "M2", trade_time: "2024-01-15", yes_price: 30, resolution: "NO" },
  { market_id: "M2", trade_time: "2024-02-15", yes_price: 45, resolution: "NO" },
  { market_id: "M2", trade_time: "2024-03-15", yes_price: 20, resolution: "NO" },
];

test("suggest group and progress columns for prediction market data", () => {
  const cols = Object.keys(tradeRows[0]);
  assert.equal(suggestGroupColumn(cols), "market_id");
  assert.equal(suggestProgressColumn(cols), "trade_time");
});

test("relative position create column normalizes within groups", () => {
  const result = computeRelativePosition(tradeRows, {
    groupColumn: "market_id",
    progressColumn: "trade_time",
    mode: "create_column",
    endRule: "auto",
  });
  assert.equal(result.blocking.length, 0);
  assert.ok(result.rows.length >= 4);
  const m1 = result.rows.filter((r) => r.market_id === "M1");
  assert.equal(m1[0].relative_position, 0);
  assert.equal(m1[m1.length - 1].relative_position, 1);
});

test("relative position snapshot emits checkpoints per market", () => {
  const result = computeRelativePosition(tradeRows, {
    groupColumn: "market_id",
    progressColumn: "trade_time",
    mode: "snapshot",
    metricColumns: ["yes_price", "resolution"],
    checkpoints: [0, 0.5, 1],
    snapshotRule: "latest_before",
  });
  assert.equal(result.blocking.length, 0);
  assert.equal(result.rows.length, 6);
  assert.ok(result.rows.every((r) => r.lifecycle_checkpoint != null));
});

test("outcome mapping infers YES/NO", () => {
  const mapped = inferOutcomeMapping(tradeRows, "resolution");
  assert.equal(mapped.ok, true);
  assert.equal(mapped.mapping.YES, 1);
  assert.equal(mapped.mapping.NO, 0);
});

test("brier score aggregates by checkpoint", () => {
  const snapshot = computeRelativePosition(tradeRows, {
    groupColumn: "market_id",
    progressColumn: "trade_time",
    mode: "snapshot",
    metricColumns: ["yes_price", "resolution"],
    checkpoints: [0.5, 1],
    snapshotRule: "latest_before",
  }).rows.map((row) => ({
    market_id: row.market_id,
    checkpoint: row.lifecycle_checkpoint,
    probability: row.selected_yes_price,
    outcome: row.selected_resolution,
  }));

  const scored = computeBrierScore(snapshot, {
    probabilityColumn: "probability",
    outcomeColumn: "outcome",
    mode: "aggregated",
    bucketColumn: "checkpoint",
    groupColumn: "market_id",
    weighting: "equal_group",
    outcomeMapping: { YES: 1, NO: 0 },
    probabilityScale: "percent",
  });
  assert.equal(scored.blocking.length, 0);
  assert.ok(scored.rows.length >= 1);
  assert.ok(scored.rows[0].avg_brier_score >= 0);
});

test("brier score row-level keeps row count and appends forecast error columns", () => {
  const rows = [
    { market_id: "A", probability: 60, outcome: "YES" },
    { market_id: "B", probability: 40, outcome: "NO" },
    { market_id: "C", probability: 50, outcome: "" },
  ];
  const scored = computeBrierScore(rows, {
    probabilityColumn: "probability",
    outcomeColumn: "outcome",
    mode: "row_level",
    outcomeMapping: { YES: 1, NO: 0 },
    probabilityScale: "percent",
  });
  assert.equal(scored.blocking.length, 0);
  assert.equal(scored.rowLevelRows.length, 3);
  assert.equal(scored.rowLevelRows[0].forecast_probability, 0.6);
  assert.equal(scored.rowLevelRows[0].outcome_numeric, 1);
  assert.equal(scored.rowLevelRows[0].absolute_error, 0.4);
  assert.equal(scored.rowLevelRows[0].brier_score, 0.4 ** 2);
  assert.equal(scored.rowLevelRows[2].brier_score, null);
  assert.equal(scored.meta.mode, "row_level");
});

test("prediction market preset produces snapshot and accuracy tables", () => {
  const cols = Object.keys(tradeRows[0]);
  const result = runPredictionMarketLifecycleAccuracy(tradeRows, {
    groupColumn: "market_id",
    progressColumn: "trade_time",
    endRule: "auto",
    probabilityColumn: "yes_price",
    outcomeColumn: "resolution",
    checkpoints: [0, 0.5, 1],
    snapshotRule: "latest_before",
    weighting: "equal_group",
    outcomeMapping: { YES: 1, NO: 0 },
    outcomeMappingOk: true,
    probabilityScale: "percent",
    probabilityValid: true,
    progressSupported: true,
    checkpointColumn: "lifecycle_checkpoint",
    outputPositionColumn: "relative_position",
    outputPositionPctColumn: "relative_position_pct",
  });
  assert.equal(result.blocking.length, 0);
  assert.ok(result.snapshotRows.length > 0);
  assert.ok(result.accuracyRows.length > 0);
});

test("parseProgressValue handles ISO dates", () => {
  const ms = parseProgressValue("2024-03-01", "trade_time");
  assert.ok(Number.isFinite(ms));
});
