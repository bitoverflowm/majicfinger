import assert from "node:assert/strict";
import { ohlcRowsToCandles, rangesForCandles, tradesToCandles } from "./tradeMarketCandles.js";

const columns = [
  { id: "created_time", title: "Created time", type: "date" },
  { id: "yes_price_dollars", title: "Yes Price Dollars", type: "number" },
  { id: "count_fp", title: "Count Fp", type: "number" },
];

const start = Date.parse("2026-10-04T15:00:00Z");
const rows = [];
for (let i = 0; i < 6; i += 1) {
  rows.push([new Date(start + i * 1000).toLocaleString(), 0.5 + i * 0.01, 10 + i]);
}

const built = tradesToCandles(columns, rows);
assert.equal(built.volumeLabel, "Count fp");
assert.ok(built.candles.length >= 1);
const volume = built.candles.reduce((sum, candle) => sum + candle.volume, 0);
assert.equal(volume, 10 + 11 + 12 + 13 + 14 + 15);
assert.equal(built.candles[0].open, 0.5);
assert.equal(built.candles[built.candles.length - 1].close, 0.55);

const cents = tradesToCandles(
  [{ id: "created_time", title: "Created time" }, { id: "yes_price", title: "Yes price", scale: "cents" }, { id: "count_fp", title: "Count Fp" }],
  [[new Date(start).toLocaleString(), "53¢", "4"]],
);
assert.equal(cents.candles[0].close, 0.53);
assert.equal(cents.candles[0].volume, 4);

const ranges = rangesForCandles([
  { t: start, close: 0.5 },
  { t: start + 2 * 60 * 60 * 1000, close: 0.6 },
]);
assert.equal(ranges[ranges.length - 1].label, "All");
assert.ok(ranges.some((range) => range.label === "1H"));

const ohlcColumns = [
  { id: "end_period_ts", title: "End Period Ts", type: "date" },
  { id: "price_open_dollars", title: "Price Open Dollars" },
  { id: "price_high_dollars", title: "Price High Dollars" },
  { id: "price_low_dollars", title: "Price Low Dollars" },
  { id: "price_close_dollars", title: "Price Close Dollars" },
  { id: "volume_fp", title: "Volume Fp" },
];
const ohlc = ohlcRowsToCandles(ohlcColumns, [
  [new Date(start).toLocaleString(), "0.40", "0.55", "0.38", "0.52", "120"],
  [new Date(start + 60_000).toLocaleString(), "0.52", "0.60", "0.50", "0.58", "80"],
  [new Date(start + 60_000).toLocaleString(), "0.52", "0.61", "0.49", "0.57", "90"],
]);
assert.equal(ohlc.volumeLabel, "Volume fp");
assert.equal(ohlc.candles.length, 2);
assert.equal(ohlc.candles[0].open, 0.4);
assert.equal(ohlc.candles[0].high, 0.55);
assert.equal(ohlc.candles[0].low, 0.38);
assert.equal(ohlc.candles[0].close, 0.52);
assert.equal(ohlc.candles[0].volume, 120);
assert.equal(ohlc.candles[1].close, 0.57);
assert.equal(ohlc.candles[1].volume, 90);

const poly = tradesToCandles(
  [
    { id: "observed_at", title: "Observed At" },
    { id: "outcome", title: "Outcome" },
    { id: "side", title: "Side" },
    { id: "price", title: "Price" },
    { id: "size", title: "Size" },
  ],
  [
    ["10/8/2026, 8:58:04 PM", "No", "BUY", "0.995", "10"],
    ["10/8/2026, 8:55:00 PM", "Yes", "SELL", "0.005", "20"],
    ["10/8/2026, 8:50:00 PM", "Yes", "BUY", "0.004", "5"],
  ],
);
assert.equal(poly.units, "probability");
assert.equal(poly.outcome, "Yes");
assert.equal(poly.volumeLabel, "Volume");
assert.ok(poly.candles.length >= 1);
assert.ok(poly.candles.every((candle) => candle.close < 0.1));
assert.equal(
  poly.candles.reduce((sum, candle) => sum + candle.volume, 0),
  25,
);
assert.equal(
  poly.candles.reduce((sum, candle) => sum + candle.count, 0),
  2,
);

console.log("tradeMarketCandles ok");
