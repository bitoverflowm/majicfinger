import assert from "node:assert/strict";

import {
  polymarketLiveBuildColumns,
  polymarketLiveBuildEndpoints,
  polymarketLiveBuildRequirement,
  polymarketLiveBuildSearch,
  polymarketLiveRealtimeEndpointIds,
  polymarketPickFromSuggestion,
} from "./polymarketLiveBuild.js";
import {
  flattenPolymarketMarket,
  polymarketMarketAttributeColumns,
  polymarketMarketServerParams,
} from "../../lib/polymarketLive/polymarketMarketScan.js";

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
assert.equal(polymarketLiveBuildRequirement("getOrderbooks")?.prompt, "Token required");
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
assert.equal(flat.feeSchedule_rate, 0.04);
assert.equal(flat.imageOptimized_id, "img");
const ordered = polymarketMarketAttributeColumns(marketColumns);
assert.ok(ordered.findIndex((column) => column.id === "id") < ordered.findIndex((column) => column.id === "question"));
assert.equal(ordered.find((column) => column.id === "startDate")?.control, "query-range");
const server = polymarketMarketServerParams(
  { volumeNum: { min: "10", max: "20" }, slug: { containsTags: ["trump"] } },
  [{ id: "9", label: "Politics" }],
);
assert.equal(server.params.volume_num_min, "10");
assert.equal(server.params.tag_id, "9");
assert.equal(server.params.include_tag, "true");
assert.equal(server.params.slug, undefined);

console.log("polymarket live build ok");
