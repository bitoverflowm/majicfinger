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
