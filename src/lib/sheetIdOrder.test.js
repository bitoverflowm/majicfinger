import assert from "node:assert/strict";
import {
  collectSheetIdOrderColumnNames,
  findSheetIdOrderColumn,
  isNumberLikeSheetDataType,
  isSheetIdDataType,
  mergeDetectedDataTypesPreservingId,
  orderRowsByVolumeBandPresets,
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

test("orderRowsByVolumeBandPresets restores definition order when id is missing", () => {
  const rows = [
    { band: "10,000 ≤ volume < 100,000", label: "10,000 ≤ v < 100,000", market_share: 25 },
    { band: "volume ≥ 100,000,000", label: "v ≥ 100,000,000", market_share: 0.01 },
    { band: "0 < volume < 10,000", label: "0 < v < 10,000", market_share: 45 },
    { band: "volume = 0", label: "v = 0", market_share: 18 },
  ];
  const out = orderRowsByVolumeBandPresets(rows);
  assert.equal(out[0].band, "volume = 0");
  assert.equal(out[1].band, "0 < volume < 10,000");
  assert.equal(out[2].band, "10,000 ≤ volume < 100,000");
  assert.equal(out[3].band, "volume ≥ 100,000,000");
});

test("orderSheetRowsByDataTypes recovers band order when typed id column was stripped", () => {
  const rows = [
    { band: "1,000,000 ≤ volume < 10,000,000", label: "1,000,000 ≤ v < 10,000,000" },
    { band: "volume = 0", label: "v = 0" },
    { band: "0 < volume < 10,000", label: "0 < v < 10,000" },
  ];
  const out = orderSheetRowsByDataTypes(rows, { id: "id" });
  assert.equal(out[0].label, "v = 0");
  assert.equal(out[1].label, "0 < v < 10,000");
  assert.equal(out[2].label, "1,000,000 ≤ v < 10,000,000");
});

test("collectSheetIdOrderColumnNames includes typed id even when rows dropped it", () => {
  const names = collectSheetIdOrderColumnNames({
    dataTypes: { id: "id", volume: "number" },
    data: [{ band: "volume = 0", volume: 0 }],
  });
  assert.ok(names.includes("id"));
  assert.ok(names.includes("_id"));
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
