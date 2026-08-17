import assert from "node:assert/strict";
import {
  advancePolymarketCandles,
  applyPolymarketCandleOverlay,
  buildPolymarketCandlestickSeedRows,
  upsertPolymarketTradeCandle,
} from "@/lib/polymarketLive/polymarketCandlesticks.js";

{
  const rows = buildPolymarketCandlestickSeedRows(
    [
      { asset_id: "yes", timestamp: "1700000040000", price: 0.4 },
      { asset_id: "yes", timestamp: "1700000050000", price: 0.6 },
      { asset_id: "yes", timestamp: "1700000055000", price: 0.3 },
    ],
    "1m",
  );
  assert.equal(rows.length, 1);
  assert.deepEqual(
    [
      rows[0].price_open_dollars,
      rows[0].price_high_dollars,
      rows[0].price_low_dollars,
      rows[0].price_close_dollars,
    ],
    [0.4, 0.6, 0.3, 0.3],
  );
  console.log("ok polymarket candlestick seeds aggregate price history into OHLC");
}

{
  let rows = upsertPolymarketTradeCandle(
    [],
    { asset_id: "yes", timestamp: 1_700_000_040_000, price: "0.45", size: "10", transaction_hash: "a" },
    "1m",
  );
  rows = upsertPolymarketTradeCandle(
    rows,
    { asset_id: "yes", timestamp: 1_700_000_050_000, price: "0.55", size: "4", transaction_hash: "b" },
    "1m",
  );
  assert.equal(rows[0].price_open_dollars, 0.45);
  assert.equal(rows[0].price_high_dollars, 0.55);
  assert.equal(rows[0].price_close_dollars, 0.55);
  assert.equal(rows[0].volume, 14);
  console.log("ok polymarket live trades update active candle OHLC and volume");
}

{
  const rows = advancePolymarketCandles(
    buildPolymarketCandlestickSeedRows(
      [{ asset_id: "yes", timestamp: 1_700_000_040_000, price: 0.4 }],
      "1m",
    ),
    1_700_000_190_000,
    "1m",
  );
  assert.equal(rows.length, 3);
  assert.equal(rows.at(-1).price_close_dollars, 0.4);
  assert.equal(rows.at(-1).volume, 0);
  assert.equal(rows.at(-1).is_final, false);
  console.log("ok polymarket quiet intervals carry close with zero volume");
}

{
  const rows = applyPolymarketCandleOverlay(
    buildPolymarketCandlestickSeedRows(
      [{ asset_id: "yes", timestamp: 1_700_000_040_000, price: 0.4 }],
      "1m",
    ),
    { asset_id: "yes", best_bid: "0.38", best_ask: "0.42" },
  );
  assert.equal(rows[0].price_close_dollars, 0.4);
  assert.equal(rows[0].midpoint, 0.4);
  assert.equal(rows[0].spread, 0.03999999999999998);
  console.log("ok polymarket price changes update overlays without changing OHLC");
}
