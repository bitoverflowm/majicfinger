import assert from "node:assert/strict";
import {
  aliasScopedColumnKeysOnRows,
  collectChartSnapshotColumnsBySheetId,
  projectRowObjectsToColumnSet,
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

test("candlestick snapshots keep OHLC columns even when polluted with markets axes", () => {
  const candleSheets = {
    "sheet-1": {
      name: "markets",
      data: [{ yes_sub_title: "A", last_price_dollars: "0.2" }],
    },
    "sheet-17": {
      name: "candles",
      data: [
        {
          end_period_ts: 100,
          yes_bid_open_dollars: 0.1,
          yes_bid_high_dollars: 0.2,
          yes_bid_low_dollars: 0.05,
          yes_bid_close_dollars: 0.15,
          price_open_dollars: null,
          price_high_dollars: null,
          price_low_dollars: null,
          price_close_dollars: null,
        },
      ],
    },
  };
  const snapshot = {
    v: 1,
    selChartType: "candlestick",
    candlestickSheetId: "sheet-17",
    candlestickOhlcSetId: "auto",
    // Unscoped markets axes — the bug that wiped public candle sheets.
    selX: "yes_sub_title",
    selY: ["last_price_dollars"],
  };
  const cols = collectChartSnapshotColumnsBySheetId(snapshot, "sheet-17", candleSheets);
  const candleCols = cols.get("sheet-17");
  assert.ok(candleCols);
  assert.ok(candleCols.has("end_period_ts"));
  assert.ok(candleCols.has("yes_bid_open_dollars"));
  assert.ok(candleCols.has("yes_bid_close_dollars"));
  assert.ok(candleCols.has("price_open_dollars"));
  // Unscoped markets axes must not land on the candle sheet.
  assert.equal(candleCols.has("yes_sub_title"), false);
  assert.equal(candleCols.has("last_price_dollars"), false);

  const projected = projectRowObjectsToColumnSet(candleSheets["sheet-17"].data, candleCols);
  assert.equal(projected[0].end_period_ts, 100);
  assert.equal(projected[0].yes_bid_close_dollars, 0.15);
});

test("candlestick snapshots still allow scoped markets axes on sheet-1", () => {
  const candleSheets = {
    "sheet-1": { name: "markets", data: [{ yes_sub_title: "A", last_price_dollars: "0.2" }] },
    "sheet-21": {
      name: "candles",
      data: [{ end_period_ts: 1, yes_bid_open_dollars: 0.1, yes_bid_high_dollars: 0.1, yes_bid_low_dollars: 0.1, yes_bid_close_dollars: 0.1 }],
    },
  };
  const snapshot = {
    v: 1,
    selChartType: "candlestick",
    candlestickSheetId: "sheet-21",
    selX: "sheet-1::yes_sub_title",
    selY: ["sheet-1::last_price_dollars"],
  };
  const cols = collectChartSnapshotColumnsBySheetId(snapshot, "sheet-21", candleSheets);
  assert.ok(cols.get("sheet-1")?.has("yes_sub_title"));
  assert.ok(cols.get("sheet-21")?.has("end_period_ts"));
  assert.equal(cols.get("sheet-21")?.has("yes_sub_title"), false);
});
