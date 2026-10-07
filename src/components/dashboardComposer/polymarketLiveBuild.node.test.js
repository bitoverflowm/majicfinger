import assert from "node:assert/strict";

import {
  polymarketLiveBuildColumns,
  polymarketLiveBuildEndpoints,
  polymarketLiveBuildRequirement,
  polymarketLiveBuildSearch,
  polymarketLiveRealtimeEndpointIds,
  polymarketPickFromSuggestion,
} from "./polymarketLiveBuild.js";

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
assert.equal(endpoints.find((endpoint) => endpoint.id === "getTraderLeaderboard")?.category, "holders");
assert.equal(endpoints.find((endpoint) => endpoint.id === "getOrderbooks")?.realtime, true);
assert.equal(endpoints.find((endpoint) => endpoint.id === "getEvents")?.realtime, false);
assert.ok(polymarketLiveRealtimeEndpointIds().includes("getBatchPricesHistory"));

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

console.log("polymarket live build ok");
