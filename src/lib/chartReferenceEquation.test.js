import assert from "node:assert/strict";
import {
  evaluateReferenceExpression,
  parseReferenceEquationInput,
  sampleReferenceEquationCurve,
  validateReferenceEquation,
} from "./chartReferenceEquation.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("parseReferenceEquationInput accepts y = x forms", () => {
  assert.deepEqual(parseReferenceEquationInput("y = x"), { expression: "x" });
  assert.deepEqual(parseReferenceEquationInput("y=x^2"), { expression: "x^2" });
  assert.deepEqual(parseReferenceEquationInput("x = y"), { expression: "x" });
});

test("evaluateReferenceExpression handles powers and functions", () => {
  assert.equal(evaluateReferenceExpression("x", 0.4), 0.4);
  assert.equal(evaluateReferenceExpression("x^2", 3), 9);
  assert.equal(evaluateReferenceExpression("sqrt(x)", 4), 2);
  assert.equal(evaluateReferenceExpression("1 - x", 0.25), 0.75);
});

test("validateReferenceEquation rejects unsafe input", () => {
  const bad = validateReferenceEquation("y = alert(1)");
  assert.equal(bad.ok, false);
});

test("sampleReferenceEquationCurve builds points across domain", () => {
  const points = sampleReferenceEquationCurve({
    equation: "y = x",
    xMin: 0,
    xMax: 1,
    xKey: "x",
    yKey: "ref_y",
    pointCount: 4,
  });
  assert.ok(points.length >= 2);
  assert.equal(points[0].x, 0);
  assert.equal(points[0].ref_y, 0);
  assert.equal(points.at(-1).x, 1);
  assert.equal(points.at(-1).ref_y, 1);
});
