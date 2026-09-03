/**
 * Unit coverage for unseeded random-sample persistence rules.
 */
import assert from "node:assert/strict";
import {
  sheetHasUnseededRandomSample,
  sheetShouldKeepPersistedRows,
} from "./sheetUserRowOverlay.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("unseeded small sample does not keep rows via size cap", () => {
  const sheet = {
    data: Array.from({ length: 100 }, (_, i) => ({ id: i })),
    provenance: {
      kind: "compose",
      composeSpec: { randomSample: { enabled: true, size: 100, mode: "unseeded" } },
    },
  };
  assert.equal(sheetHasUnseededRandomSample(sheet), true);
  assert.equal(sheetShouldKeepPersistedRows(sheet), false);
});

test("seeded small sample still keeps rows via size cap", () => {
  const sheet = {
    data: Array.from({ length: 100 }, (_, i) => ({ id: i })),
    provenance: {
      kind: "compose",
      composeSpec: {
        randomSample: { enabled: true, size: 100, mode: "seeded", seed: "s_abc" },
      },
    },
  };
  assert.equal(sheetHasUnseededRandomSample(sheet), false);
  assert.equal(sheetShouldKeepPersistedRows(sheet), true);
});
