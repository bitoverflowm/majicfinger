import assert from "node:assert/strict";
import { ohlcRowsToCandles, rangesForCandles, tradeOutcomes, tradeTimes, tradesToCandles } from "./tradeMarketCandles.js";

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

const labels = (points) => rangesForCandles(points).map((range) => range.label);
const HOUR = 60 * 60 * 1000;
assert.deepEqual(labels([{ t: start, close: 0.5 }, { t: start + 2 * HOUR, close: 0.6 }]), ["All"]);
const minutes = Array.from({ length: 2 * 24 * 60 }, (_, i) => ({ t: start + i * 60_000 }));
assert.deepEqual(labels(minutes), ["15m", "1H", "6H", "1D", "All"]);
const hours = Array.from({ length: 44 }, (_, i) => ({ t: start + i * HOUR }));
assert.deepEqual(labels(hours), ["6H", "1D", "All"]);
const halfDays = Array.from({ length: 600 }, (_, i) => start + i * 12 * HOUR);
assert.deepEqual(labels(halfDays), ["1D", "1W", "1M", "3M", "All"]);
const monthOfDays = Array.from({ length: 60 }, (_, i) => ({ t: start + i * 24 * HOUR }));
assert.deepEqual(labels(monthOfDays), ["1W", "1M", "All"]);

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

const polyColumns = [
  { id: "observed_at", title: "Observed At" },
  { id: "outcome", title: "Outcome" },
  { id: "side", title: "Side" },
  { id: "price", title: "Price" },
  { id: "size", title: "Size" },
];
const polyRows = [
  ["10/8/2026, 8:58:04 PM", "No", "BUY", "0.995", "10"],
  ["10/8/2026, 8:55:00 PM", "Yes", "SELL", "0.005", "20"],
  ["10/8/2026, 8:50:00 PM", "Yes", "BUY", "0.004", "5"],
];
assert.deepEqual(tradeOutcomes(polyColumns, polyRows), ["Yes", "No"]);
assert.deepEqual(tradeOutcomes(columns, rows), []);
const noSide = tradesToCandles(polyColumns, polyRows, { outcome: "No" });
assert.equal(noSide.outcome, "No");
assert.ok(noSide.candles.every((candle) => candle.close > 0.9));
assert.equal(noSide.candles.reduce((sum, candle) => sum + candle.volume, 0), 10);

assert.equal(tradeTimes(polyColumns, polyRows).length, 3);
assert.equal(tradeTimes(polyColumns, polyRows, "Yes").length, 2);

const spread = Array.from({ length: 1000 }, (_, i) => [new Date(start + i * HOUR).toISOString(), 0.5, 1]);
const fullSpread = tradesToCandles(columns, spread);
const lastTime = start + 999 * HOUR;
const since = lastTime - 24 * HOUR;
const lastDay = tradesToCandles(columns, spread, { since });
assert.ok(lastDay.candles.every((candle) => candle.t >= since));
assert.equal(lastDay.candles.reduce((sum, candle) => sum + candle.volume, 0), 25);
assert.ok(lastDay.candles.length > fullSpread.candles.filter((candle) => candle.t >= since).length);

const kalshiLakeColumns = [
  { id: "created_time", title: "Created time", type: "date" },
  { id: "ticker", title: "Ticker" },
  { id: "taker_side", title: "Side" },
  { id: "yes_price", title: "Yes price", scale: "cents" },
  { id: "no_price", title: "No price", scale: "cents" },
  { id: "count", title: "Size" },
];
const nanos = (ms) => String(BigInt(ms) * 1_000_000n);
const kalshiLakeRows = [
  [nanos(start + 2000), "KXFED-26DEC", "yes", "62¢", "38¢", "5"],
  [nanos(start + 1000), "KXFED-26DEC", "no", "60¢", "40¢", "3"],
  [nanos(start), "KXFED-26DEC", "yes", "58", "42", "2"],
];
assert.deepEqual(tradeOutcomes(kalshiLakeColumns, kalshiLakeRows), ["Yes", "No"]);
const kalshiYes = tradesToCandles(kalshiLakeColumns, kalshiLakeRows, { outcome: "Yes" });
assert.equal(kalshiYes.outcome, "Yes");
assert.equal(kalshiYes.candles[0].t, start);
assert.equal(kalshiYes.candles[0].open, 0.58);
assert.equal(kalshiYes.candles[kalshiYes.candles.length - 1].close, 0.62);
assert.equal(kalshiYes.candles.reduce((sum, candle) => sum + candle.volume, 0), 10);
const kalshiNo = tradesToCandles(kalshiLakeColumns, kalshiLakeRows, { outcome: "No" });
assert.equal(kalshiNo.outcome, "No");
assert.equal(kalshiNo.candles[0].open, 0.42);
assert.equal(kalshiNo.candles[kalshiNo.candles.length - 1].close, 0.38);
assert.deepEqual(tradeTimes(kalshiLakeColumns, kalshiLakeRows), [start, start + 1000, start + 2000]);
const athenaNanos = [["1.737390680081725E18", "PRES-2024-KH", "yes", "1.0", "99.0", "6.0"]];
assert.deepEqual(tradeTimes(kalshiLakeColumns, athenaNanos).map(Math.round), [Date.parse("2025-01-20T16:31:20.082Z")]);
const liveKalshiColumns = [...columns, { id: "no_price_dollars", title: "No Price Dollars", type: "number" }];
assert.deepEqual(tradeOutcomes(liveKalshiColumns, rows), []);

console.log("tradeMarketCandles ok");
