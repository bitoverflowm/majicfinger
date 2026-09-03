import assert from "node:assert/strict";
import test from "node:test";
import {
  changeColor,
  heatLegendSampleChanges,
  mixSrgbHex,
  parseHexColor,
} from "./heatmapColors.js";

test("parseHexColor reads 3 and 6 digit hex", () => {
  assert.deepEqual(parseHexColor("#fff"), { r: 255, g: 255, b: 255 });
  assert.deepEqual(parseHexColor("#059669"), { r: 5, g: 150, b: 105 });
});

test("mixSrgbHex blends toward flat", () => {
  const mixed = mixSrgbHex("#059669", "#e7e7ea", 0.5);
  assert.match(mixed, /^#[0-9a-f]{6}$/i);
  assert.notEqual(mixed.toLowerCase(), "#059669");
});

test("changeColor returns concrete hex by default (export-safe)", () => {
  const up = changeColor(6, 6, { up: "#059669", down: "#e11d48", flat: "#e7e7ea" });
  const flat = changeColor(0, 6, { up: "#059669", down: "#e11d48", flat: "#e7e7ea" });
  const down = changeColor(-6, 6, { up: "#059669", down: "#e11d48", flat: "#e7e7ea" });
  assert.match(up, /^#[0-9a-f]{6}$/i);
  assert.equal(flat, "#e7e7ea");
  assert.match(down, /^#[0-9a-f]{6}$/i);
  assert.ok(!up.includes("color-mix"));
  assert.ok(!up.includes("var("));
});

test("changeColor positive mode ramps flat→up from 0 to cap", () => {
  const colors = { up: "#059669", down: "#e11d48", flat: "#e7e7ea", mode: "positive" };
  const zero = changeColor(0, 33, colors);
  const mid = changeColor(16.5, 33, colors);
  const top = changeColor(33, 33, colors);
  assert.equal(zero, "#e7e7ea");
  assert.notEqual(mid, zero);
  assert.notEqual(top, mid);
  assert.match(top, /^#[0-9a-f]{6}$/i);
});

test("heatLegendSampleChanges positive starts at 0", () => {
  const samples = heatLegendSampleChanges(33, "positive", 5);
  assert.equal(samples[0], 0);
  assert.equal(samples[samples.length - 1], 33);
  assert.ok(samples.every((v) => v >= 0));
});
