import assert from "node:assert/strict";
import {
  LIVE_FEED_REGISTRY,
  filterLiveFeedPollOptionsForEndpoint,
  getLiveFeedEndpointDef,
  isLiveFeedAllowed,
} from "@/lib/liveFeeds/registry.js";
import { getKalshiLiveRealtimeEndpointIds } from "@/config/kalshiLiveConnect.js";
import {
  applyKalshiTradesUpsertToSheets,
  upsertTradeRowsByTradeId,
} from "@/lib/liveFeeds/merge/kalshiTradesUpsert.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("registers kalshi-live:trades with 1s min poll", () => {
  assert.equal(isLiveFeedAllowed("kalshi-live", "trades"), true);
  const def = getLiveFeedEndpointDef("kalshi-live", "trades");
  assert.equal(def?.merge, "kalshi_trades_upsert");
  assert.equal(def?.minPollIntervalMs, 1_000);
  assert.ok(LIVE_FEED_REGISTRY["kalshi-live:trades"]);
});

test("offers 1 second poll option for trades", () => {
  const opts = filterLiveFeedPollOptionsForEndpoint("kalshi-live", "trades");
  assert.ok(opts.some((o) => o.valueMs === 1_000));
});

test("Real-Time hub includes trades", () => {
  const ids = getKalshiLiveRealtimeEndpointIds();
  assert.ok(ids.has("trades"));
});

test("trades upsert by trade_id and soft cap", () => {
  const merged = upsertTradeRowsByTradeId(
    [
      { trade_id: "1", created_time: 100 },
      { trade_id: "2", created_time: 200 },
    ],
    [{ trade_id: "3", created_time: 300 }],
    { softRowCap: 2 },
  );
  assert.deepEqual(
    merged.map((r) => r.trade_id),
    ["2", "3"],
  );
});

test("applyKalshiTradesUpsertToSheets only touches mapped sheets", () => {
  const { stats, dataSheets } = applyKalshiTradesUpsertToSheets(
    {
      "sheet-1": {
        name: "KX-A",
        data: [{ trade_id: "a", created_time: 1 }],
      },
    },
    { sheets: { marketSheetIdsByTicker: { "KX-A": "sheet-1" } } },
    {
      byMarket: [{ ticker: "KX-A", rows: [{ trade_id: "b", created_time: 2 }] }],
    },
  );
  assert.equal(stats.tradesAdded, 1);
  assert.deepEqual(
    dataSheets["sheet-1"].data.map((r) => r.trade_id),
    ["a", "b"],
  );
});
