import assert from "node:assert/strict";
import {
  buildPolymarketRealtimeChartEntries,
  reconcilePolymarketRealtimeChartSheets,
} from "@/lib/polymarketLive/polymarketRealtimeCharts.js";

const session = {
  sessionId: "session-1",
  feedTypes: ["last_trade_price", "candlesticks"],
  sheetsByFeed: {
    last_trade_price: "sheet-trades",
    candlesticks: "sheet-candles",
  },
  markets: [
    {
      id: "market-1",
      title: "Will it happen?",
      selectedTokenIds: ["yes", "no"],
      outcomePairs: [
        { tokenId: "yes", outcome: "Yes" },
        { tokenId: "no", outcome: "No" },
      ],
    },
  ],
};

{
  const entries = buildPolymarketRealtimeChartEntries(session);
  assert.equal(Object.keys(entries).length, 2);
  const line = entries["polymarket-live:market-1:last_trade_price"];
  assert.equal(line.name, "Will it happen? — Last trade price");
  assert.deepEqual(line.snapshot.selY, ["sheet-trades::price", "sheet-trades::price"]);
  assert.deepEqual(
    line.snapshot.chartLineFilters.map((filter) => filter.value),
    ["yes", "no"],
  );
  const candles = entries["polymarket-live:market-1:candlesticks"];
  assert.equal(candles.name, "Will it happen? — Candlesticks");
  assert.equal(candles.snapshot.candlestickSheetId, "sheet-candles");
  assert.equal(candles.snapshot.candlestickAssetId, "yes");
  console.log("ok realtime chart entries are named and filtered by market");
}

{
  const previous = {
    "chart-1": { name: "My chart", userCreated: true },
    stale: { source: "polymarket-live", liveSessionId: "old" },
  };
  const entries = buildPolymarketRealtimeChartEntries(session);
  const next = reconcilePolymarketRealtimeChartSheets(previous, entries);
  assert.ok(next["chart-1"]);
  assert.equal(next.stale, undefined);
  assert.equal(Object.keys(next).length, 3);
  console.log("ok realtime chart reconciliation replaces stale generated charts");
}
