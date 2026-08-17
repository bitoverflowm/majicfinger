import assert from "node:assert/strict";

import {
  buildPolymarketRealtimeSeedRows,
  normalizePolymarketRealtimeBookRows,
  normalizePolymarketRealtimeHistoryRows,
} from "./polymarketRealtimeSeed.js";

{
  const rows = normalizePolymarketRealtimeHistoryRows({
    history: {
      yes: [
        { t: 200, p: 0.55 },
        { t: 100, p: 0.45 },
      ],
    },
  });
  assert.equal(rows.length, 2);
  assert.equal(rows[0].asset_id, "yes");
  assert.equal(rows[0].price, 0.45);
  assert.equal(rows[0].source, "rest_seed");
  console.log("ok realtime REST history seeds sorted price rows");
}

{
  const rows = normalizePolymarketRealtimeBookRows(
    [{
      asset_id: "yes",
      timestamp: "1000",
      tick_size: "0.01",
      bids: [{ price: "0.40", size: "10" }, { price: "0.45", size: "5" }],
      asks: [{ price: "0.55", size: "6" }, { price: "0.60", size: "8" }],
    }],
  );
  assert.equal(rows[0].best_bid, 0.45);
  assert.equal(rows[0].best_ask, 0.55);
  assert.ok(Math.abs(rows[0].spread - 0.1) < 1e-9);
  assert.equal(typeof rows[0].bids, "string");
  console.log("ok realtime REST books seed depth and top-of-book rows");
}

{
  const rowsByFeed = buildPolymarketRealtimeSeedRows(
    {
      feedTypes: ["book", "price_change", "last_trade_price", "best_bid_ask", "tick_size_change"],
    },
    {
      assetIds: ["yes"],
      historyPayload: { yes: [{ t: 100, p: 0.45 }] },
      booksPayload: [{
        asset_id: "yes",
        tick_size: "0.01",
        bids: [{ price: "0.40", size: "10" }],
        asks: [{ price: "0.50", size: "10" }],
      }],
    },
  );
  assert.equal(rowsByFeed.price_change.length, 1);
  assert.equal(rowsByFeed.last_trade_price.length, 1);
  assert.equal(rowsByFeed.book.length, 1);
  assert.equal(rowsByFeed.best_bid_ask[0].event_type, "best_bid_ask_seed");
  assert.equal(rowsByFeed.tick_size_change[0].new_tick_size, "0.01");
  console.log("ok realtime REST seed rows fan out by selected feed");
}
