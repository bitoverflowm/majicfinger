import assert from "node:assert/strict";
import {
  buildHeatmapItems,
  inferHeatmapCap,
  inferHeatmapScale,
  heatmapNumeric,
} from "./buildHeatmapRows.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("heatmapNumeric coerces percents and commas", () => {
  assert.equal(heatmapNumeric("1.5%"), 1.5);
  assert.equal(heatmapNumeric("1,200"), 1200);
  assert.equal(heatmapNumeric(null), null);
});

test("inferHeatmapCap steps from max abs change", () => {
  assert.equal(inferHeatmapCap([0.5, -0.8]), 1);
  assert.equal(inferHeatmapCap([3.2, -2]), 4);
  assert.equal(inferHeatmapCap([12]), 12);
});

test("inferHeatmapScale uses positive-only when no negatives", () => {
  const scale = inferHeatmapScale([2.1, 8.3, 32.09, 0]);
  assert.equal(scale.mode, "positive");
  assert.equal(scale.cap, 33);
});

test("inferHeatmapScale uses negative-only when no positives", () => {
  const scale = inferHeatmapScale([-2, -8.5, 0]);
  assert.equal(scale.mode, "negative");
  assert.equal(scale.cap, 10);
});

test("inferHeatmapScale stays diverging when mixed signs", () => {
  const scale = inferHeatmapScale([-2, 8]);
  assert.equal(scale.mode, "diverging");
  assert.equal(scale.cap, 10);
});

test("buildHeatmapItems maps label/weight/change and merges duplicate labels", () => {
  const { items, inferredCap, scaleMode } = buildHeatmapItems(
    [
      { question: "Will it rain?", volume: 100, change_24h: 2 },
      { question: "Will it rain?", volume: 50, change_24h: -4 },
      { question: "Will it snow?", volume: 200, change_24h: 6 },
      { question: "Bad", volume: 0, change_24h: 1 },
    ],
    { labelKey: "question", weightKey: "volume", changeKey: "change_24h" },
  );
  assert.equal(items.length, 2);
  const rain = items.find((i) => i.label === "Will it rain?");
  assert.equal(rain.weight, 150);
  assert.ok(Math.abs(rain.change - 0) < 1e-9);
  assert.equal(inferredCap, 6);
  // Merged tile changes are [0, 6] — legend follows drawn tiles (no negatives left).
  assert.equal(scaleMode, "positive");
});

test("buildHeatmapItems sets positive scaleMode when all changes are non-negative", () => {
  const { scaleMode, inferredCap } = buildHeatmapItems(
    [
      { q: "A", w: 10, c: 5 },
      { q: "B", w: 20, c: 32 },
    ],
    { labelKey: "q", weightKey: "w", changeKey: "c" },
  );
  assert.equal(scaleMode, "positive");
  assert.equal(inferredCap, 32);
});
