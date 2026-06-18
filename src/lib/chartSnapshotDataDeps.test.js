import assert from "node:assert/strict";
import {
  aliasScopedColumnKeysOnRows,
  collectChartSnapshotColumnsBySheetId,
  resolveChartSheetId,
} from "./chartSnapshotDataDeps.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

const dataSheets = {
  "sheet-1": {
    name: "Relative position",
    data: [
      { relative_position: 0.1, selected_yes_price: 0.5, ticker: "MKT-A" },
      { relative_position: 0.2, selected_yes_price: 0.6, ticker: "MKT-B" },
    ],
  },
};

test("resolveChartSheetId maps saved workspace sheet id to persisted sheet id", () => {
  assert.equal(resolveChartSheetId("relative_position", dataSheets, "sheet-1"), "sheet-1");
});

test("aliasScopedColumnKeysOnRows copies plain columns onto scoped builder keys", () => {
  const rows = dataSheets["sheet-1"].data;
  const out = aliasScopedColumnKeysOnRows(
    rows,
    ["relative_position::relative_position", "relative_position::selected_yes_price", "relative_position::ticker"],
    dataSheets,
    "sheet-1",
  );
  assert.equal(out.length, 2);
  assert.equal(out[0]["relative_position::relative_position"], 0.1);
  assert.equal(out[0]["relative_position::selected_yes_price"], 0.5);
  assert.equal(out[0]["relative_position::ticker"], "MKT-A");
});

test("collectChartSnapshotColumnsBySheetId maps orphan workspace sheet ids onto persisted sheet", () => {
  const snapshot = {
    v: 1,
    selX: "relative_position::relative_position",
    selY: ["relative_position::selected_yes_price", "relative_position::selected_yes_price"],
    chartLineFilters: [
      { seriesKey: "line:0", column: "relative_position::ticker", operator: "=", value: "A" },
      { seriesKey: "line:1", column: "relative_position::ticker", operator: "=", value: "B" },
    ],
  };
  const cols = collectChartSnapshotColumnsBySheetId(snapshot, "sheet-1", dataSheets);
  const sheetCols = cols.get("sheet-1");
  assert.ok(sheetCols);
  assert.ok(sheetCols.has("relative_position"));
  assert.ok(sheetCols.has("selected_yes_price"));
  assert.ok(sheetCols.has("ticker"));
  assert.equal(cols.has("relative_position"), false);
});
