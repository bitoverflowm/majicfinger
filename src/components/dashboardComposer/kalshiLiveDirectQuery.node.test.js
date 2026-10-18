import assert from "node:assert/strict";
import {
  KALSHI_LIVE_CANDLE_QUERY_IDS,
  candleRangeMaxDays,
  fitCandleRange,
  inclusiveDays,
  defaultDirectAttributeFilters,
  defaultKalshiLiveDirectQuery,
  directEventTickers,
  directMarketTickers,
  directPullWindow,
  directSeriesTickers,
  eventClosesAfter,
  eventDiscoveryStatuses,
  eventSeriesTickers,
  isKalshiLiveDirectTable,
  kalshiLiveDirectAttributeColumns,
  kalshiLiveDirectScopeError,
  kalshiLiveEventAttributeColumns,
  kalshiLiveSeriesAttributeColumns,
  kalshiLiveTraderAttributeColumns,
  leaderboardMetric,
  traderNicknamesFromRows,
  traderSearchQuery,
  seriesDiscoveryCategories,
  seriesUpdatedAfter,
  forecastPercentileValues,
  forecastPullTargets,
  kalshiLiveEventForecastAttributeColumns,
  kalshiLiveMultivariateAttributeColumns,
  multivariateCollectionTicker,
} from "./kalshiLiveDirectScope.js";

assert.equal(isKalshiLiveDirectTable("trades"), true);
assert.equal(isKalshiLiveDirectTable("events"), true);
assert.equal(isKalshiLiveDirectTable("leaderboard"), true);
assert.equal(isKalshiLiveDirectTable("markets"), false);
assert.equal(kalshiLiveDirectScopeError("leaderboard", [], {}, {}), "");
assert.equal(kalshiLiveDirectScopeError("search_traders", [], {}, {}), "Search for a trader.");
assert.equal(kalshiLiveDirectScopeError("search_traders", [], {}, { nickname_query: { contains: "ka" } }), "");
assert.equal(kalshiLiveDirectScopeError("holder_profile", [], {}, {}), "Add a trader nickname.");
assert.equal(leaderboardMetric({}), "projected_pnl");
assert.equal(traderSearchQuery({ nickname_query: { containsTags: ["ada"] } }), "ada");
assert.deepEqual(traderNicknamesFromRows([{ nickname: "Ada" }, { nickname: "ada" }, { nickname: "Bea" }], 2), ["Ada", "Bea"]);
const boardAttributes = kalshiLiveTraderAttributeColumns("leaderboard", [
  { id: "rank", type: "number", title: "Rank" },
  { id: "metric_name", type: "text", title: "Rank order" },
]);
assert.deepEqual(
  boardAttributes.map((column) => column.id),
  ["metric_name", "time_period", "category", "rank"],
);
assert.equal(boardAttributes[0].queryOnly, true);
assert.equal(defaultDirectAttributeFilters("leaderboard").time_period.value, "all_time");
assert.equal(defaultKalshiLiveDirectQuery("events").sheetMode, "combined");

const query = defaultKalshiLiveDirectQuery("trades", Date.parse("2026-10-04T12:00:00Z"));
assert.equal(query.maxTs - query.minTs, 24 * 60 * 60);
assert.equal(defaultKalshiLiveDirectQuery("candlesticks").period, 60);
assert.equal(defaultKalshiLiveDirectQuery("orderbook").depth, 20);

const picks = [
  { kind: "market", ticker: "MKT-1", status: "ready", rows: [{ ticker: "MKT-1" }] },
  { kind: "series", ticker: "SER-1", status: "ready", rows: [{ ticker: "MKT-2" }, { ticker: "MKT-1" }] },
];
assert.deepEqual(
  directMarketTickers(picks).map((market) => market.ticker),
  ["MKT-1", "MKT-2"],
);
assert.deepEqual(directSeriesTickers(picks), ["SER-1"]);
assert.equal(kalshiLiveDirectScopeError("trades", [], query), "Add at least one market ticker.");
assert.equal(kalshiLiveDirectScopeError("trades", [{ status: "loading", kind: "market", ticker: "MKT-1", rows: [] }], query), "");
assert.equal(kalshiLiveDirectScopeError("series", picks, query, {}), "");
assert.equal(kalshiLiveDirectScopeError("series", [], query, {}), "");
assert.equal(kalshiLiveDirectScopeError("series", [], query, { category: { include: ["Sports"] } }), "");
assert.deepEqual(seriesDiscoveryCategories({ category: { include: ["", "Crypto", "Sports", "Crypto"] } }), ["Crypto", "Sports"]);
assert.equal(kalshiLiveDirectScopeError("series", [], query, { category: { include: ["Sports", "Business"] } }), "");
assert.equal(seriesUpdatedAfter({ last_updated_ts: { minUpdatedTs: 1700000000 } }), 1700000000);
assert.equal(seriesUpdatedAfter({}), "");

const seriesColumns = [
  { id: "ticker", type: "text", title: "Ticker" },
  { id: "title", type: "text", title: "Title" },
  { id: "category", type: "text", title: "Category", description: "Category this series belongs to" },
  { id: "volume_fp", type: "number", title: "Volume" },
  { id: "last_updated_ts", type: "date", title: "Last Updated Ts" },
];
const shaped = kalshiLiveSeriesAttributeColumns(seriesColumns, ["Crypto", "Sports"]);
assert.deepEqual(
  shaped.map((column) => column.id),
  ["category", "last_updated_ts", "ticker", "title", "volume_fp"],
);
assert.equal(shaped[0].control, "category");
assert.deepEqual(shaped[0].enumOptions, [
  ["Crypto", "Crypto"],
  ["Sports", "Sports"],
]);
assert.equal(shaped[1].control, "updated-after");
assert.equal(shaped[1].title, "Last updated after");

const candleColumns = [
  { id: "end_period_ts", type: "date", title: "End period" },
  { id: "volume_fp", type: "number", title: "Volume" },
  { id: "market_ticker", type: "text", title: "Market ticker" },
];
const candleAttributes = kalshiLiveDirectAttributeColumns("candlesticks", candleColumns);
assert.deepEqual(
  candleAttributes.map((column) => column.id),
  ["time_range", "period_interval", "include_latest_before_start", "end_period_ts", "volume_fp", "market_ticker"],
);
assert.equal(candleAttributes[0].queryOnly, true);
assert.equal(candleAttributes[1].control, "period");
assert.deepEqual(candleAttributes[1].enumOptions.map(([, label]) => label), ["1 minute", "1 hour", "1 day"]);
assert.equal(candleAttributes[2].queryOnly, true);
assert.equal(candleAttributes[3].dateEpoch, "unix");
assert.deepEqual(KALSHI_LIVE_CANDLE_QUERY_IDS, ["time_range", "period_interval"]);
assert.equal(candleRangeMaxDays("1"), 3);
assert.equal(candleRangeMaxDays("60"), 208);
assert.equal(candleRangeMaxDays("1440"), undefined);
assert.equal(inclusiveDays("2026-10-01", "2026-10-03"), 3);
assert.deepEqual(fitCandleRange({ from: "2026-09-01", to: "2026-10-05", preset: "market-life" }, 3), {
  from: "2026-10-03",
  to: "2026-10-05",
  preset: "",
});
const shortRange = { from: "2026-10-04", to: "2026-10-05", preset: "past-24h" };
assert.equal(fitCandleRange(shortRange, 3), shortRange);
assert.equal(fitCandleRange(shortRange, undefined), shortRange);

const tradeAttributes = kalshiLiveDirectAttributeColumns("trades", [
  { id: "created_time", type: "date", title: "Created time" },
  { id: "taker_side", type: "text", title: "Taker side" },
  { id: "yes_price_dollars", type: "number", title: "Yes price" },
]);
assert.equal(tradeAttributes[0].id, "time_range");
assert.deepEqual(tradeAttributes[2].enumOptions, [
  ["yes", "Yes"],
  ["no", "No"],
]);

const bookAttributes = kalshiLiveDirectAttributeColumns("orderbook", [
  { id: "side", type: "text", title: "Side" },
  { id: "price_dollars", type: "number", title: "Price" },
]);
assert.deepEqual(
  bookAttributes.map((column) => column.id),
  ["depth", "side", "price_dollars"],
);
assert.equal(bookAttributes[0].control, "depth");
assert.deepEqual(defaultDirectAttributeFilters("orderbook"), { depth: { value: "20" } });

const seeded = defaultDirectAttributeFilters("candlesticks", new Date("2026-10-05T15:00:00Z"));
assert.equal(seeded.time_range.preset, "past-24h");
assert.equal(seeded.period_interval.value, "60");
const windowed = directPullWindow("candlesticks", seeded, query);
assert.equal(windowed.period, 60);
assert.ok(windowed.maxTs > windowed.minTs);
assert.equal(seeded.include_latest_before_start.value, "true");
assert.equal(windowed.includeLatest, true);
assert.equal(directPullWindow("candlesticks", { ...seeded, include_latest_before_start: { value: "false" } }, query).includeLatest, false);
assert.equal(directPullWindow("candlesticks", { time_range: seeded.time_range }, query).includeLatest, true);
assert.equal("includeLatest" in directPullWindow("trades", seeded, query), false);
const bookWindow = directPullWindow("orderbook", { depth: { value: "5" }, time_range: seeded.time_range }, query);
assert.equal(bookWindow.depth, 5);
assert.equal(bookWindow.minTs, query.minTs);

const eventPicks = [{ kind: "event", ticker: "KXTRUMP-1" }];
assert.deepEqual(directEventTickers(eventPicks), ["KXTRUMP-1"]);
assert.equal(kalshiLiveDirectScopeError("events", [], query, {}), "Search for an event or select a status.");
assert.equal(kalshiLiveDirectScopeError("events", eventPicks, query, {}), "");
assert.equal(kalshiLiveDirectScopeError("events", [], query, { status: { include: ["open", "closed"] } }), "");
assert.deepEqual(eventDiscoveryStatuses({ status: { include: ["open", "nope", "open", "settled"] } }), ["open", "settled"]);
assert.deepEqual(eventSeriesTickers({ series_ticker: { containsTags: ["kxnba", "KXNBA"], contains: "kxcpi" } }), ["KXNBA", "KXCPI"]);
assert.equal(eventClosesAfter({ min_close_ts: { minUpdatedTs: 1700000000 } }), 1700000000);
assert.equal(kalshiLiveDirectScopeError("events", [], query, { min_close_ts: { minUpdatedTs: 1700000000 } }), "");

const eventColumns = [
  { id: "event_ticker", type: "text", title: "Event ticker" },
  { id: "series_ticker", type: "text", title: "Series ticker" },
  { id: "title", type: "text", title: "Title" },
  { id: "strike_date", type: "date", title: "Strike date" },
  { id: "mutually_exclusive", type: "boolean", title: "Mutually exclusive" },
  { id: "last_updated_ts", type: "date", title: "Last Updated Ts" },
];
const eventAttributes = kalshiLiveEventAttributeColumns(eventColumns);
assert.deepEqual(
  eventAttributes.map((column) => column.id),
  ["status", "series_ticker", "min_close_ts", "last_updated_ts", "event_ticker", "title", "strike_date", "mutually_exclusive"],
);
assert.equal(eventAttributes[0].queryOnly, true);
assert.equal(eventAttributes[0].control, "category");
assert.equal(eventAttributes[1].exactTickers, true);
assert.equal(eventAttributes[2].queryOnly, true);
assert.equal(eventAttributes[3].control, "updated-after");
assert.equal(eventAttributes[6].dateEpoch, "iso");

assert.equal(isKalshiLiveDirectTable("event_forecast"), true);
assert.equal(kalshiLiveDirectScopeError("event_forecast", [], {}, {}), "Search for an event or a series.");
assert.equal(
  kalshiLiveDirectScopeError("event_forecast", [{ kind: "event", ticker: "KXHIGHNY-25JAN01" }], {}, {}),
  "",
);
assert.deepEqual(forecastPullTargets([{ kind: "series", ticker: "KXHIGHNY" }, { kind: "event", ticker: "KXHIGHNY-25JAN01", seriesTicker: "KXHIGHNY" }]), {
  events: [{ eventTicker: "KXHIGHNY-25JAN01", seriesTicker: "KXHIGHNY", title: "KXHIGHNY-25JAN01" }],
  seriesTickers: ["KXHIGHNY"],
});
assert.deepEqual(forecastPercentileValues({ percentiles: { containsTags: ["5000", "2500", "5000"], contains: "12" } }), [12, 2500, 5000]);
const forecastAttributes = kalshiLiveEventForecastAttributeColumns([
  { id: "event_ticker", title: "Event ticker" },
  { id: "period_interval", title: "Period interval" },
  { id: "numerical_forecast", title: "Numerical forecast" },
]);
assert.deepEqual(
  forecastAttributes.map((column) => column.id),
  ["percentiles", "time_range", "period_interval", "event_ticker", "numerical_forecast"],
);
assert.equal(directPullWindow("event_forecast", { period_interval: { value: "0" } }, { period: 60 }).period, 0);
assert.equal(directPullWindow("candlesticks", { period_interval: { value: "0" } }, { period: 60 }).period, 60);
assert.equal(directPullWindow("event_candlesticks", { period_interval: { value: "0" } }, { period: 60 }).period, 60);

assert.equal(isKalshiLiveDirectTable("event_candlesticks"), true);
assert.equal(isKalshiLiveDirectTable("multivariate_events"), true);
assert.equal(kalshiLiveDirectScopeError("event_candlesticks", [], {}, {}), "Search for an event.");
assert.equal(
  kalshiLiveDirectScopeError("event_candlesticks", [{ kind: "event", ticker: "KXHIGHNY-26OCT07" }], {}, {}),
  "",
);
assert.equal(defaultDirectAttributeFilters("event_candlesticks", new Date("2026-10-06T12:00:00Z")).period_interval.value, "60");
const eventCandleAttributes = kalshiLiveDirectAttributeColumns("event_candlesticks", [
  { id: "market_ticker", title: "Market ticker" },
  { id: "end_period_ts", type: "date", title: "End" },
]);
assert.deepEqual(eventCandleAttributes.slice(0, 2).map((column) => column.id), ["time_range", "period_interval"]);
assert.equal(eventCandleAttributes[1].queryOnly, true);

const multivariateAttributes = kalshiLiveMultivariateAttributeColumns([
  { id: "event_ticker", title: "Event ticker" },
  { id: "title", title: "Title" },
]);
assert.deepEqual(multivariateAttributes.map((column) => column.id), ["series_ticker", "collection_ticker", "event_ticker", "title"]);
assert.equal(multivariateAttributes[0].exactTickers, true);
assert.equal(multivariateAttributes[1].queryOnly, true);
assert.equal(multivariateCollectionTicker({ collection_ticker: { containsTags: ["KXCOMBO"] } }), "KXCOMBO");
assert.equal(
  kalshiLiveDirectScopeError(
    "multivariate_events",
    [{ kind: "series", ticker: "KXHIGHNY" }],
    {},
    { collection_ticker: { containsTags: ["KXCOMBO"] } },
  ),
  "Use either a series or a collection ticker.",
);
assert.equal(kalshiLiveDirectScopeError("multivariate_events", [], {}, {}), "");

console.log("kalshi live direct query ok");
