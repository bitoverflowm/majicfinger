import assert from "node:assert/strict";
import { normalizeBuilderSnapshot } from "./chartBundle.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

const rows = [
  { title: "A", yes_rate: 0.5, lifecycle_checkpoint: 1 },
  { title: "B", yes_rate: 0.7, lifecycle_checkpoint: 2 },
];

test("normalizeBuilderSnapshot preserves chart line filters", () => {
  const snapshot = {
    v: 1,
    selChartType: "line",
    selX: "title",
    selY: ["yes_rate"],
    chartLineFilters: [
      {
        id: "f1",
        seriesKey: "line:0",
        column: "lifecycle_checkpoint",
        operator: "=",
        value: "1",
      },
    ],
  };
  const out = normalizeBuilderSnapshot(snapshot, rows, {});
  assert.equal(Array.isArray(out.chartLineFilters), true);
  assert.equal(out.chartLineFilters.length, 1);
  assert.equal(out.chartLineFilters[0].seriesKey, "line:0");
  assert.equal(out.chartLineFilters[0].column, "lifecycle_checkpoint");
  assert.equal(out.chartLineFilters[0].value, "1");
});

test("normalizeBuilderSnapshot remaps legacy seriesKey to line index", () => {
  const snapshot = {
    v: 1,
    selChartType: "line",
    selX: "title",
    selY: ["sheet-2::yes_rate"],
    chartLineFilters: [
      {
        id: "f1",
        seriesKey: "sheet-2::yes_rate",
        column: "sheet-2::lifecycle_checkpoint",
        operator: "=",
        value: "1",
      },
    ],
  };
  const dataSheets = {
    "sheet-2": { name: "Sheet 2", data: rows },
  };
  const out = normalizeBuilderSnapshot(snapshot, rows, dataSheets);
  assert.equal(out.chartLineFilters.length, 1);
  assert.equal(out.chartLineFilters[0].seriesKey, "line:0");
  assert.equal(out.chartLineFilters[0].column, "sheet-2::lifecycle_checkpoint");
});

test("normalizeBuilderSnapshot preserves duplicate selY for per-line filters", () => {
  const snapshot = {
    v: 1,
    selChartType: "line",
    selX: "title",
    selY: ["yes_rate", "yes_rate", "yes_rate"],
    chartLineFilters: [
      { id: "f0", seriesKey: "line:0", column: "lifecycle_checkpoint", operator: "=", value: "1" },
      { id: "f1", seriesKey: "line:1", column: "lifecycle_checkpoint", operator: "=", value: "2" },
      { id: "f2", seriesKey: "line:2", column: "lifecycle_checkpoint", operator: "=", value: "3" },
    ],
  };
  const out = normalizeBuilderSnapshot(snapshot, rows, {});
  assert.equal(Array.isArray(out.selY), true);
  assert.equal(out.selY.length, 3);
  assert.equal(out.chartLineFilters.length, 3);
  assert.equal(out.chartLineFilters[2].seriesKey, "line:2");
});

test("normalizeBuilderSnapshot keeps saved snapshot when row keys are not loaded yet", () => {
  const snapshot = {
    v: 1,
    selChartType: "line",
    selX: "title",
    selY: ["yes_rate"],
    chartLineFilters: [
      {
        id: "f1",
        seriesKey: "line:0",
        column: "lifecycle_checkpoint",
        operator: "=",
        value: "1",
      },
    ],
  };
  const out = normalizeBuilderSnapshot(snapshot, [], {});
  assert.equal(out.selX, "title");
  assert.equal(out.chartLineFilters?.length, 1);
});

test("normalizeBuilderSnapshot does not inject markets axes onto candlestick charts", () => {
  const candleRows = [
    {
      end_period_ts: 100,
      yes_bid_open_dollars: 0.1,
      yes_bid_high_dollars: 0.2,
      yes_bid_low_dollars: 0.05,
      yes_bid_close_dollars: 0.15,
    },
  ];
  const dataSheets = {
    "sheet-1": {
      name: "markets",
      data: [{ yes_sub_title: "7,400", last_price_dollars: "0.20" }],
    },
    "sheet-17": { name: "candles", data: candleRows },
  };
  const snapshot = {
    v: 1,
    selChartType: "candlestick",
    candlestickSheetId: "sheet-17",
    candlestickOhlcSetId: "auto",
    selX: "yes_sub_title",
    selY: ["last_price_dollars"],
    titleHidden: true,
  };
  const out = normalizeBuilderSnapshot(snapshot, candleRows, dataSheets);
  assert.equal(out.selChartType, "candlestick");
  assert.equal(out.candlestickSheetId, "sheet-17");
  assert.equal(out.candlestickOhlcSetId, "auto");
  assert.equal(out.selX, null);
  assert.deepEqual(out.selY, []);
});

test("normalizeBuilderSnapshot preserves heatmap type and change column", () => {
  const heatRows = [
    { question: "A", volume: 100, change_pct: 2.5 },
    { question: "B", volume: 50, change_pct: -1.2 },
  ];
  const snapshot = {
    v: 1,
    selChartType: "heatmap",
    selX: "question",
    selY: ["volume"],
    heatmapChangeCol: "change_pct",
    heatmapCapMode: "auto",
    heatmapCap: 6,
    title: "Heatmap title",
  };
  const out = normalizeBuilderSnapshot(snapshot, heatRows, {});
  assert.equal(out.selChartType, "heatmap");
  assert.equal(out.selX, "question");
  assert.deepEqual(out.selY, ["volume"]);
  assert.equal(out.heatmapChangeCol, "change_pct");
  assert.equal(out.heatmapCapMode, "auto");
});

test("normalizeBuilderSnapshot preserves scatter type", () => {
  const snapshot = {
    v: 1,
    selChartType: "scatter",
    selX: "title",
    selY: ["yes_rate"],
  };
  const out = normalizeBuilderSnapshot(snapshot, rows, {});
  assert.equal(out.selChartType, "scatter");
});

test("normalizeBuilderSnapshot scopes scatter axes to the sheet that owns them", () => {
  const dataSheets = {
    "sheet-1": {
      name: "markets",
      data: [],
      columns: ["title", "volume"],
    },
    "sheet-5": {
      name: "calibration",
      data: [
        { avg_probability: 0.4, yes_rate: 0.35, n: 10 },
        { avg_probability: 0.7, yes_rate: 0.68, n: 12 },
      ],
      columns: ["avg_probability", "yes_rate", "n"],
    },
  };
  const snapshot = {
    v: 1,
    selChartType: "scatter",
    selX: "avg_probability",
    selY: ["yes_rate"],
  };
  const out = normalizeBuilderSnapshot(snapshot, dataSheets["sheet-1"].data, dataSheets);
  assert.equal(out.selChartType, "scatter");
  assert.equal(out.selX, "sheet-5::avg_probability");
  assert.deepEqual(out.selY, ["sheet-5::yes_rate"]);
});
