import assert from "node:assert/strict";
import {
  PRICE_STREAM_CAP,
  isPriceStreamIntegration,
  mergePriceRows,
  priceMessagePoints,
  priceRowsFromPoints,
  priceStreamFeed,
  priceStreamPairTitle,
  priceStreamPairs,
  priceStreamSubscription,
  priceStreamSymbol,
} from "@/lib/priceStreams.js";
import { getRealtimeEndpoint } from "@/lib/realtime/endpointRegistry.js";
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
  assert.deepEqual(priceMessagePoints(snapshot, "btc/usd"), [
    { timestamp: 1000, value: 100 },
    { timestamp: 2000, value: 101 },
  ]);
  const update = { topic: "crypto_prices_twap_sixty", type: "update", payload: { symbol: "btc/usd", timestamp: 3000, value: 102, window_s: 60 } };
  assert.deepEqual(priceMessagePoints(update, "BTC/USD"), [{ timestamp: 3000, value: 102 }]);
  assert.deepEqual(priceMessagePoints({ ...update, payload: { ...update.payload, symbol: "eth/usd" } }, "btc/usd"), []);
  assert.deepEqual(priceMessagePoints({ payload: { value: 1 } }, "btc/usd"), []);
  assert.deepEqual(priceMessagePoints("PONG", "btc/usd"), []);
});

test("Binance messages parse the same way, full-accuracy string and all", () => {
  const update = {
    topic: "crypto_prices",
    type: "update",
    payload: { full_accuracy_value: "2383.40000000", symbol: "ethusdt", timestamp: 1792335863000, value: 2383.4 },
  };
  assert.deepEqual(priceMessagePoints(update, "ethusdt"), [{ timestamp: 1792335863000, value: 2383.4 }]);
  assert.deepEqual(priceMessagePoints(update, "btcusdt"), []);
});

test("every pair subscribes with a symbol filter, the only form the socket answers", () => {
  assert.deepEqual(priceStreamSubscription("crypto_prices", "BTCUSDT"), {
    topic: "crypto_prices",
    type: "*",
    filters: JSON.stringify({ symbol: "btcusdt" }),
  });
});

test("rows are oldest first, one per timestamp, and skip what the sheet already has", () => {
  const points = [{ timestamp: 3000, value: 3 }, { timestamp: 1000, value: 1 }, { timestamp: 3000, value: 3 }, { timestamp: 2000, value: 2 }];
  assert.deepEqual(
    priceRowsFromPoints(points, { symbol: "eth/usd", windowSeconds: 60, after: 1000 }),
    [
      { time: 2000, symbol: "ETH/USD", price: 2, window_seconds: 60 },
      { time: 3000, symbol: "ETH/USD", price: 3, window_seconds: 60 },
    ],
  );
  assert.deepEqual(priceRowsFromPoints([{ timestamp: 5, value: 9 }], { symbol: "solusdt" }), [{ time: 5, symbol: "SOLUSDT", price: 9 }]);
});

test("merging a snapshot then updates keeps order and drops overlap", () => {
  let rows = mergePriceRows([], [{ timestamp: 1000, value: 1 }, { timestamp: 2000, value: 2 }], { symbol: "btc/usd" });
  rows = mergePriceRows(rows, [{ timestamp: 2000, value: 2 }, { timestamp: 3000, value: 3 }], { symbol: "btc/usd" });
  assert.deepEqual(rows.map((row) => row.time), [1000, 2000, 3000]);
  const same = mergePriceRows(rows, [{ timestamp: 3000, value: 3 }], { symbol: "btc/usd" });
  assert.equal(same, rows);
  const capped = mergePriceRows(rows, [{ timestamp: 4000, value: 4 }], { symbol: "btc/usd", cap: 2 });
  assert.deepEqual(capped.map((row) => row.time), [3000, 4000]);
  assert.ok(PRICE_STREAM_CAP >= 1000);
});

test("providers list their own pairs and feeds", () => {
  assert.equal(isPriceStreamIntegration("chainlink"), true);
  assert.equal(isPriceStreamIntegration("binance"), true);
  assert.equal(isPriceStreamIntegration("polymarket"), false);
  assert.deepEqual(priceStreamPairs("binance").map((pair) => pair.id), ["btcusdt", "ethusdt", "solusdt", "xrpusdt", "bnbusdt", "dogeusdt"]);
  assert.equal(priceStreamFeed("binance", "prices")?.topic, "crypto_prices");
  assert.equal(priceStreamFeed("chainlink", "twap_60")?.windowSeconds, 60);
  assert.equal(priceStreamFeed("binance", "twap_60"), null);
});

test("pair titles come from the provider's coin list", () => {
  assert.equal(priceStreamPairTitle("chainlink", "zec/usd"), "ZEC / USD");
  assert.equal(priceStreamPairTitle("chainlink", "abc/usd"), "ABC/USD");
  assert.equal(priceStreamPairTitle("binance", "BNBUSDT"), "BNB / USDT");
});

test("the realtime registry streams every Binance pair", () => {
  const def = getRealtimeEndpoint("binance", "prices");
  assert.equal(def?.livePath, "client_websocket");
  assert.deepEqual(def?.symbols, priceStreamPairs("binance").map((pair) => pair.id));
  assert.equal(getRealtimeEndpoint("binance", "dogeusdt")?.endpoint, "prices");
});

const pairColumns = [
  { id: "time", title: "Time", type: "date" },
  { id: "symbol", title: "Symbol", type: "text" },
  { id: "price", title: "Price", type: "number" },
];

test("pair sheets are told apart from the old one-row-per-coin price sheets", () => {
  assert.equal(priceStreamSymbol({ integrationId: "chainlink", columns: pairColumns, pull: { mode: "stream", symbol: "ETH/USD" } }), "eth/usd");
  assert.equal(priceStreamSymbol({ integrationId: "chainlink", columns: pairColumns, records: [{ time: 1, symbol: "SOL/USD", price: 2 }] }), "sol/usd");
  const oldSheet = { integrationId: "chainlink", columns: [{ id: "name" }, { id: "symbol" }, { id: "price" }, { id: "updated" }], records: [{ symbol: "BTC/USD" }] };
  assert.equal(priceStreamSymbol(oldSheet), "");
  assert.equal(priceStreamSymbol({ integrationId: "binance", columns: pairColumns, pull: { mode: "stream", symbol: "BTCUSDT" } }), "btcusdt");
  assert.equal(priceStreamSymbol({ ...oldSheet, integrationId: "binance", records: [{ symbol: "BTCUSDT" }] }), "");
  assert.equal(priceStreamSymbol({ integrationId: "polymarket", columns: pairColumns, pull: { mode: "stream", symbol: "btcusdt" } }), "");
});

test("a pair sheet opens a Liveline chart, even before it has rows", () => {
  const sheet = { type: "sheet", title: "BTC / USD · Up/Down settlement price", integrationId: "chainlink", table: "twap_60", columns: pairColumns, pull: { table: "twap_60", symbol: "btc/usd", mode: "stream" } };
  const specs = chartSpecsForSheet(sheet);
  assert.deepEqual(specs.map((spec) => spec.chartView), ["liveline"]);
  assert.equal(specs[0].title, "BTC / USD · Up/Down settlement price chart");
  const binance = { ...sheet, title: "SOL / USDT · Spot price", integrationId: "binance", table: "prices", pull: { table: "prices", symbol: "solusdt", mode: "stream" } };
  assert.deepEqual(chartSpecsForSheet(binance).map((spec) => spec.chartView), ["liveline"]);
});

test("saved pair sheets keep the pair they stream", () => {
  const saved = sanitizeWorkspaceDashboard({
    tabs: [{ id: "welcome", name: "Welcome" }],
    blocks: {
      welcome: [
        {
          id: "run-chainlink-twap_60-btc-usd",
          type: "sheet",
          title: "BTC / USD · Up/Down settlement price",
          integrationId: "chainlink",
          table: "twap_60",
          columns: [{ id: "time", title: "Time", type: "date" }, { id: "price", title: "Price", type: "number" }],
          cells: { "1,0": "100" },
          pull: { table: "twap_60", symbol: "BTC/USD", mode: "stream" },
        },
        {
          id: "run-binance-prices-ethusdt",
          type: "sheet",
          title: "ETH / USDT · Spot price",
          integrationId: "binance",
          table: "prices",
          columns: [{ id: "time", title: "Time", type: "date" }, { id: "price", title: "Price", type: "number" }],
          cells: { "1,0": "2383.4" },
          pull: { table: "prices", symbol: "ETHUSDT", mode: "stream" },
        },
      ],
    },
  });
  assert.deepEqual(saved.blocks.welcome[0].pull, { table: "twap_60", symbol: "btc/usd", mode: "stream" });
  assert.deepEqual(saved.blocks.welcome[1].pull, { table: "prices", symbol: "ethusdt", mode: "stream" });
});
