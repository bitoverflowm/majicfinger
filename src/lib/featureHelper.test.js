import assert from "node:assert/strict";
import { filterFeatureHelperGuideLinks } from "./featureHelper.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("FeatureHelper hides guides when array empty or placeholders", () => {
  assert.deepEqual(filterFeatureHelperGuideLinks([]), []);
  assert.deepEqual(filterFeatureHelperGuideLinks([{ label: "x", href: "#" }]), []);
  assert.deepEqual(filterFeatureHelperGuideLinks([{ label: "x", href: "" }]), []);
  assert.deepEqual(
    filterFeatureHelperGuideLinks([{ label: "Guide", href: "https://example.com/g" }]),
    [{ label: "Guide", href: "https://example.com/g" }],
  );
});
