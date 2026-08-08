import assert from "node:assert/strict";
import {
  evaluateTrackedMarketsClosure,
  mergeMarketMetaRowsForClosure,
} from "./marketClosure.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("mergeMarketMetaRowsForClosure prefers tick meta over sheet meta", () => {
  const merged = mergeMarketMetaRowsForClosure(
    [{ ticker: "A", status: "closed", close_time: "2020-01-01T00:00:00Z" }],
    [{ ticker: "A", status: "active", close_time: "2099-01-01T00:00:00Z" }],
  );
  assert.equal(merged.length, 1);
  assert.equal(merged[0].status, "closed");
});

test("evaluateTrackedMarketsClosure allClosed when status closed", () => {
  const closure = evaluateTrackedMarketsClosure(
    [{ ticker: "COD-1", status: "closed", close_time: "2020-01-01T00:00:00Z" }],
    ["COD-1"],
    Date.now(),
  );
  assert.equal(closure.allClosed, true);
  assert.deepEqual(closure.closedTickers, ["COD-1"]);
});

test("evaluateTrackedMarketsClosure allClosed when past close_time", () => {
  const closure = evaluateTrackedMarketsClosure(
    [{ ticker: "COD-1", status: "open", close_time: "2020-01-01T00:00:00Z" }],
    ["COD-1"],
    Date.now(),
  );
  assert.equal(closure.allClosed, true);
});
