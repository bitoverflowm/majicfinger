import assert from "node:assert/strict";
import { mapRowsToLivelinePoints } from "./mapRowsToLivelinePoints.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("mapRowsToLivelinePoints resolves sheet-scoped trade columns", () => {
  const rows = [
    {
      "sheet-t::created_time": 1_700_000_000_000,
      "sheet-t::yes_price_dollars": 0.42,
      created_time: 1_700_000_000_000,
      yes_price_dollars: 0.42,
    },
    {
      "sheet-t::created_time": 1_700_000_001_000,
      "sheet-t::yes_price_dollars": 0.55,
      created_time: 1_700_000_001_000,
      yes_price_dollars: 0.55,
    },
  ];
  const points = mapRowsToLivelinePoints(
    rows,
    "sheet-t::created_time",
    "sheet-t::yes_price_dollars",
    "sheet-t",
  );
  assert.equal(points.length, 2);
  assert.equal(points[0].time, 1_700_000_000);
  assert.equal(points[0].value, 0.42);
  assert.equal(points[1].time, 1_700_000_001);
  assert.equal(points[1].value, 0.55);
});

test("mapRowsToLivelinePoints falls back to plain column names on scoped keys", () => {
  const rows = [
    { created_time: 1_700_000_010_000, yes_price_dollars: 0.61 },
    { created_time: 1_700_000_020_000, yes_price_dollars: 0.59 },
  ];
  const points = mapRowsToLivelinePoints(
    rows,
    "sheet-t::created_time",
    "sheet-t::yes_price_dollars",
    "sheet-t",
  );
  assert.equal(points.length, 2);
  assert.equal(points[0].value, 0.61);
  assert.equal(points[1].time, 1_700_000_020);
});

test("mapRowsToLivelinePoints skips rows without a real timestamp (no idx fallback)", () => {
  const rows = [
    { created_time: null, yes_price_dollars: 0.5 },
    { yes_price_dollars: 0.6 },
    { created_time: 1_700_000_030_000, yes_price_dollars: 0.7 },
  ];
  const points = mapRowsToLivelinePoints(rows, "created_time", "yes_price_dollars");
  assert.equal(points.length, 1);
  assert.equal(points[0].value, 0.7);
});

test("mapRowsToLivelinePoints sorts by time ascending", () => {
  const rows = [
    { created_time: 1_700_000_050_000, yes_price_dollars: 0.9 },
    { created_time: 1_700_000_040_000, yes_price_dollars: 0.8 },
  ];
  const points = mapRowsToLivelinePoints(rows, "created_time", "yes_price_dollars");
  assert.deepEqual(
    points.map((p) => p.time),
    [1_700_000_040, 1_700_000_050],
  );
});
