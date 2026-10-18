import assert from "node:assert/strict";
import {
  CHAINLINK_STREAM_CAP,
  chainlinkMessagePoints,
  chainlinkPairTitle,
  chainlinkRowsFromPoints,
  chainlinkStreamSymbol,
  mergeChainlinkRows,
} from "@/lib/chainlinkFeeds.js";
import { sanitizeWorkspaceDashboard } from "@/lib/workspaceDashboardDocument.js";
import { chartSpecsForSheet } from "@/lib/visualizations/sheetCharts.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("snapshot and update messages give points for their pair only", () => {
  const snapshot = {
    topic: "crypto_prices",
    type: "subscribe",
    payload: { symbol: "btc/usd", data: [{ timestamp: 1000, value: 100 }, { timestamp: 2000, value: 101 }] },
  };
  assert.deepEqual(chainlinkMessagePoints(snapshot, "btc/usd"), [
    { timestamp: 1000, value: 100 },
    { timestamp: 2000, value: 101 },
  ]);
  const update = { topic: "crypto_prices_twap_sixty", type: "update", payload: { symbol: "btc/usd", timestamp: 3000, value: 102, window_s: 60 } };
  assert.deepEqual(chainlinkMessagePoints(update, "BTC/USD"), [{ timestamp: 3000, value: 102 }]);
  assert.deepEqual(chainlinkMessagePoints({ ...update, payload: { ...update.payload, symbol: "eth/usd" } }, "btc/usd"), []);
  assert.deepEqual(chainlinkMessagePoints({ payload: { value: 1 } }, "btc/usd"), []);
  assert.deepEqual(chainlinkMessagePoints("PONG", "btc/usd"), []);
});

test("rows are oldest first, one per timestamp, and skip what the sheet already has", () => {
  const points = [{ timestamp: 3000, value: 3 }, { timestamp: 1000, value: 1 }, { timestamp: 3000, value: 3 }, { timestamp: 2000, value: 2 }];
  assert.deepEqual(
    chainlinkRowsFromPoints(points, { symbol: "eth/usd", windowSeconds: 60, after: 1000 }),
    [
      { time: 2000, symbol: "ETH/USD", price: 2, window_seconds: 60 },
      { time: 3000, symbol: "ETH/USD", price: 3, window_seconds: 60 },
    ],
  );
  assert.deepEqual(chainlinkRowsFromPoints([{ timestamp: 5, value: 9 }], { symbol: "sol/usd" }), [{ time: 5, symbol: "SOL/USD", price: 9 }]);
});

test("merging a snapshot then updates keeps order and drops overlap", () => {
  let rows = mergeChainlinkRows([], [{ timestamp: 1000, value: 1 }, { timestamp: 2000, value: 2 }], { symbol: "btc/usd" });
  rows = mergeChainlinkRows(rows, [{ timestamp: 2000, value: 2 }, { timestamp: 3000, value: 3 }], { symbol: "btc/usd" });
  assert.deepEqual(rows.map((row) => row.time), [1000, 2000, 3000]);
  const same = mergeChainlinkRows(rows, [{ timestamp: 3000, value: 3 }], { symbol: "btc/usd" });
  assert.equal(same, rows);
  const capped = mergeChainlinkRows(rows, [{ timestamp: 4000, value: 4 }], { symbol: "btc/usd", cap: 2 });
  assert.deepEqual(capped.map((row) => row.time), [3000, 4000]);
  assert.ok(CHAINLINK_STREAM_CAP >= 1000);
});

test("pair titles come from the coin list", () => {
  assert.equal(chainlinkPairTitle("zec/usd"), "ZEC / USD");
  assert.equal(chainlinkPairTitle("abc/usd"), "ABC/USD");
});

const pairColumns = [
  { id: "time", title: "Time", type: "date" },
  { id: "symbol", title: "Symbol", type: "text" },
  { id: "price", title: "Price", type: "number" },
];

test("pair sheets are told apart from the old one-row-per-coin price sheets", () => {
  assert.equal(chainlinkStreamSymbol({ integrationId: "chainlink", columns: pairColumns, pull: { mode: "stream", symbol: "ETH/USD" } }), "eth/usd");
  assert.equal(chainlinkStreamSymbol({ integrationId: "chainlink", columns: pairColumns, records: [{ time: 1, symbol: "SOL/USD", price: 2 }] }), "sol/usd");
  const oldSheet = { integrationId: "chainlink", columns: [{ id: "name" }, { id: "symbol" }, { id: "price" }, { id: "updated" }], records: [{ symbol: "BTC/USD" }] };
  assert.equal(chainlinkStreamSymbol(oldSheet), "");
  assert.equal(chainlinkStreamSymbol({ integrationId: "binance", columns: pairColumns, pull: { mode: "stream", symbol: "btc/usd" } }), "");
});

test("a pair sheet opens a Liveline chart, even before it has rows", () => {
  const sheet = { type: "sheet", title: "BTC / USD · Up/Down settlement price", integrationId: "chainlink", table: "twap_60", columns: pairColumns, pull: { table: "twap_60", symbol: "btc/usd", mode: "stream" } };
  const specs = chartSpecsForSheet(sheet);
  assert.deepEqual(specs.map((spec) => spec.chartView), ["liveline"]);
  assert.equal(specs[0].title, "BTC / USD · Up/Down settlement price chart");
});

test("saved pair sheets keep the pair they stream", () => {
  const saved = sanitizeWorkspaceDashboard({
    tabs: [{ id: "welcome", name: "Welcome" }],
    blocks: {
      welcome: [{
        id: "run-chainlink-twap_60-btc-usd",
        type: "sheet",
        title: "BTC / USD · Up/Down settlement price",
        integrationId: "chainlink",
        table: "twap_60",
        columns: [{ id: "time", title: "Time", type: "date" }, { id: "price", title: "Price", type: "number" }],
        cells: { "1,0": "100" },
        pull: { table: "twap_60", symbol: "BTC/USD", mode: "stream" },
      }],
    },
  });
  assert.deepEqual(saved.blocks.welcome[0].pull, { table: "twap_60", symbol: "btc/usd", mode: "stream" });
});
