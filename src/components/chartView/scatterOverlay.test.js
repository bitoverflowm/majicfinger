import assert from "node:assert/strict";
import {
  SCATTER_OVERLAY_Y_KEY,
  filterScatterOverlayRows,
  jitterScatterOverlayRows,
  scatterJitterFraction,
  scatterYIsValid,
  splitScatterOverlaySeries,
  unitNoise2d,
} from "./scatterOverlay.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("scatterYIsValid rejects empty, non-finite, and non-positive log values", () => {
  assert.equal(scatterYIsValid(null, "linear"), false);
  assert.equal(scatterYIsValid("", "linear"), false);
  assert.equal(scatterYIsValid("x", "linear"), false);
  assert.equal(scatterYIsValid(0, "log"), false);
  assert.equal(scatterYIsValid(-1, "log"), false);
  assert.equal(scatterYIsValid(2, "log"), true);
  assert.equal(scatterYIsValid("low", "categorical"), true);
});

test("filterScatterOverlayRows keeps a row when any Y is valid", () => {
  const rows = [
    { x: 1, y1: 10, y2: null },
    { x: 2, y1: "", y2: 20 },
    { x: 3, y1: null, y2: null },
    { x: null, y1: 5, y2: 6 },
  ];
  const copy = rows.map((r) => ({ ...r }));
  const filtered = filterScatterOverlayRows(rows, {
    xKey: "x",
    yKeys: ["y1", "y2"],
    xIsNumber: true,
    scaleY: "linear",
  });
  assert.deepEqual(
    filtered.map((r) => r.x),
    [1, 2],
  );
  assert.deepEqual(rows, copy);
});

test("splitScatterOverlaySeries maps each series onto a shared Y field", () => {
  const rows = [
    { x: 1, a: 10, b: 100 },
    { x: 2, a: null, b: 200 },
  ];
  const series = splitScatterOverlaySeries(
    rows,
    [
      { id: "line:0", sourceKey: "colA", renderKey: "a", label: "A" },
      { id: "line:1", sourceKey: "colB", renderKey: "b", label: "B" },
    ],
    "linear",
  );
  assert.equal(series.length, 2);
  assert.equal(series[0].data.length, 1);
  assert.equal(series[0].data[0][SCATTER_OVERLAY_Y_KEY], 10);
  assert.equal(series[1].data.length, 2);
  assert.deepEqual(
    series[1].data.map((r) => r[SCATTER_OVERLAY_Y_KEY]),
    [100, 200],
  );
});

test("first-series Y jitter uses the same noise channel as a single scatter", () => {
  const rows = [{ x: 0, y: 10 }, { x: 10, y: 20 }];
  const amt = scatterJitterFraction(50);
  const jittered = jitterScatterOverlayRows(rows, {
    xKey: "x",
    yKeys: ["y"],
    xIsNumber: true,
    scaleY: "linear",
    jitterXAmt: amt,
    jitterYAmt: amt,
  });
  const ySpan = 10;
  const expectedY0 = 10 + (unitNoise2d(0, 2) - 0.5) * 2 * amt * ySpan;
  assert.equal(jittered[0].y, expectedY0);
  assert.notEqual(jittered[0].x, 0);
});
