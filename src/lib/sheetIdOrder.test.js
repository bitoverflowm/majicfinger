import assert from "node:assert/strict";
import {
  findSheetIdOrderColumn,
  isNumberLikeSheetDataType,
  isSheetIdDataType,
  mergeDetectedDataTypesPreservingId,
  orderSheetRowsByDataTypes,
  sortRowsByIdColumn,
  toAgGridCellDataType,
} from "./sheetIdOrder.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("id type helpers", () => {
  assert.equal(isSheetIdDataType("id"), true);
  assert.equal(isSheetIdDataType("_id"), true);
  assert.equal(isNumberLikeSheetDataType("id"), true);
  assert.equal(toAgGridCellDataType("id"), "number");
});

test("sortRowsByIdColumn orders numeric string ids", () => {
  const rows = [
    { id: "3", Band: "c" },
    { id: "1", Band: "a" },
    { id: "2", Band: "b" },
  ];
  const out = sortRowsByIdColumn(rows, "id");
  assert.equal(Number(out[0].id), 1);
  assert.equal(Number(out[1].id), 2);
  assert.equal(Number(out[2].id), 3);
  assert.equal(out[0].Band, "a");
});

test("orderSheetRowsByDataTypes uses typed id column", () => {
  const rows = [
    { id: 2, volume: 100 },
    { id: 0, volume: 0 },
    { id: 1, volume: 10 },
  ];
  const out = orderSheetRowsByDataTypes(rows, { id: "id", volume: "number" });
  assert.equal(out[0].id, 0);
  assert.equal(out[0].volume, 0);
  assert.equal(out[2].id, 2);
});

test("mergeDetectedDataTypesPreservingId keeps user id and promotes id columns", () => {
  const preserved = mergeDetectedDataTypesPreservingId(
    { id: "number", volume: "number" },
    { id: "id", volume: "text" },
  );
  assert.equal(preserved.id, "id");
  assert.equal(preserved.volume, "number");

  const promoted = mergeDetectedDataTypesPreservingId({ id: "number", Band: "text" }, {});
  assert.equal(promoted.id, "id");
  assert.equal(findSheetIdOrderColumn(promoted), "id");
});
