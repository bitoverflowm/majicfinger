import assert from "node:assert/strict";

import { POLYMARKET_MARKET_PRICES_ENDPOINT_ID } from "@/lib/polymarketLive/marketPricesCompose.js";
import { POLYMARKET_PRICES_HISTORY_ENDPOINT_ID } from "@/lib/polymarketLive/pricesHistoryCompose.js";
import {
  buildPolymarketLiveQueryMeta,
  buildPolymarketLiveRequestCard,
  describePolymarketLiveRequestCard,
  formatPolymarketLiveQueryParamsCompact,
  POLYMARKET_LIVE_LAKE,
} from "@/lib/polymarketLive/polymarketLiveRequestHistory.js";
import { integrationLabelFromLake } from "@/lib/connectHomeRequestQuery.js";

{
  assert.equal(integrationLabelFromLake("polymarket-live"), "Polymarket Live");
  console.log("ok polymarket-live lake label");
}

{
  const meta = buildPolymarketLiveQueryMeta({
    endpointId: POLYMARKET_MARKET_PRICES_ENDPOINT_ID,
    mode: "search",
    marketRefs: [
      {
        id: "1",
        slug: "will-btc-hit-100k",
        title: "Will BTC hit $100k?",
        tokenIds: ["123"],
      },
    ],
    selectedColumns: ["market_title", "buy_price", "sell_price"],
    tokenIds: ["123"],
  });
  assert.equal(meta.lake, POLYMARKET_LIVE_LAKE);
  assert.equal(meta.categoryLabel, "Markets");
  assert.equal(meta.endpointTitle, "Market Price");
  assert.equal(meta.searchModeLabel, "NL search");
  assert.equal(meta.marketScope, "single");
  assert.match(meta.querySummary, /Polymarket Live/);
  assert.match(meta.querySummary, /Market Price/);
  assert.match(meta.querySummary, /NL search/);
  assert.match(meta.querySummary, /Will BTC hit/);
  assert.ok(meta.queryParamsCompact.includes("token_ids="));
  console.log("ok polymarket live NL market price query meta");
}

{
  const meta = buildPolymarketLiveQueryMeta({
    endpointId: POLYMARKET_MARKET_PRICES_ENDPOINT_ID,
    mode: "advanced",
    marketRefs: [
      { id: "1", title: "Market A", tokenIds: ["a"] },
      { id: "2", title: "Market B", tokenIds: ["b"] },
    ],
    marketsFilters: {
      mode: "advanced",
      limit: 20,
      orderFields: ["volume24hr"],
      ascending: false,
      marketRefs: [],
      tags: [],
      closed: false,
      volumeNumMin: "1000",
    },
    tokenIds: ["a", "b"],
  });
  assert.equal(meta.searchModeLabel, "Advanced search");
  assert.equal(meta.marketScope, "multi");
  assert.match(meta.marketScopeLabel, /Multiple markets/);
  assert.ok(meta.queryParams.some((p) => p.key === "closed" && p.value === "false"));
  assert.ok(meta.queryParams.some((p) => p.key === "volume_num_min" && p.value === "1000"));
  console.log("ok polymarket live advanced multi-market query meta");
}

{
  const compact = formatPolymarketLiveQueryParamsCompact(
    [
      { key: "a", value: "1" },
      { key: "b", value: "2" },
      { key: "c", value: "3" },
      { key: "d", value: "4" },
      { key: "e", value: "5" },
    ],
    { max: 3 },
  );
  assert.equal(compact, "a=1 · b=2 · c=3 · +2 more");
  console.log("ok compact query params truncation");
}

{
  const card = buildPolymarketLiveRequestCard({
    endpointId: POLYMARKET_MARKET_PRICES_ENDPOINT_ID,
    mode: "search",
    marketRefs: [{ id: "9", title: "Election winner", tokenIds: ["tok"] }],
    loadedRowCount: 1,
    elapsedMs: 320,
  });
  const described = describePolymarketLiveRequestCard(card, {
    provenance: { lake: POLYMARKET_LIVE_LAKE },
  });
  assert.ok(described);
  assert.equal(described.integrationLabel, "Polymarket Live");
  assert.equal(described.endpointTitle, "Market Price");
  assert.equal(described.searchModeLabel, "NL search");
  assert.equal(described.marketLabel, "Election winner");
  assert.equal(card.loadedRowCount, 1);
  console.log("ok describe polymarket live request card");
}

{
  const meta = buildPolymarketLiveQueryMeta({
    endpointId: POLYMARKET_PRICES_HISTORY_ENDPOINT_ID,
    mode: "search",
    marketRefs: [
      { id: "1", title: "Will it rain?", tokenIds: ["yes", "no"] },
      { id: "2", title: "Will it snow?", tokenIds: ["y2", "n2"] },
    ],
    outcomeSelection: "both",
    separateSheetPerOutcome: true,
    startTs: "1700000000",
    endTs: "1700086400",
    interval: "1d",
    fidelity: 5,
    tokenIds: ["yes", "no", "y2", "n2"],
  });
  assert.equal(meta.categoryLabel, "Trades");
  assert.equal(meta.endpointTitle, "Trade History");
  assert.equal(meta.marketScope, "multi");
  assert.ok(meta.queryParams.some((p) => p.key === "outcome" && p.value === "BOTH"));
  assert.ok(
    meta.queryParams.some(
      (p) => p.key === "separate_sheet_per_outcome" && p.value === "true",
    ),
  );
  assert.ok(meta.queryParams.some((p) => p.key === "start_ts" && p.value === "1700000000"));
  assert.ok(meta.queryParams.some((p) => p.key === "interval" && p.value === "1d"));
  assert.ok(meta.queryParams.some((p) => p.key === "fidelity" && p.value === "5"));
  console.log("ok polymarket live price history trades query meta");
}

{
  const meta = buildPolymarketLiveQueryMeta({
    endpointId: "getPublicProfiles",
    mode: "search",
    addresses: [
      "0x1111111111111111111111111111111111111111",
      "0x2222222222222222222222222222222222222222",
    ],
    selectedColumns: ["name", "proxyWallet"],
  });
  assert.equal(meta.categoryLabel, "Holders");
  assert.equal(meta.endpointTitle, "Get public profile(s)");
  assert.equal(meta.marketScope, "multi");
  assert.match(meta.marketScopeLabel, /Multiple addresses/);
  assert.ok(meta.queryParams.some((p) => p.key === "addresses"));
  assert.ok(meta.queryParams.some((p) => p.key === "fields" && p.value.includes("name")));
  console.log("ok polymarket live public profiles query meta");
}

{
  const meta = buildPolymarketLiveQueryMeta({
    endpointId: "getCurrentPositions",
    mode: "search",
    addresses: ["0x1111111111111111111111111111111111111111"],
    requestParams: {
      eventId: "123,456",
      sizeThreshold: "2",
      redeemable: "false",
      limit: "100",
    },
    selectedColumns: ["proxyWallet", "title", "size"],
  });
  assert.equal(meta.categoryLabel, "Holders");
  assert.equal(meta.endpointTitle, "Current Holder Positions");
  assert.equal(meta.marketScopeLabel, "Single address");
  assert.ok(meta.queryParams.some((p) => p.key === "eventId" && p.value === "123,456"));
  assert.ok(meta.queryParams.some((p) => p.key === "sizeThreshold" && p.value === "2"));
  console.log("ok polymarket live current positions query meta");
}

{
  const meta = buildPolymarketLiveQueryMeta({
    endpointId: "getClosedPositions",
    mode: "search",
    addresses: ["0x1111111111111111111111111111111111111111"],
    requestParams: {
      market: "0xabc",
      sortBy: "REALIZEDPNL",
      sortDirection: "DESC",
      limit: "10",
    },
    selectedColumns: ["proxyWallet", "title", "realizedPnl"],
  });
  assert.equal(meta.categoryLabel, "Holders");
  assert.equal(meta.endpointTitle, "Holder's Closed Positions");
  assert.ok(meta.queryParams.some((p) => p.key === "sortBy" && p.value === "REALIZEDPNL"));
  console.log("ok polymarket live closed positions query meta");
}

{
  const meta = buildPolymarketLiveQueryMeta({
    endpointId: "getUserActivity",
    mode: "search",
    addresses: ["0x1111111111111111111111111111111111111111"],
    requestParams: {
      type: "TRADE,REDEEM",
      start: "1700000000",
      sortBy: "TIMESTAMP",
      side: "BUY",
    },
    selectedColumns: ["proxyWallet", "timestamp", "type"],
  });
  assert.equal(meta.categoryLabel, "Holders");
  assert.equal(meta.endpointTitle, "User Activity");
  assert.ok(meta.queryParams.some((p) => p.key === "type" && p.value === "TRADE,REDEEM"));
  assert.ok(meta.queryParams.some((p) => p.key === "side" && p.value === "BUY"));
  console.log("ok polymarket live user activity query meta");
}

{
  const meta = buildPolymarketLiveQueryMeta({
    endpointId: "getHolderPositionValue",
    mode: "search",
    addresses: [
      "0x1111111111111111111111111111111111111111",
      "0x2222222222222222222222222222222222222222",
    ],
    requestParams: { market: "0xabc,0xdef" },
    selectedColumns: ["user", "value"],
  });
  assert.equal(meta.categoryLabel, "Holders");
  assert.equal(meta.endpointTitle, "Total Value of Holder's Positions");
  assert.match(meta.marketScopeLabel, /Multiple addresses/);
  assert.ok(meta.queryParams.some((p) => p.key === "market"));
  console.log("ok polymarket live holder position value query meta");
}

{
  const meta = buildPolymarketLiveQueryMeta({
    endpointId: "getHolderTrades",
    mode: "search",
    addresses: ["0x1111111111111111111111111111111111111111"],
    requestParams: {
      eventId: "123",
      takerOnly: "true",
      filterType: "CASH",
      filterAmount: "100",
      side: "SELL",
    },
    selectedColumns: ["proxyWallet", "timestamp", "price"],
  });
  assert.equal(meta.categoryLabel, "Holders");
  assert.equal(meta.endpointTitle, "Holder Trades");
  assert.ok(meta.queryParams.some((p) => p.key === "filterType" && p.value === "CASH"));
  assert.ok(meta.queryParams.some((p) => p.key === "side" && p.value === "SELL"));
  console.log("ok polymarket live holder trades query meta");
}

{
  const meta = buildPolymarketLiveQueryMeta({
    endpointId: "getHolderTradedMarkets",
    mode: "search",
    addresses: [
      "0x1111111111111111111111111111111111111111",
      "0x2222222222222222222222222222222222222222",
    ],
    selectedColumns: ["user", "traded"],
  });
  assert.equal(meta.categoryLabel, "Holders");
  assert.equal(meta.endpointTitle, "Total Markets Traded");
  assert.ok(meta.queryParams.some((p) => p.key === "addresses"));
  console.log("ok polymarket live holder traded markets query meta");
}

{
  const meta = buildPolymarketLiveQueryMeta({
    endpointId: "getTraderLeaderboard",
    mode: "search",
    requestParams: {
      category: "SPORTS",
      timePeriod: "WEEK",
      orderBy: "VOL",
      limit: "25",
      offset: "0",
    },
    selectedColumns: ["rank", "proxyWallet", "vol"],
  });
  assert.equal(meta.categoryLabel, "Leaderboard");
  assert.equal(meta.endpointTitle, "Trader Leaderboard Rankings");
  assert.ok(meta.queryParams.some((p) => p.key === "category" && p.value === "SPORTS"));
  assert.ok(meta.queryParams.some((p) => p.key === "orderBy" && p.value === "VOL"));
  console.log("ok polymarket live trader leaderboard query meta");
}
