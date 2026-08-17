import assert from "node:assert/strict";

import {
  buildPolymarketRealtimeConnection,
  mergePolymarketRealtimeMarkets,
  polymarketRealtimeMarketFromSuggestion,
  polymarketRealtimeMarketsFromEventSuggestion,
} from "./polymarketRealtimeCompose.js";

{
  const market = polymarketRealtimeMarketFromSuggestion({
    entity: "market",
    id: "42",
    title: "Will it rain?",
    conditionId: "0xabc",
    raw: {
      outcomes: '["Yes","No"]',
      clobTokenIds: '["yes-token","no-token"]',
    },
  });
  assert.deepEqual(market.outcomePairs, [
    { outcome: "Yes", tokenId: "yes-token" },
    { outcome: "No", tokenId: "no-token" },
  ]);
  assert.deepEqual(market.selectedTokenIds, ["yes-token", "no-token"]);
  console.log("ok realtime market suggestion resolves outcome token pairs");
}

{
  const markets = polymarketRealtimeMarketsFromEventSuggestion({
    entity: "event",
    id: "7",
    title: "Election event",
    raw: {
      markets: [
        {
          id: "m1",
          conditionId: "0x1",
          question: "Candidate A?",
          outcomes: ["Yes", "No"],
          clobTokenIds: ["a-yes", "a-no"],
        },
        {
          id: "m2",
          conditionId: "0x2",
          question: "Candidate B?",
          outcomes: ["Yes", "No"],
          clobTokenIds: ["b-yes", "b-no"],
        },
        {
          id: "m3",
          conditionId: "0x3",
          question: "Closed candidate?",
          outcomes: ["Yes", "No"],
          clobTokenIds: ["c-yes", "c-no"],
          closed: true,
        },
      ],
    },
  });
  assert.equal(markets.length, 2);
  assert.equal(markets[0].eventTitle, "Election event");
  assert.equal(markets.some((market) => market.id === "m3"), false);
  console.log("ok realtime event suggestion expands only open nested markets");
}

{
  const previous = [{ id: "m1", selectedTokenIds: ["yes"] }];
  const incoming = [{ id: "m1", selectedTokenIds: ["yes", "no"] }, { id: "m2" }];
  assert.deepEqual(mergePolymarketRealtimeMarkets(previous, incoming), [
    { id: "m1", selectedTokenIds: ["yes"] },
    { id: "m2" },
  ]);
  console.log("ok realtime market merge preserves outcome selections");
}

{
  const config = buildPolymarketRealtimeConnection({
    markets: [
      {
        id: "m1",
        tokenIds: ["yes", "no"],
        selectedTokenIds: ["yes"],
        outcomePairs: [
          { tokenId: "yes", outcome: "Yes" },
          { tokenId: "no", outcome: "No" },
        ],
      },
    ],
    feedTypes: ["book", "last_trade_price", "book", "new_market"],
    dashboardLayout: "separate_tabs",
    candleInterval: "15m",
  });
  assert.deepEqual(config.assetIds, ["yes"]);
  assert.deepEqual(config.feedTypes, ["book", "last_trade_price"]);
  assert.deepEqual(config.markets[0].selectedOutcomes, ["Yes"]);
  assert.equal(config.dashboardLayout, "separate_tabs");
  assert.equal(config.candleInterval, "15m");
  console.log("ok realtime connection validates feeds and selected outcomes");
}

{
  const config = buildPolymarketRealtimeConnection({
    markets: [
      {
        id: "m1",
        tokenIds: ["yes"],
        selectedTokenIds: ["yes"],
        outcomePairs: [{ tokenId: "yes", outcome: "Yes" }],
      },
    ],
    feedTypes: ["last_trade_price"],
    dashboardLayout: "unsupported",
  });
  assert.equal(config.dashboardLayout, "one_page");
  console.log("ok realtime connection defaults to one-page dashboard layout");
}
