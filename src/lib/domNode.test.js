import assert from "node:assert/strict";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { nodeContains } from "./domNode.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("nodeContains is false for Window-like resize targets (not a Node)", () => {
  const host = { contains() { throw new Error("should not call contains"); } };
  assert.equal(nodeContains(host, {}), false);
  assert.equal(nodeContains(host, null), false);
  assert.equal(nodeContains(host, undefined), false);
  class FakeWindow {}
  assert.equal(nodeContains(host, new FakeWindow()), false);
  assert.equal(nodeContains(null, host), false);
});

test("Kalshi market picker does not pass resize/scroll targets to Node.contains", () => {
  const src = fs.readFileSync(
    fileURLToPath(new URL("../components/dashboardComposer/kalshiLiveMarketPicker.jsx", import.meta.url)),
    "utf8",
  );
  assert.match(src, /nodeContains\(list, target\)/);
  assert.equal(/list\.contains\(event\.target\)/.test(src), false);
});

test("nodeContains requires both arguments to be Nodes", () => {
  if (typeof Node === "undefined") return;
  const parent = globalThis.document?.createElement?.("div");
  const child = globalThis.document?.createElement?.("span");
  if (!parent || !child) {
    assert.equal(nodeContains(null, null), false);
    return;
  }
  parent.appendChild(child);
  assert.equal(nodeContains(parent, child), true);
  assert.equal(nodeContains(parent, parent), true);
  assert.equal(nodeContains(child, parent), false);
  assert.equal(nodeContains(parent, globalThis), false);
});
