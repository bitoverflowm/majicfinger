import assert from "node:assert/strict";

import {
  polymarketLiveBuildColumns,
  polymarketLiveBuildEndpoints,
  polymarketLiveBuildRequirement,
  polymarketLiveBuildSearch,
  polymarketLiveRealtimeEndpointIds,
  polymarketPickFromSuggestion,
  POLYMARKET_CLOSED_ORDERBOOK_MESSAGE,
} from "./polymarketLiveBuild.js";
import {
  flattenPolymarketMarket,
  formatPolymarketMatchEstimate,
  polymarketMarketAttributeColumns,
  polymarketMarketServerParams,
  polymarketMatchEstimate,
} from "../../lib/polymarketLive/polymarketMarketScan.js";
import {
  flattenSamplingMarket,
  samplingMarketAttributeColumns,
  samplingMarketFiltersActive,
} from "../../lib/polymarketLive/polymarketSamplingScan.js";
import {
  defaultPolymarketQuoteFilters,
  polymarketBookDepth,
  polymarketHistoryBody,
  polymarketQuoteAttributeColumns,
  polymarketQuoteRequestKey,
  polymarketQuoteTarget,
  polymarketQuoteTokens,
  polymarketTradeQuery,
  sliceBookLevels,
} from "../../lib/polymarketLive/polymarketQuoteQuery.js";

const endpoints = polymarketLiveBuildEndpoints();
const ids = endpoints.map((endpoint) => endpoint.id);
const groups = new Set(endpoints.map((endpoint) => endpoint.category));

assert.deepEqual([...groups].sort(), ["events", "holders", "markets", "series"]);
assert.equal(endpoints.some((endpoint) => endpoint.category === "live"), false);
assert.ok(ids.includes("getMarkets"));
assert.ok(ids.includes("getOrderbooks"));
assert.ok(ids.includes("getEvents"));
assert.ok(ids.includes("series"));
assert.ok(ids.includes("getTraderLeaderboard"));
assert.equal(endpoints.find((endpoint) => endpoint.id === "getOrderbooks")?.category, "markets");
assert.equal(endpoints.find((endpoint) => endpoint.id === "getMarketsByEvents")?.category, "events");
assert.equal(endpoints.find((endpoint) => endpoint.id === "getTraderLeaderboard")?.category, "holders");
assert.equal(endpoints.find((endpoint) => endpoint.id === "getOrderbooks")?.realtime, true);
assert.equal(endpoints.find((endpoint) => endpoint.id === "getEvents")?.realtime, false);
assert.ok(polymarketLiveRealtimeEndpointIds().includes("getBatchPricesHistory"));
assert.ok(polymarketLiveRealtimeEndpointIds().includes("getTradesByMarket"));
assert.equal(endpoints.find((endpoint) => endpoint.id === "getBatchPricesHistory")?.title, "Price History");
assert.equal(endpoints.find((endpoint) => endpoint.id === "getTradesByMarket")?.title, "Trade History");
assert.equal(endpoints.find((endpoint) => endpoint.id === "getTradesByMarket")?.category, "markets");
assert.equal(
  ids.indexOf("getTradesByMarket"),
  ids.indexOf("getBatchPricesHistory") + 1,
);

assert.equal(polymarketLiveBuildRequirement("getEvents"), null);
assert.equal(polymarketLiveBuildRequirement("getOrderbooks")?.prompt, "Market required");
assert.equal(polymarketLiveBuildRequirement("getMarketsByEvents")?.prompt, "Event required");
assert.equal(polymarketLiveBuildRequirement("getPublicProfiles")?.prompt, "Wallet address required");
assert.deepEqual(polymarketLiveBuildSearch("getOrderbooks")?.entities, ["market"]);
assert.equal(polymarketLiveBuildSearch("series"), null);

const columns = polymarketLiveBuildColumns("getOrderbooks");
assert.ok(columns.some((column) => column.id === "price" && column.defaultOn));
assert.ok(columns.some((column) => column.id === "side"));

const pick = polymarketPickFromSuggestion({
  entity: "market",
  id: "1",
  title: "Will it rain?",
  conditionId: "0xabc",
  raw: { clobTokenIds: ["111"] },
});
assert.equal(pick?.kind, "market");
assert.equal(pick?.label, "Will it rain?");
assert.deepEqual(pick?.tokenIds, ["111"]);
assert.equal(pick?.closed, false);
const closedPick = polymarketPickFromSuggestion({
  entity: "market",
  id: "2",
  title: "Already settled",
  closed: true,
  conditionId: "0xdef",
  raw: { clobTokenIds: ["222"], closed: true },
});
assert.equal(closedPick?.closed, true);
assert.equal(
  POLYMARKET_CLOSED_ORDERBOOK_MESSAGE,
  "Market is closed so no live orderbook snapshot is available.",
);
assert.equal(polymarketPickFromSuggestion({ entity: "tag", title: "Sports" }), null);

const marketColumns = polymarketLiveBuildColumns("getMarkets");
assert.ok(marketColumns.some((column) => column.id === "tags"));
assert.ok(marketColumns.some((column) => column.id === "feeSchedule_rate"));
const flat = flattenPolymarketMarket({
  id: "1",
  question: "Will it rain?",
  tags: [{ id: "4", label: "Politics" }],
  feeSchedule: { rate: 0.04, takerOnly: true },
  imageOptimized: { id: "img" },
});
assert.equal(flat.tags, "Politics");
assert.equal(flat.category, "Politics");
assert.equal(flat.feeSchedule_rate, 0.04);
assert.equal(flat.imageOptimized_id, "img");
const ordered = polymarketMarketAttributeColumns(marketColumns);
assert.ok(ordered.findIndex((column) => column.id === "id") < ordered.findIndex((column) => column.id === "question"));
assert.equal(ordered.find((column) => column.id === "startDate")?.control, "query-range");
assert.equal(ordered.find((column) => column.id === "tags")?.control, "tag-picker");
assert.equal(ordered.find((column) => column.id === "category")?.control, "category");
assert.ok(ordered.find((column) => column.id === "category")?.enumOptions?.some((option) => option[0] === "Politics"));
const server = polymarketMarketServerParams(
  { volumeNum: { min: "10", max: "20" }, slug: { containsTags: ["trump"] } },
  [{ id: "9", label: "Politics" }],
);
assert.equal(server.params.volume_num_min, "10");
assert.equal(server.params.tag_id, "9");
const categorized = polymarketMarketServerParams({ category: { include: ["Politics", "Sports"] } });
assert.equal(categorized.params.tag_id, "2,1");
assert.equal(server.params.include_tag, "true");
assert.equal(server.params.slug, undefined);
const trumpGuess = polymarketMatchEstimate({ scanned: 3193, removedCount: 3143, exhausted: false });
assert.equal(formatPolymarketMatchEstimate(trumpGuess), "~157,000");
assert.equal(polymarketMatchEstimate({ scanned: 40, removedCount: 10, exhausted: false }), null);
assert.equal(formatPolymarketMatchEstimate(polymarketMatchEstimate({ scanned: 80, removedCount: 30, exhausted: true })), "50");

const samplingColumns = polymarketLiveBuildColumns("getSamplingMarkets");
assert.equal(samplingColumns.find((column) => column.id === "question")?.defaultOn, true);
assert.equal(samplingColumns.some((column) => column.id === "yes_price"), true);
const samplingOrdered = samplingMarketAttributeColumns(samplingColumns);
assert.ok(samplingOrdered.findIndex((column) => column.id === "question") < samplingOrdered.findIndex((column) => column.id === "description"));
assert.equal(samplingOrdered.find((column) => column.id === "end_date_iso")?.control, "query-range");
assert.equal(samplingOrdered.find((column) => column.id === "accepting_orders")?.type, "boolean");
assert.equal(samplingOrdered.find((column) => column.id === "yes_price")?.type, "number");
const samplingFlat = flattenSamplingMarket({
  question: "Will it rain?",
  tags: ["Weather", "Daily"],
  tokens: [
    { token_id: "1", outcome: "Yes", price: 0.42 },
    { token_id: "2", outcome: "No", price: 0.58 },
  ],
  rewards: { min_size: 20, max_spread: 3, rates: [{ rewards_daily_rate: 5 }] },
});
assert.equal(samplingFlat.tags, "Weather, Daily");
assert.equal(samplingFlat.tokens, "Yes 0.42, No 0.58");
assert.equal(samplingFlat.yes_price, 0.42);
assert.equal(samplingFlat.rewards_min_size, 20);
assert.equal(samplingMarketFiltersActive(samplingOrdered, { question: { containsTags: ["rain"] } }), true);
assert.equal(samplingMarketFiltersActive(samplingOrdered, {}), false);

const bookColumns = polymarketQuoteAttributeColumns("getOrderbooks", polymarketLiveBuildColumns("getOrderbooks"));
assert.deepEqual(bookColumns.slice(0, 3).map((column) => column.id), ["quote_outcome", "book_side", "depth"]);
assert.equal(bookColumns[2].queryOnly, true);
assert.equal(bookColumns.find((column) => column.id === "price")?.type, "number");
assert.equal(polymarketLiveBuildColumns("getOrderbooks").find((column) => column.id === "side")?.defaultOn, true);
assert.equal(defaultPolymarketQuoteFilters("getOrderbooks").depth.value, "20");
assert.equal(defaultPolymarketQuoteFilters("getBatchPricesHistory").interval.value, "1d");
assert.equal(defaultPolymarketQuoteFilters("getTradesByMarket").taker_only.include[0], "true");
assert.deepEqual(polymarketQuoteAttributeColumns("getTradesByMarket", []).slice(0, 3).map((column) => column.id), ["trade_side", "taker_only", "time_range"]);
assert.equal(polymarketQuoteAttributeColumns("getOpenInterestCompose", [{ id: "value", type: "string", title: "Value" }])[0].type, "number");
const bookDefaults = defaultPolymarketQuoteFilters("getOrderbooks");
const bookKey = polymarketQuoteRequestKey("getOrderbooks", bookDefaults, "", 500000);
assert.notEqual(polymarketQuoteRequestKey("getOrderbooks", { ...bookDefaults, book_side: { value: "buy" } }, "", 500000), bookKey);
assert.equal(polymarketQuoteRequestKey("getOrderbooks", { ...bookDefaults, price: { min: "0.2" } }, "", 500000), bookKey);
assert.equal(polymarketQuoteTarget("", 500000, 50, 10000), 50);
assert.equal(polymarketQuoteTarget("200", 500000, 50, 10000), 200);
assert.equal(polymarketQuoteTarget("999999", 500, 50, 10000), 500);
assert.equal(polymarketBookDepth({ depth: { value: "" } }), 100);
assert.equal(polymarketBookDepth({ depth: { value: "5" } }), 5);
assert.equal(sliceBookLevels({ bids: [1, 2, 3], asks: [4, 5] }, 2).bids.length, 2);
assert.deepEqual(polymarketHistoryBody({ interval: { value: "1h" }, fidelity: { value: "60" } }), { interval: "1h", fidelity: 60 });
assert.equal(polymarketHistoryBody({ interval: { value: "1d" }, time_range: { from: "2026-10-01", to: "2026-10-02" } }).interval, undefined);
assert.equal(polymarketTradeQuery({ trade_side: { value: "BUY" }, taker_only: { include: ["false"] } }).side, "BUY");
assert.equal(polymarketTradeQuery({ trade_side: { value: "BUY" }, taker_only: { include: ["false"] } }).takerOnly, "false");
assert.deepEqual(
  polymarketQuoteTokens({ tokenIds: ["yes-token", "no-token"], outcomes: ["Yes", "No"] }, "no").map((pair) => pair.tokenId),
  ["no-token"],
);

console.log("polymarket live build ok");
