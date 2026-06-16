import assert from "node:assert/strict";
import { buildRelativePositionSnapshotAthenaSql } from "./buildQuantAthenaSql.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("quant Athena SQL uses epoch seconds for created_time not bigint timestamp cast", () => {
  const sql = buildRelativePositionSnapshotAthenaSql({
    baseCteName: "relevant_markets",
    join: {
      lake: "kalshi",
      table: "trades",
      joinType: "inner",
      leftKeyColumn: "ticker",
      rightKeyColumn: "ticker",
      columns: ["created_time", "yes_price"],
    },
    quant: {
      groupColumn: "ticker",
      progressColumn: "created_time",
      endRule: "column",
      endColumn: "close_time",
      checkpoints: [0, 0.5, 1],
      metricColumns: ["ticker", "title", "yes_price"],
    },
    limit: 1000,
  });
  assert.ok(sql.includes("1e11"), "expected epoch magnitude scaling");
  assert.ok(!sql.includes("b.*"), "must not use b.* to avoid duplicate join column names");
  assert.ok(!sql.includes("CAST(j.\"created_time\" AS timestamp)"), "must not cast bigint epoch to timestamp");
  assert.ok(sql.includes('PARTITION BY j."ticker"'), "window partitions must qualify group column");
  assert.ok(sql.includes("r.checkpoint,"), "picked output must include checkpoint for ORDER BY");
});
