import assert from "node:assert/strict";
import {
  buildWorkspaceSheetColumnGroups,
  isRelativeRowOffsetRef,
  parseSheetScopedColumnKey,
  resolveScopedFiniteNumber,
  stripSheetScopedColumnKey,
  toSheetScopedColumnKey,
} from "./sheetScopedColumn.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("parse and strip scoped column keys", () => {
  assert.equal(stripSheetScopedColumnKey("sheet-2::volume"), "volume");
  assert.deepEqual(parseSheetScopedColumnKey("sheet-2::volume", "sheet-1"), {
    sheetId: "sheet-2",
    column: "volume",
    value: "sheet-2::volume",
  });
  assert.deepEqual(parseSheetScopedColumnKey("volume", "sheet-1"), {
    sheetId: "sheet-1",
    column: "volume",
    value: "volume",
  });
});

test("buildWorkspaceSheetColumnGroups lists columns per sheet", () => {
  const groups = buildWorkspaceSheetColumnGroups(
    {
      "sheet-1": { name: "100_0", data: [{ a: 1, b: 2 }] },
      "sheet-2": { name: "1000_0", data: [{ c: 3 }] },
    },
    "sheet-1",
  );
  assert.equal(groups.length, 2);
  assert.equal(groups[0].sheetId, "sheet-1");
  assert.ok(groups[0].options.some((o) => o.value === "sheet-1::a"));
  assert.ok(groups[1].options.some((o) => o.value === "sheet-2::c"));
});

test("resolveScopedFiniteNumber reads other sheet at same row index", () => {
  const dataSheets = {
    "sheet-1": { data: [{ x: 10 }] },
    "sheet-2": { data: [{ mean: 42 }] },
  };
  const n = resolveScopedFiniteNumber({
    dataSheets,
    activeSheetId: "sheet-1",
    rowIndex: 0,
    row: dataSheets["sheet-1"].data[0],
    key: "sheet-2::mean",
  });
  assert.equal(n, 42);
});

test("toSheetScopedColumnKey round trip", () => {
  assert.equal(toSheetScopedColumnKey("sheet-3", "Sample Mean"), "sheet-3::Sample Mean");
});

test("isRelativeRowOffsetRef", () => {
  assert.equal(isRelativeRowOffsetRef("prev_row"), true);
  assert.equal(isRelativeRowOffsetRef("next_row"), true);
  assert.equal(isRelativeRowOffsetRef("sheet-1::Sample Mean"), false);
  assert.equal(isRelativeRowOffsetRef("summary::avg"), false);
});
