import assert from "node:assert/strict";

import { displayCell } from "./integrationRunSheets.js";
import {
  polymarketLiveBuildColumns,
  polymarketLiveBuildEndpoints,
  polymarketLiveBuildRequirement,
  polymarketLiveBuildSearch,
  polymarketLiveRealtimeEndpointIds,
  polymarketActivitySheetTitle,
  polymarketActivityTraderName,
  polymarketPickFromSuggestion,
  POLYMARKET_CLOSED_ORDERBOOK_MESSAGE,
  polymarketJoinChoices,
  polymarketJoinPickFromRow,
  polymarketTraderJoinChoices,
  polymarketJoinPlacement,
  polymarketTraderWalletFromRow,
  polymarketTraderEntities,
  polymarketMarketEntities,
  mergePolymarketJoinRows,
  polymarketTraderJoinSheetTitle,
  polymarketMarketFanout,
  polymarketRowsForMarket,
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
import { openInterestRowsFromPayload } from "../../lib/polymarketLive/openInterestCompose.js";
import {
  defaultPolymarketQuoteFilters,
  polymarketHistoryBody,
  polymarketHistoryFidelityOptions,
  polymarketMarketAnchorDate,
  polymarketQuoteAttributeColumns,
  polymarketQuoteRequestKey,
  polymarketQuoteTarget,
  polymarketQuoteTokens,
  polymarketTokenBucketOptions,
  polymarketHolderLimit,
  polymarketHolderQuery,
  polymarketTokenHistoryParams,
  polymarketTradeQuery,
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
assert.ok(ids.includes("getBiggestWinners"));
assert.equal(endpoints.find((endpoint) => endpoint.id === "getBiggestWinners")?.category, "holders");
assert.deepEqual(
  Object.fromEntries(endpoints.filter((endpoint) => endpoint.category === "holders").map((endpoint) => [endpoint.id, endpoint.api])),
  {
    getHoldersByMarkets: "v2",
    getTraderLeaderboard: "v2",
    getBiggestWinners: "v2",
    getPublicProfiles: "gamma",
    getTraderByAddress: "v2",
    getTraderPositions: "v2",
    getTraderPnlSeries: "v2",
    getTraderActivity: "v2",
  },
);
for (const retired of [
  "getCurrentPositions",
  "getClosedPositions",
  "getUserActivity",
  "getHolderPositionValue",
  "getHolderTrades",
  "getHolderTradedMarkets",
]) {
  assert.equal(ids.includes(retired), false);
}
assert.equal(endpoints.find((endpoint) => endpoint.id === "getTraderPositions")?.title, "Get trader's positions");
assert.equal(polymarketLiveBuildRequirement("getTraderPositions")?.prompt, "Wallet address required");
assert.equal(polymarketMarketFanout("getTraderPositions"), true);
assert.equal(endpoints.find((endpoint) => endpoint.id === "getTraderPnlSeries")?.title, "Get trader's PnL series");
assert.equal(
  endpoints.find((endpoint) => endpoint.id === "getTraderPnlSeries")?.description,
  "A trader's cumulative PnL, volume, and fees over a chosen window.",
);
const positionsAt = ids.indexOf("getTraderPositions");
const pnlAt = ids.indexOf("getTraderPnlSeries");
const activityAt = ids.indexOf("getTraderActivity");
assert.ok(positionsAt >= 0 && pnlAt === positionsAt + 1 && activityAt === pnlAt + 1);
assert.equal(endpoints.find((endpoint) => endpoint.id === "getTraderActivity")?.title, "Get trader's activity");
assert.equal(
  endpoints.find((endpoint) => endpoint.id === "getTraderActivity")?.description,
  "A trader's trades, splits, merges, redeems, and other wallet activity.",
);
assert.equal(polymarketLiveBuildRequirement("getTraderActivity")?.prompt, "Wallet address required");
assert.equal(polymarketMarketFanout("getTraderActivity"), true);
assert.equal(polymarketLiveBuildSearch("getTraderActivity")?.placeholder, "Search for a trader");
assert.equal(polymarketLiveBuildSearch("getTraderActivity")?.acceptAddress, undefined);
assert.equal(polymarketActivityTraderName([{ name: "Zoomify" }, { name: "Zoomify", pseudonym: "other" }]), "Zoomify");
assert.equal(polymarketActivityTraderName([{ pseudonym: "zoom-handle" }]), "zoom-handle");
assert.equal(polymarketActivityTraderName([], { label: "Zoomify", title: "Zoomify" }), "Zoomify");
assert.equal(polymarketActivityTraderName([{ name: "Ada" }, { name: "Bea" }], { label: "Zoomify" }), "Zoomify");
assert.equal(polymarketActivityTraderName([], { label: "0x39125313116835eb6a55688350813921c9360246" }), "");
assert.equal(polymarketActivitySheetTitle("Zoomify"), "Zoomify's activity");
assert.equal(polymarketActivitySheetTitle(""), "");
assert.equal(polymarketActivitySheetTitle("0x39125313116835eb6a55688350813921c9360246"), "");
const activityColumns = polymarketLiveBuildColumns("getTraderActivity");
assert.equal(activityColumns.find((column) => column.id === "timestamp")?.dateEpoch, "unix");
assert.equal(activityColumns.find((column) => column.id === "timestamp")?.defaultOn, true);
assert.equal(activityColumns.find((column) => column.id === "type")?.defaultOn, true);
assert.equal(activityColumns.find((column) => column.id === "usdc_size")?.title, "USDC size");
assert.equal(activityColumns.find((column) => column.id === "outcome_index")?.exact, true);
assert.equal(activityColumns.find((column) => column.id === "user")?.defaultOn, false);
assert.equal(activityColumns.find((column) => column.id === "is_combo")?.defaultOn, false);
assert.equal(activityColumns.some((column) => column.id === "sort_by"), false);
assert.equal(polymarketLiveBuildRequirement("getTraderPnlSeries")?.prompt, "Wallet address required");
assert.equal(polymarketMarketFanout("getTraderPnlSeries"), true);
assert.equal(polymarketLiveBuildSearch("getTraderPnlSeries")?.placeholder, "Search for a trader");
assert.equal(polymarketLiveBuildSearch("getTraderPnlSeries")?.acceptAddress, undefined);
const pnlColumns = polymarketLiveBuildColumns("getTraderPnlSeries");
assert.equal(pnlColumns.find((column) => column.id === "timestamp")?.dateEpoch, "unix");
assert.equal(pnlColumns.find((column) => column.id === "timestamp")?.defaultOn, true);
assert.equal(pnlColumns.find((column) => column.id === "trade_count")?.exact, true);
assert.equal(pnlColumns.find((column) => column.id === "source_block")?.exact, true);
assert.equal(pnlColumns.find((column) => column.id === "realized_pnl")?.title, "Realized PnL");
assert.equal(pnlColumns.find((column) => column.id === "economic_pnl")?.defaultOn, true);
assert.equal(pnlColumns.find((column) => column.id === "fees")?.defaultOn, false);
assert.equal(pnlColumns.find((column) => column.id === "user")?.defaultOn, false);
assert.equal(pnlColumns.find((column) => column.id === "deposits")?.defaultOn, false);
const positionColumns = polymarketLiveBuildColumns("getTraderPositions");
assert.equal(positionColumns.some((column) => column.id === "sort_by"), false);
assert.equal(positionColumns.find((column) => column.id === "last_event_at")?.dateEpoch, "unix");
assert.equal(positionColumns.find((column) => column.id === "title")?.defaultOn, true);
assert.equal(positionColumns.find((column) => column.id === "icon")?.defaultOn, true);
assert.equal(positionColumns.find((column) => column.id === "user")?.defaultOn, false);
assert.equal(endpoints.find((endpoint) => endpoint.id === "getTraderByAddress")?.title, "Get trader's profile and stats");
assert.equal(
  endpoints.find((endpoint) => endpoint.id === "getTraderByAddress")?.description,
  "Name, markets traded, biggest win, profile views, all-time PnL, volume, and portfolio value.",
);
assert.equal(polymarketLiveBuildSearch("getTraderByAddress")?.acceptAddress, true);
assert.deepEqual(polymarketLiveBuildSearch("getTraderByAddress")?.entities, ["profile"]);
assert.equal(polymarketLiveBuildSearch("getPublicProfiles")?.acceptAddress, undefined);
const traderColumns = polymarketLiveBuildColumns("getTraderByAddress");
assert.equal(traderColumns[0]?.id, "address");
assert.equal(traderColumns.find((column) => column.id === "createdAt")?.dateEpoch, "iso");
assert.equal(traderColumns.find((column) => column.id === "join_date")?.dateEpoch, "unix");
assert.equal(traderColumns.find((column) => column.id === "timestamp")?.dateEpoch, "unix");
assert.equal(traderColumns.find((column) => column.id === "trades")?.exact, true);
assert.equal(traderColumns.find((column) => column.id === "name")?.defaultOn, true);
assert.equal(traderColumns.find((column) => column.id === "portfolio_value")?.title, "Portfolio value");
assert.equal(traderColumns.find((column) => column.id === "portfolio_value")?.defaultOn, true);
assert.equal(traderColumns.find((column) => column.id === "fees")?.defaultOn, false);
assert.ok(traderColumns.some((column) => column.id === "yield_income"));
assert.ok(traderColumns.some((column) => column.id === "users_creator"));
assert.equal(endpoints.find((endpoint) => endpoint.id === "getBiggestWinners")?.title, "Biggest Wins");
const biggestWinnerColumns = polymarketLiveBuildColumns("getBiggestWinners");
assert.deepEqual(
  biggestWinnerColumns.map((column) => column.id),
  ["win_rank", "kind", "user_name", "user_id", "pnl", "initial_value", "final_value", "resolved_at", "event_title", "event_link", "condition_id", "position_id", "event_id", "event_slug", "profile_image", "time_period", "category"],
);
assert.equal(biggestWinnerColumns.find((column) => column.id === "resolved_at")?.dateEpoch, "unix");
assert.equal(biggestWinnerColumns.find((column) => column.id === "event_link")?.defaultOn, false);
assert.equal(biggestWinnerColumns.find((column) => column.id === "kind")?.defaultOn, true);
const leaderboardColumns = polymarketLiveBuildColumns("getTraderLeaderboard");
assert.deepEqual(
  leaderboardColumns.map((column) => column.id),
  ["rank", "user_id", "user_name", "pnl", "volume", "verified", "profile_image", "x_username", "user", "time_period", "category", "sort_by"],
);
assert.equal(leaderboardColumns.find((column) => column.id === "pnl")?.type, "number");
assert.equal(leaderboardColumns.find((column) => column.id === "verified")?.type, "boolean");
assert.equal(leaderboardColumns.find((column) => column.id === "rank")?.defaultOn, true);
assert.equal(endpoints.find((endpoint) => endpoint.id === "getOrderbooks")?.realtime, true);
assert.equal(endpoints.find((endpoint) => endpoint.id === "getEvents")?.realtime, false);
assert.ok(polymarketLiveRealtimeEndpointIds().includes("getBatchPricesHistory"));
assert.ok(polymarketLiveRealtimeEndpointIds().includes("getTradesByMarket"));
assert.equal(endpoints.find((endpoint) => endpoint.id === "getBatchPricesHistory")?.title, "Price History");
assert.equal(endpoints.find((endpoint) => endpoint.id === "getTradesByMarket")?.title, "Trade History");
assert.equal(
  endpoints.find((endpoint) => endpoint.id === "getOrderbooks")?.description,
  "The buy and sell prices, and the size available at each price.",
);
assert.equal(
  endpoints.find((endpoint) => endpoint.id === "getMarketPrices")?.description,
  "The best price to buy and the best price to sell.",
);
assert.equal(
  endpoints.find((endpoint) => endpoint.id === "getMidpointPrices")?.description,
  "The price halfway between the best buy and the best sell.",
);
assert.equal(
  endpoints.find((endpoint) => endpoint.id === "getSpreads")?.description,
  "Spread is the difference between the best ask and best bid prices for a given market",
);
assert.equal(endpoints.find((endpoint) => endpoint.id === "getTickSize")?.title, "Tick Size");
assert.equal(
  endpoints.find((endpoint) => endpoint.id === "getTickSize")?.description,
  "The smallest price step for an outcome.",
);
assert.equal(endpoints.find((endpoint) => endpoint.id === "getTickSize")?.realtime, false);
assert.equal(ids.indexOf("getTickSize"), ids.indexOf("getSpreads") + 1);
assert.equal(
  endpoints.find((endpoint) => endpoint.id === "getMarkets")?.description,
  "Find markets by search, or discover markets that fit your criteria",
);
assert.equal(
  endpoints
    .filter((endpoint) => endpoint.id !== "getMarkets")
    .some((endpoint) => /discover|clob|single sheet/i.test(endpoint.description)),
  false,
);
assert.equal(endpoints.find((endpoint) => endpoint.id === "getTradesByMarket")?.category, "markets");
assert.equal(endpoints.find((endpoint) => endpoint.id === "getTokenPriceHistory")?.title, "Token Price History");
assert.equal(
  endpoints.find((endpoint) => endpoint.id === "getTokenPriceHistory")?.description,
  "The price of one outcome over time, and how wide each point is.",
);
assert.equal(
  ids.indexOf("getTokenPriceHistory"),
  ids.indexOf("getBatchPricesHistory") + 1,
);
assert.equal(
  ids.indexOf("getTradesByMarket"),
  ids.indexOf("getTokenPriceHistory") + 1,
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

const handlePick = polymarketPickFromSuggestion({
  entity: "profile",
  title: "Zoomify",
  pseudonym: "Yellow-Revival",
  raw: { proxyWallet: "0x39125313116835eb6a55688350813921c9360246" },
});
assert.equal(handlePick?.kind, "profile");
assert.equal(handlePick?.address, "0x39125313116835eb6a55688350813921c9360246");
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
for (const id of [
  "getOrderbooks",
  "getMarketPrices",
  "getMidpointPrices",
  "getSpreads",
  "getTickSize",
  "getLastTradePrices",
  "getBatchPricesHistory",
  "getTokenPriceHistory",
  "getTradesByMarket",
  "getOpenInterestCompose",
  "getHoldersByMarkets",
]) {
  assert.equal(polymarketMarketFanout(id), true);
}
assert.equal(polymarketMarketFanout("getMarkets"), false);
const rain = { id: "market:1", entityId: "1", title: "Will it rain?", label: "Will it rain?" };
const shine = { id: "market:2", entityId: "2", title: "Will it shine?", label: "Will it shine?" };
const splitRows = [
  { market_id: "1", market_title: "Will it rain?", price: 0.4 },
  { market_id: "2", market_title: "Will it shine?", price: 0.6 },
];
assert.equal(polymarketRowsForMarket(splitRows, rain, [rain, shine]).length, 1);
assert.equal(polymarketRowsForMarket(splitRows, shine, [rain, shine])[0].price, 0.6);
assert.equal(polymarketRowsForMarket(splitRows, rain, [rain]).length, 2);
assert.equal(polymarketRowsForMarket([{ price: 0.2 }, { price: 0.8 }], rain, [rain, shine]).length, 0);
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
assert.deepEqual(bookColumns.slice(0, 2).map((column) => column.id), ["quote_outcome", "book_side"]);
assert.equal(bookColumns.some((column) => column.id === "depth"), false);
assert.equal(bookColumns.find((column) => column.id === "book_side")?.queryOnly, true);
assert.notEqual(bookColumns[2]?.id, "depth");
assert.equal(bookColumns.find((column) => column.id === "price")?.type, "number");
assert.equal(polymarketLiveBuildColumns("getOrderbooks").find((column) => column.id === "side")?.defaultOn, true);
assert.equal(defaultPolymarketQuoteFilters("getOrderbooks").depth, undefined);
assert.equal(defaultPolymarketQuoteFilters("getBatchPricesHistory").interval.value, "1d");
const historyT = polymarketLiveBuildColumns("getBatchPricesHistory").find((column) => column.id === "t");
assert.equal(historyT?.exact, true);
assert.equal(displayCell(1791417327, historyT), "1791417327");
assert.equal(displayCell(1791417267, historyT), "1791417267");
assert.equal(displayCell(1800000000, { id: "volume", type: "number" }), "1.8B");
assert.equal(defaultPolymarketQuoteFilters("getTradesByMarket").taker_only.include[0], "true");
assert.equal(defaultPolymarketQuoteFilters("getTradesByMarket").quote_outcome.value, "both");
assert.equal(defaultPolymarketQuoteFilters("getTradesByMarket").filter_type.value, "TOKENS");
assert.deepEqual(
  polymarketQuoteAttributeColumns("getTradesByMarket", polymarketLiveBuildColumns("getTradesByMarket")).slice(0, 5).map((column) => column.id),
  ["quote_outcome", "trade_side", "taker_only", "filter_type", "filter_amount"],
);
assert.equal(polymarketQuoteAttributeColumns("getTradesByMarket", []).some((column) => column.id === "time_range"), false);
assert.equal(polymarketLiveBuildColumns("getTradesByMarket").find((column) => column.id === "timestamp")?.type, "text");
assert.equal(polymarketLiveBuildColumns("getTradesByMarket").find((column) => column.id === "observed_at")?.defaultOn, true);
assert.deepEqual(polymarketTradeQuery({ trade_side: { value: "BUY" }, taker_only: { include: ["false"] }, filter_type: { value: "CASH" }, filter_amount: { value: "1.5" } }), {
  side: "BUY",
  taker_only: "false",
  filter_type: "CASH",
  filter_amount: "1.5",
});
assert.equal("start" in polymarketTradeQuery({ time_range: { from: "2026-10-01", to: "2026-10-07" } }), false);
assert.equal(polymarketQuoteAttributeColumns("getOpenInterestCompose", [{ id: "value", type: "string", title: "Value" }])[0].type, "number");
assert.equal(
  endpoints.find((endpoint) => endpoint.id === "getOpenInterestCompose")?.description,
  "The dollar value of shares still held in a market.",
);
const oiRows = openInterestRowsFromPayload({
  data: [
    { condition_id: "0xabc", value: 0 },
    { condition_id: "GLOBAL", value: 12.5 },
  ],
});
assert.equal(oiRows[0].market, "0xabc");
assert.equal(oiRows[0].value, 0);
assert.equal(oiRows[1].condition_id, "GLOBAL");
assert.equal(
  openInterestRowsFromPayload([{ data: [{ condition_id: "0xdef", value: 3 }] }])[0].market,
  "0xdef",
);
const bookDefaults = defaultPolymarketQuoteFilters("getOrderbooks");
const bookKey = polymarketQuoteRequestKey("getOrderbooks", bookDefaults, "", 500000);
assert.notEqual(polymarketQuoteRequestKey("getOrderbooks", { ...bookDefaults, book_side: { value: "buy" } }, "", 500000), bookKey);
assert.equal(polymarketQuoteRequestKey("getOrderbooks", { ...bookDefaults, price: { min: "0.2" } }, "", 500000), bookKey);
assert.equal(polymarketQuoteTarget("", 500000, 50, 10000), 50);
assert.equal(polymarketQuoteTarget("200", 500000, 50, 10000), 200);
assert.equal(polymarketQuoteTarget("999999", 500, 50, 10000), 500);
assert.deepEqual(polymarketHistoryBody({ interval: { value: "1h" }, fidelity: { value: "60" } }), { interval: "1h", fidelity: 60 });
assert.equal(polymarketHistoryBody({ interval: { value: "1d" }, time_range: { from: "2026-10-01", to: "2026-10-02" } }).interval, undefined);
assert.equal(polymarketHistoryBody({ interval: { value: "1w" }, fidelity: { value: "1" } }).fidelity, 5);
assert.equal(polymarketHistoryBody({ interval: { value: "1m" }, fidelity: { value: "" } }).fidelity, 10);
assert.equal(polymarketHistoryBody({ interval: { value: "max" }, fidelity: { value: "1" } }).fidelity, 10);
assert.equal(polymarketHistoryBody({ interval: { value: "1d" }, time_range: { from: "2026-10-01", to: "2026-10-07" }, fidelity: { value: "1" } }).fidelity, 1);
const closedMarket = {
  closed: true,
  endedAt: Math.floor(Date.parse("2022-03-16T11:14:35Z") / 1000),
  startedAt: Math.floor(Date.parse("2022-03-02T19:23:10.922Z") / 1000),
};
const closedDay = polymarketHistoryBody({ interval: { value: "1d" } }, closedMarket);
assert.equal(closedDay.interval, undefined);
assert.equal(closedDay.end_ts, closedMarket.endedAt);
assert.equal(closedDay.start_ts, closedMarket.endedAt - 86400);
const closedWeek = polymarketHistoryBody(
  { interval: { value: "1d" }, time_range: { from: "2026-10-01", to: "2026-10-08", preset: "past-7d" } },
  closedMarket,
);
assert.equal(closedWeek.end_ts, closedMarket.endedAt);
assert.equal(closedWeek.start_ts, closedMarket.endedAt - 7 * 86400);
const explicitHistory = polymarketHistoryBody(
  { interval: { value: "1d" }, time_range: { from: "2022-03-10", to: "2022-03-15" } },
  closedMarket,
);
assert.equal(explicitHistory.interval, undefined);
assert.notEqual(explicitHistory.end_ts, closedMarket.endedAt);
assert.equal(polymarketHistoryBody({ interval: { value: "1d" } }, { closed: false, endedAt: closedMarket.endedAt }).interval, "1d");
assert.equal(polymarketMarketAnchorDate(closedMarket), "2022-03-16");
assert.equal(polymarketMarketAnchorDate({ closed: false, endedAt: closedMarket.endedAt }), "");
const oilPick = polymarketPickFromSuggestion({
  entity: "market",
  id: "241830",
  slug: "oil",
  title: "Oil",
  closed: true,
  raw: { closedTime: "2022-03-16 11:14:35+00", startDate: "2022-03-02T19:23:10.922Z", closed: true },
});
assert.equal(oilPick.endedAt, closedMarket.endedAt);
assert.equal(oilPick.startedAt, closedMarket.startedAt);
const tokenDay = polymarketTokenHistoryParams({ interval: { value: "1d" } }, closedMarket);
assert.equal(tokenDay.interval, undefined);
assert.equal(Number(tokenDay.end), closedMarket.endedAt);
assert.equal(Number(tokenDay.end) - Number(tokenDay.start), 86400);
const tokenMonth = polymarketTokenHistoryParams({ interval: { value: "1m" } }, closedMarket);
assert.ok(Number(tokenMonth.end) - Number(tokenMonth.start) <= 15 * 86400);
const tokenMax = polymarketTokenHistoryParams({ interval: { value: "max" } }, closedMarket);
assert.equal(Number(tokenMax.start), closedMarket.startedAt);
assert.equal(Number(tokenMax.end), closedMarket.endedAt);
const longClosed = { closed: true, endedAt: closedMarket.endedAt, startedAt: closedMarket.endedAt - 40 * 86400 };
const tokenLong = polymarketTokenHistoryParams({ interval: { value: "max" } }, longClosed);
assert.equal(Number(tokenLong.end) - Number(tokenLong.start), 15 * 86400);
assert.deepEqual(polymarketHistoryFidelityOptions("1w", false).map((option) => option[0]), ["5", "15", "60", "240", "1440"]);
assert.equal(polymarketHistoryFidelityOptions("1m", false).some((option) => option[0] === "1" || option[0] === "5"), false);
assert.equal(polymarketHistoryFidelityOptions("1d", true).some((option) => option[0] === "1"), true);
assert.equal(polymarketMarketFanout("getTokenPriceHistory"), true);
assert.equal(polymarketMarketFanout("getTickSize"), true);
assert.equal(polymarketLiveBuildRequirement("getTickSize")?.kind, "token");
assert.equal(polymarketLiveBuildColumns("getTickSize").find((column) => column.id === "minimum_tick_size")?.type, "number");
assert.equal(polymarketQuoteAttributeColumns("getTickSize", polymarketLiveBuildColumns("getTickSize"))[0]?.id, "quote_outcome");
assert.equal(defaultPolymarketQuoteFilters("getTickSize").quote_outcome.value, "both");
assert.equal(polymarketLiveBuildRequirement("getTokenPriceHistory")?.kind, "token");
const tokenColumns = polymarketLiveBuildColumns("getTokenPriceHistory");
assert.deepEqual(
  ["timestamp", "price", "resolution_seconds"].every((id) => tokenColumns.some((column) => column.id === id)),
  true,
);
const tokenAttributes = polymarketQuoteAttributeColumns("getTokenPriceHistory", tokenColumns);
assert.deepEqual(tokenAttributes.slice(0, 5).map((column) => column.id), ["quote_outcome", "interval", "time_range", "bucket_seconds", "as_of"]);
assert.deepEqual(tokenAttributes.find((column) => column.id === "time_range")?.rangePresetIds, ["past-24h", "past-3d", "past-7d"]);
assert.equal(polymarketTokenBucketOptions("1w", false, false).some((option) => option[0] === "60"), false);
assert.equal(polymarketTokenBucketOptions("1m", false, false).some((option) => option[0] === "300"), false);
assert.equal(polymarketTokenBucketOptions("1d", true, false).some((option) => option[0] === "60"), true);
assert.deepEqual(polymarketTokenHistoryParams({ interval: { value: "1d" }, bucket_seconds: { value: "60" } }), { interval: "1d", bucket_seconds: "60" });
assert.equal(polymarketTokenHistoryParams({ interval: { value: "1w" }, bucket_seconds: { value: "60" } }).bucket_seconds, "300");
assert.equal(polymarketTokenHistoryParams({ as_of: { value: "2026-10-07" }, interval: { value: "1d" }, time_range: { from: "2026-10-01", to: "2026-10-02" } }).interval, undefined);
assert.equal(polymarketTokenHistoryParams({ as_of: { value: "2026-10-07" } }).as_of > 0, true);
assert.throws(
  () => polymarketTokenHistoryParams({ time_range: { from: "2026-01-01", to: "2026-10-07" } }),
  /15 days/,
);
assert.equal(polymarketTradeQuery({ trade_side: { value: "BUY" }, taker_only: { include: ["false"] } }).side, "BUY");
assert.equal(polymarketTradeQuery({ trade_side: { value: "BUY" }, taker_only: { include: ["false"] } }).taker_only, "false");
assert.deepEqual(
  polymarketQuoteTokens({ tokenIds: ["yes-token", "no-token"], outcomes: ["Yes", "No"] }, "no").map((pair) => pair.tokenId),
  ["no-token"],
);

const marketJoins = polymarketJoinChoices("getMarkets");
const joinIds = [
  "getOrderbooks",
  "getMarketPrices",
  "getMidpointPrices",
  "getSpreads",
  "getTickSize",
  "getLastTradePrices",
  "getBatchPricesHistory",
  "getTokenPriceHistory",
  "getTradesByMarket",
  "getOpenInterestCompose",
  "getHoldersByMarkets",
];
assert.deepEqual(
  marketJoins.map((item) => item.id),
  joinIds,
);
assert.equal(marketJoins.some((item) => item.id === "parent-market"), false);
assert.equal(polymarketJoinChoices("getSamplingMarkets").length, marketJoins.length);
assert.equal(marketJoins.find((item) => item.id === "getTradesByMarket")?.title, "Trade History");
assert.equal(marketJoins.find((item) => item.id === "getOrderbooks")?.realtime, true);
assert.equal(marketJoins.find((item) => item.id === "getTickSize")?.realtime, false);
const bookJoins = polymarketJoinChoices("getOrderbooks");
assert.equal(bookJoins[0]?.id, "parent-market");
assert.equal(bookJoins.some((item) => item.id === "getOrderbooks"), false);
assert.equal(bookJoins.some((item) => item.id === "getSpreads"), true);
assert.equal(bookJoins.some((item) => item.id === "getOpenInterestCompose"), true);
assert.equal(bookJoins.some((item) => item.id === "getHoldersByMarkets"), true);
const holderJoins = polymarketJoinChoices("getHoldersByMarkets");
assert.equal(holderJoins[0]?.id, "parent-market");
assert.equal(holderJoins.some((item) => item.id === "getHoldersByMarkets"), false);
assert.equal(holderJoins.some((item) => item.id === "getTradesByMarket"), true);
assert.deepEqual(polymarketJoinChoices("series"), []);
assert.deepEqual(polymarketJoinChoices("getEvents"), []);
assert.deepEqual(polymarketJoinChoices("getMarketsByEvents"), []);
for (const retired of [
  "getCurrentPositions",
  "getClosedPositions",
  "getUserActivity",
  "getHolderPositionValue",
  "getHolderTrades",
  "getHolderTradedMarkets",
]) {
  assert.equal(marketJoins.some((item) => item.id === retired), false);
}

function traderJoinIds(tableId) {
  return polymarketTraderJoinChoices(tableId).map((item) => item.id);
}
const leaderboardJoins = polymarketTraderJoinChoices("getTraderLeaderboard");
assert.deepEqual(traderJoinIds("getTraderLeaderboard"), [
  "getTraderByAddress",
  "getTraderPositions",
  "getTraderPnlSeries",
  "getTraderActivity",
]);
assert.equal(leaderboardJoins[0].placement, "merge");
assert.equal(leaderboardJoins.find((item) => item.id === "getTraderPnlSeries").note.includes("max PnL"), true);
assert.equal(traderJoinIds("getTraderLeaderboard").includes("getOrderbooks"), false);
const winJoins = polymarketTraderJoinChoices("getBiggestWinners");
assert.equal(winJoins.find((item) => item.id === "getTraderByAddress").placement, "merge");
assert.equal(winJoins.find((item) => item.id === "parent-market").placement, "market-choice");
assert.equal(winJoins.some((item) => item.id === "getOrderbooks"), true);
assert.equal(winJoins.some((item) => item.id === "getHoldersByMarkets"), true);
assert.equal(winJoins.find((item) => item.id === "getPublicProfiles").placement, "merge");
assert.equal(polymarketJoinPlacement(winJoins.find((item) => item.id === "parent-market"), "merge"), "merge");
assert.equal(polymarketJoinPlacement(winJoins.find((item) => item.id === "parent-market"), "sheet"), "sheet");
assert.deepEqual(traderJoinIds("getTraderByAddress"), [
  "getTraderPositions",
  "getTraderPnlSeries",
  "getTraderActivity",
  "getPublicProfiles",
]);
const positionJoins = polymarketTraderJoinChoices("getTraderPositions");
assert.equal(positionJoins[0].id, "parent-market");
assert.equal(positionJoins.some((item) => item.id === "getTraderPositions"), false);
assert.equal(positionJoins.some((item) => item.id === "getTraderByAddress"), true);
assert.equal(traderJoinIds("getTraderPnlSeries").includes("parent-market"), false);
assert.equal(traderJoinIds("getTraderPnlSeries").includes("getTraderPositions"), true);
assert.equal(polymarketTraderJoinChoices("getTraderActivity").some((item) => item.id === "getTradesByMarket"), true);
const holderTraderJoins = polymarketTraderJoinChoices("getHoldersByMarkets");
assert.equal(holderTraderJoins[0].id, "parent-market");
assert.equal(holderTraderJoins.some((item) => item.id === "getHoldersByMarkets"), false);
assert.equal(holderTraderJoins.some((item) => item.id === "getTraderActivity"), true);
assert.deepEqual(traderJoinIds("getPublicProfiles"), [
  "getTraderByAddress",
  "getTraderPositions",
  "getTraderPnlSeries",
  "getTraderActivity",
]);
assert.equal(
  polymarketTraderWalletFromRow({
    user_id: "0xABCabcabcabcabcabcabcabcabcabcabcabcabca",
    proxyWallet: "0xdefdefdefdefdefdefdefdefdefdefdefdefdefa",
  }),
  "0xabcabcabcabcabcabcabcabcabcabcabcabcabca",
);
assert.equal(polymarketTraderWalletFromRow({ proxyWallet: "0x39125313116835eb6a55688350813921c9360246" }).length, 42);
const people = polymarketTraderEntities(
  [
    { user_id: "0xabcabcabcabcabcabcabcabcabcabcabcabcabca", user_name: "Zoomify" },
    { user_id: "0xabcabcabcabcabcabcabcabcabcabcabcabcabca", user_name: "Zoomify" },
    { user: "0xdefdefdefdefdefdefdefdefdefdefdefdefdefa" },
  ],
  10,
);
assert.equal(people.length, 2);
assert.equal(people[0].label, "Zoomify");
assert.equal(people[0].pick.address, "0xabcabcabcabcabcabcabcabcabcabcabcabcabca");
assert.equal(
  polymarketMarketEntities([{ condition_id: "0xmarket", question: "Will it rain?" }, { condition_id: "0xmarket" }]).length,
  1,
);
const merged = mergePolymarketJoinRows(
  [{ id: "user_id" }, { id: "pnl" }],
  [{ user_id: "0xabcabcabcabcabcabcabcabcabcabcabcabcabca", pnl: 3 }],
  [{ id: "address" }, { id: "pnl" }, { id: "volume" }],
  [{ address: "0xabcabcabcabcabcabcabcabcabcabcabcabcabca", pnl: 9, volume: 4 }],
  { anchor: "trader" },
);
assert.deepEqual(
  merged.columns.map((column) => column.id),
  ["user_id", "pnl", "address", "joined_pnl", "volume"],
);
assert.equal(merged.rows[0].volume, 4);
assert.equal(merged.rows[0].pnl, 3);
assert.equal(merged.rows[0].joined_pnl, 9);
assert.equal(polymarketTraderJoinSheetTitle("getTraderActivity", "Zoomify"), "Zoomify's activity");
assert.equal(polymarketTraderJoinSheetTitle("getTraderPositions", "Zoomify"), "Zoomify's positions");
assert.equal(polymarketTraderJoinSheetTitle("getTraderPnlSeries", "Zoomify"), "Zoomify's PnL");
const holders = endpoints.find((endpoint) => endpoint.id === "getHoldersByMarkets");
assert.equal(holders?.title, "Top Holders");
assert.equal(holders?.category, "holders");
assert.equal(holders?.realtime, false);
assert.equal(holders?.description, "The largest holders of a market, and how many shares each one holds.");
const holderColumns = polymarketLiveBuildColumns("getHoldersByMarkets");
assert.equal(holderColumns.find((column) => column.id === "amount")?.type, "number");
assert.equal(holderColumns.find((column) => column.id === "total_pnl")?.type, "number");
assert.equal(holderColumns.find((column) => column.id === "verified")?.type, "boolean");
const holderAttrs = polymarketQuoteAttributeColumns("getHoldersByMarkets", holderColumns);
assert.deepEqual(holderAttrs.slice(0, 3).map((column) => column.id), ["quote_outcome", "min_balance", "include_pnl"]);
assert.equal(holderAttrs[1]?.queryOnly, true);
assert.equal(defaultPolymarketQuoteFilters("getHoldersByMarkets").quote_outcome.value, "both");
assert.equal(defaultPolymarketQuoteFilters("getHoldersByMarkets").min_balance.value, "");
assert.deepEqual(defaultPolymarketQuoteFilters("getHoldersByMarkets").include_pnl.include, ["false"]);
assert.deepEqual(polymarketHolderQuery({ min_balance: { value: "" }, include_pnl: { include: ["false"] } }), {});
assert.equal(polymarketHolderQuery({ min_balance: { value: "10" }, include_pnl: { include: ["true"] } }).min_balance, "10");
assert.equal(polymarketHolderQuery({ min_balance: { value: "10" }, include_pnl: { include: ["true"] } }).include_pnl, "true");
assert.equal(polymarketHolderLimit({ include_pnl: { include: ["false"] } }, "50", 10000), 50);
assert.equal(polymarketHolderLimit({ include_pnl: { include: ["true"] } }, "500", 10000), 100);
assert.equal(polymarketHolderLimit({ include_pnl: { include: ["false"] } }, "5000", 10000), 1000);
const holderKey = JSON.parse(polymarketQuoteRequestKey("getHoldersByMarkets", { quote_outcome: { value: "yes" }, min_balance: { value: "5" }, include_pnl: { include: ["true"] } }, "20", 10000));
assert.equal(holderKey.outcome, "yes");
assert.equal(holderKey.min, "5");
assert.equal(holderKey.limit, 20);
const joinedPick = polymarketJoinPickFromRow({
  id: "5156688",
  conditionId: "0xabc",
  question: "Will the price of Bitcoin be above $74,000 on October 7?",
  slug: "bitcoin-above-74k-on-october-7-2026",
  clobTokenIds: '["yes-token","no-token"]',
  outcomes: '["Yes","No"]',
  closed: "false",
});
assert.equal(joinedPick.entityId, "5156688");
assert.equal(joinedPick.conditionId, "0xabc");
assert.deepEqual(joinedPick.tokenIds, ["yes-token", "no-token"]);
assert.equal(joinedPick.closed, false);
assert.equal(polymarketJoinPickFromRow({ question: "No identity" }), null);
assert.equal(
  polymarketJoinPickFromRow({ condition_id: "0xdef", market_slug: "sample-market", question: "Sample", token_ids: "a, b" }).tokenIds.join(","),
  "a,b",
);

console.log("polymarket live build ok");
