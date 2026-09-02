import assert from "node:assert/strict";
import {
  coerceNumberColumnsInRows,
  parseNumberTypedCell,
} from "./coerceNumberTypedCells.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("parseNumberTypedCell coerces numeric strings and comma-formatted values", () => {
  assert.equal(parseNumberTypedCell("42"), 42);
  assert.equal(parseNumberTypedCell(" 3.5 "), 3.5);
  assert.equal(parseNumberTypedCell("1,000,000"), 1000000);
  assert.equal(parseNumberTypedCell(12), 12);
  assert.equal(parseNumberTypedCell(""), null);
  assert.equal(parseNumberTypedCell("not-a-number"), null);
  assert.equal(parseNumberTypedCell("1234567890123456"), null);
});

test("coerceNumberColumnsInRows only touches declared number fields", () => {
  const rows = [
    { Band: "0 < volume < 10,000", Market_count: "12", Total_volume: "3456.7" },
    { Band: "volume = 0", Market_count: "0", Total_volume: "0" },
  ];
  const out = coerceNumberColumnsInRows(rows, ["Market_count", "Total_volume"]);
  assert.equal(out[0].Band, "0 < volume < 10,000");
  assert.equal(out[0].Market_count, 12);
  assert.equal(out[0].Total_volume, 3456.7);
  assert.equal(out[1].Market_count, 0);
  assert.equal(out[1].Total_volume, 0);
});
