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
      metricColumns: ["ticker", "title", "yes_price", "close_time", "open_time"],
      joinValueColumn: "yes_price",
    },
    limit: 1000,
  });
  assert.ok(sql.includes("r.\"yes_price\" AS \"selected_yes_price\""), "must output trades value at checkpoint");
  assert.ok(sql.includes("1e11"), "expected epoch magnitude scaling");
  assert.ok(!sql.includes("b.*"), "must not use b.* to avoid duplicate join column names");
  assert.ok(!sql.includes("CAST(j.\"created_time\" AS timestamp)"), "must not cast bigint epoch to timestamp");
  assert.ok(sql.includes('PARTITION BY j."ticker"'), "window partitions must qualify group column");
  assert.ok(sql.includes("c.checkpoint AS lifecycle_checkpoint"), "lifecycle_checkpoint must be numeric fraction");
  assert.ok(!sql.includes("'%')"), "lifecycle_checkpoint must not use percent labels");
  assert.ok(sql.includes("date_format(from_unixtime(r.progress_num)"), "progress value must be ISO datetime");
  assert.ok(sql.includes("date_format(") && sql.includes("selected_close_time"), "date metrics must be formatted");
  assert.ok(sql.includes("w.progress_num DESC"), "latest_before must break ties on latest progress");
});

test("quant Athena SQL pushes chart line filter tickers into joined WHERE", () => {
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
      metricColumns: ["ticker", "yes_price", "close_time"],
      joinValueColumn: "yes_price",
      groupColumnFilterValues: ["RECNC-22DEC25", "RECSS-22DEC25"],
    },
    limit: 1000,
  });
  assert.ok(sql.includes("CAST(b.\"ticker\" AS VARCHAR) IN ('RECNC-22DEC25', 'RECSS-22DEC25')"));
});
