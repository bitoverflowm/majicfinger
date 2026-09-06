import assert from "node:assert/strict";
import {
  AXIS_RANGE_DATA,
  AXIS_RANGE_ZERO,
  axisRangeDomain,
  collectAxisNumericValues,
  normalizeAxisRange,
  toAxisNumericValue,
} from "./axisRangeDomain.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("normalizeAxisRange defaults to start at zero", () => {
  assert.equal(normalizeAxisRange(undefined), AXIS_RANGE_ZERO);
  assert.equal(normalizeAxisRange("data"), AXIS_RANGE_DATA);
  assert.equal(normalizeAxisRange("zero"), AXIS_RANGE_ZERO);
});

test("collectAxisNumericValues skips invalid cells and does not mutate rows", () => {
  const rows = [
    { a: 1, b: "x" },
    { a: null, b: 2 },
    { a: Number.NaN, b: "" },
    { a: 4 },
  ];
  const copy = rows.map((r) => ({ ...r }));
  const values = collectAxisNumericValues(rows, ["a", "b"]);
  assert.deepEqual(values, [1, 2, 4]);
  assert.deepEqual(rows, copy);
});

test("toAxisNumericValue reads Date and finite numbers", () => {
  assert.equal(toAxisNumericValue(10), 10);
  assert.equal(toAxisNumericValue(""), null);
  assert.equal(toAxisNumericValue(new Date("2024-01-15T00:00:00Z")), Date.parse("2024-01-15T00:00:00Z"));
  assert.equal(
    toAxisNumericValue("2024-06-01", { parseDates: true, toDateMs: () => 1_717_200_000_000 }),
    1_717_200_000_000,
  );
});

test("start at zero uses 0 to max for positive numeric data", () => {
  assert.deepEqual(axisRangeDomain("zero", [10, 40, 100]), [0, 100]);
});

test("fit to data uses min to max", () => {
  assert.deepEqual(axisRangeDomain("data", [10, 40, 100]), [10, 100]);
});

test("fit to data uses earliest and latest timestamps", () => {
  const t0 = Date.parse("2024-01-01T00:00:00Z");
  const t1 = Date.parse("2024-06-01T00:00:00Z");
  assert.deepEqual(axisRangeDomain("data", [t1, t0, t1]), [t0, t1]);
});

test("empty and invalid values yield no domain", () => {
  assert.equal(axisRangeDomain("zero", []), undefined);
  assert.equal(axisRangeDomain("data", [Number.NaN, Infinity, null]), undefined);
});

test("single-value fit pads around the point", () => {
  const [lo, hi] = axisRangeDomain("data", [50, 50]);
  assert.ok(lo < 50 && hi > 50);
});

test("single-value start at zero goes 0 to value", () => {
  assert.deepEqual(axisRangeDomain("zero", [50]), [0, 50]);
  assert.deepEqual(axisRangeDomain("zero", [0, 0]), [0, 1]);
});

test("all-negative start at zero ends at 0", () => {
  assert.deepEqual(axisRangeDomain("zero", [-8, -2]), [-8, 0]);
});

test("log scale never includes 0", () => {
  const domain = axisRangeDomain("zero", [0, 2, 20], { isLog: true });
  assert.deepEqual(domain, [2, 20]);
  assert.equal(axisRangeDomain("data", [-1, 0], { isLog: true }), undefined);
});
