import assert from "node:assert/strict";
import {
  appendLiveCells,
  cellsFromRecords,
  patchPriceCells,
  priceSymbolsForSheet,
  realtimeAssets,
  realtimeSheetForBlock,
  realtimeTargetForBlock,
  sheetMarketTicker,
  tailCells,
} from "@/lib/realtime/sheetRealtime.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("chainlink and kalshi live sheets qualify, historical trades do not", () => {
  assert.equal(realtimeTargetForBlock({ type: "sheet", integrationId: "chainlink", table: "prices" })?.endpoint, "prices");
  assert.equal(realtimeTargetForBlock({ type: "sheet", integrationId: "kalshiLive", table: "trades" })?.livePath, "api_poll");
  assert.equal(
    realtimeTargetForBlock({ type: "sheet", provenance: { lake: "kalshi", table: "trades", integrationId: "kalshiHistorical" } }),
    null,
  );
  assert.equal(realtimeTargetForBlock({ type: "sheet", integrationId: "kalshiLive", table: "markets" }), null);
});

test("a chart qualifies through its source sheet", () => {
  const sheet = { id: "sheet-1", type: "sheet", integrationId: "binance", table: "prices", title: "Prices" };
  const chart = { id: "chart-1", type: "chart", sourceSheetId: "sheet-1" };
  const match = realtimeSheetForBlock(chart, [sheet, chart]);
  assert.equal(match?.sheet.id, "sheet-1");
  assert.equal(match?.def.integration, "binance");
});

test("the realtime list includes a running sheet and its chart", () => {
  const blocks = [
    { id: "sheet-1", type: "sheet", integrationId: "chainlink", table: "prices", title: "Chainlink" },
    { id: "chart-1", type: "chart", sourceSheetId: "sheet-1", title: "Chainlink chart" },
    { id: "sheet-2", type: "sheet", integrationId: "chainlink", table: "prices", title: "Idle" },
  ];
  const assets = realtimeAssets(blocks, { ":sheet-1": { running: true } });
  assert.deepEqual(
    assets.map((asset) => asset.id),
    ["sheet-1", "chart-1"],
  );
});

test("ticker comes from the pull, then the title", () => {
  assert.equal(sheetMarketTicker({ pull: { ticker: "KX-1" }, title: "Trades · OTHER" }), "KX-1");
  assert.equal(sheetMarketTicker({ title: "Trades · KXBTC-25" }), "KXBTC-25");
});

test("price ticks update the matching symbol and charts can follow the tail", () => {
  const columns = [
    { id: "symbol", title: "Symbol" },
    { id: "price", title: "Price" },
  ];
  const block = {
    columns,
    cells: { "0,0": "BTC/USD", "1,0": "1" },
  };
  assert.deepEqual(priceSymbolsForSheet(block, { symbols: ["btc/usd", "eth/usd"] }), ["btc/usd"]);
  const next = patchPriceCells(columns, block.cells, { symbol: "btc/usd", price: 64000, at: Date.now() });
  assert.equal(next["1,0"], "64,000");
  const tailed = tailCells({ "0,0": "a", "0,1": "b", "0,2": "c" }, 2);
  assert.deepEqual(tailed, { "0,0": "b", "0,1": "c" });
});

test("live ticks append without dropping the rows already on the sheet", () => {
  const existing = { "0,0": "old", "0,1": "older" };
  const next = appendLiveCells(existing, { "0,0": "tick" }, 1, 1);
  assert.equal(next["0,0"], "old");
  assert.equal(next["0,1"], "older");
  assert.equal(next["0,2"], "tick");
  const capped = appendLiveCells(next, { "0,0": "newer" }, 1, 1);
  assert.equal(capped["0,0"], "old");
  assert.equal(capped["0,1"], "older");
  assert.equal(capped["0,2"], undefined);
  assert.equal(capped["0,3"], "newer");
});

test("polled rows land on columns by id", () => {
  const cells = cellsFromRecords(
    [
      { id: "ticker", title: "Ticker" },
      { id: "yes_price_dollars", title: "Yes price dollars", type: "number" },
    ],
    [{ ticker: "KX-1", yes_price_dollars: 0.56 }],
  );
  assert.equal(cells["0,0"], "KX-1");
  assert.equal(cells["1,0"], "0.56");
});
