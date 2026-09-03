import assert from "node:assert/strict";
import {
  applyManualCellPatchByIdentity,
  buildUserRowOverlay,
  overlayUserColumnsByIdentity,
  sheetRowIdentityKey,
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

test("identity key uses band, never array position", () => {
  assert.equal(sheetRowIdentityKey({ band: "volume = 0", id: 3 }), "band:volume = 0");
  assert.equal(sheetRowIdentityKey({ id: 0, label: "v = 0" }), null);
});

test("overlay rematches id and label onto the correct band after Athena reorder", () => {
  const previous = [
    { band: "volume = 0", market_count: 10, id: 0, label: "v = 0" },
    { band: "0 < volume < 10,000", market_count: 20, id: 1, label: "0 < v < 10,000" },
  ];
  const fresh = [
    { band: "0 < volume < 10,000", market_count: 99 },
    { band: "volume = 0", market_count: 11 },
  ];
  const out = overlayUserColumnsByIdentity(fresh, previous, null, ["band", "market_count"]);
  assert.equal(out[0].band, "0 < volume < 10,000");
  assert.equal(out[0].market_count, 99);
  assert.equal(out[0].id, 1);
  assert.equal(out[0].label, "0 < v < 10,000");
  assert.equal(out[1].band, "volume = 0");
  assert.equal(out[1].market_count, 11);
  assert.equal(out[1].id, 0);
  assert.equal(out[1].label, "v = 0");
});

test("legacy index patches are refused when band identity exists", () => {
  const rows = [
    { band: "10,000,000 ≤ volume < 100,000,000", id: 5 },
    { band: "volume = 0", id: 0 },
  ];
  const out = applyManualCellPatchByIdentity(rows, {
    rowKey: 0,
    column: "label",
    value: "v = 0",
  });
  assert.equal(out[0].label, undefined);
  assert.equal(out[1].label, undefined);
});

test("identity patches write onto the matching band", () => {
  const rows = [
    { band: "10,000,000 ≤ volume < 100,000,000", id: 5 },
    { band: "volume = 0", id: 0 },
  ];
  const out = applyManualCellPatchByIdentity(rows, {
    rowKey: 0,
    column: "label",
    value: "v = 0",
    identity: { band: "volume = 0" },
  });
  assert.equal(out[0].label, undefined);
  assert.equal(out[1].label, "v = 0");
});

test("small band sheets keep persisted rows", () => {
  assert.equal(
    sheetShouldKeepPersistedRows({
      data: [{ band: "volume = 0", id: 0, label: "v = 0" }],
      dataTypes: { id: "id" },
    }),
    true,
  );
  assert.equal(buildUserRowOverlay([{ band: "volume = 0", id: 0, label: "v = 0" }]).hasOwnProperty("band:volume = 0"), true);
});
