import assert from "node:assert/strict";
import {
  LIVE_FEED_REGISTRY,
  filterLiveFeedPollOptionsForEndpoint,
  getLiveFeedEndpointDef,
  isLiveFeedAllowed,
} from "@/lib/liveFeeds/registry.js";
import { getKalshiLiveRealtimeEndpointIds } from "@/config/kalshiLiveConnect.js";
import {
  applyKalshiOrderbookReplaceToSheets,
  liveOrderbookRowKey,
  normalizeOrderbookSnapshotRows,
} from "@/lib/liveFeeds/merge/kalshiOrderbookReplace.js";
import { discoverOrderbookFeedGroup } from "@/lib/liveFeeds/feedConfig.js";

function test(name, fn) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (err) {
    console.error(`FAIL ${name}`);
    throw err;
  }
}

test("registers kalshi-live:orderbook with 1s min poll", () => {
  assert.equal(isLiveFeedAllowed("kalshi-live", "orderbook"), true);
  const def = getLiveFeedEndpointDef("kalshi-live", "orderbook");
  assert.equal(def?.merge, "kalshi_orderbook_replace");
  assert.equal(def?.minPollIntervalMs, 1_000);
  assert.equal(def?.softRowCapPerSheet, 500);
  assert.ok(LIVE_FEED_REGISTRY["kalshi-live:orderbook"]);
});

test("offers 1 second poll option for orderbook", () => {
  const opts = filterLiveFeedPollOptionsForEndpoint("kalshi-live", "orderbook");
  assert.ok(opts.some((o) => o.valueMs === 1_000));
});

test("Real-Time hub includes orderbook", () => {
  const ids = getKalshiLiveRealtimeEndpointIds();
  assert.ok(ids.has("orderbook"));
});

test("liveOrderbookRowKey uses ticker|side|price", () => {
  assert.equal(
    liveOrderbookRowKey({ ticker: "ABC", side: "yes", price_dollars: 0.42 }),
    "ob:ABC|yes|0.42",
  );
});

test("normalizeOrderbookSnapshotRows sorts and soft-caps", () => {
  const rows = normalizeOrderbookSnapshotRows(
    [
      { ticker: "A", side: "no", price_dollars: 0.4, quantity_fp: 1, level_index: 0 },
      { ticker: "A", side: "yes", price_dollars: 0.6, quantity_fp: 2, level_index: 0 },
      { ticker: "A", side: "yes", price_dollars: 0.5, quantity_fp: 3, level_index: 1 },
    ],
    { softRowCap: 2 },
  );
  assert.equal(rows.length, 2);
  assert.equal(rows[0].side, "yes");
});

test("applyKalshiOrderbookReplaceToSheets replaces snapshot", () => {
  const { stats, dataSheets } = applyKalshiOrderbookReplaceToSheets(
    {
      "sheet-a": {
        name: "A",
        data: [{ ticker: "A", side: "yes", price_dollars: 0.5, quantity_fp: 1, level_index: 0 }],
      },
    },
    {
      sheets: { marketSheetIdsByTicker: { A: "sheet-a" } },
    },
    {
      byMarket: [
        {
          ticker: "A",
          rows: [
            { ticker: "A", side: "yes", price_dollars: 0.55, quantity_fp: 9, level_index: 0 },
            { ticker: "A", side: "no", price_dollars: 0.45, quantity_fp: 4, level_index: 0 },
          ],
        },
      ],
    },
    { softRowCap: 500 },
  );
  assert.equal(stats.marketsMatched, 1);
  assert.equal(stats.levelsReceived, 2);
  assert.equal(dataSheets["sheet-a"].data.length, 2);
  assert.equal(dataSheets["sheet-a"].data[0].price_dollars, 0.55);
});

test("discoverOrderbookFeedGroup finds market_orderbook provenance", () => {
  const group = discoverOrderbookFeedGroup({
    "sheet-1": {
      name: "KX-OB",
      data: [{ ticker: "KX-OB", side: "yes", price_dollars: 0.5, quantity_fp: 1 }],
      provenance: {
        source: "kalshi-live",
        endpoint: "orderbook",
        sheetKind: "market_orderbook",
        marketTicker: "KX-OB",
        whereFilters: [{ column: "depth", value: 10 }],
      },
    },
  });
  assert.ok(group);
  assert.equal(group.kind, "orderbook");
  assert.deepEqual(group.marketTickers, ["KX-OB"]);
  assert.equal(group.depth, 10);
});
