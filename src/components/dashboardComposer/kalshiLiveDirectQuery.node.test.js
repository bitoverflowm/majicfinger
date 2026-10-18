import assert from "node:assert/strict";
import {
  KALSHI_LIVE_CANDLE_QUERY_IDS,
  candleRangeMaxDays,
  fitCandleRange,
  inclusiveDays,
  defaultDirectAttributeFilters,
  defaultJoinWindowFilters,
  defaultKalshiLiveDirectQuery,
  directEventTickers,
  directMarketTickers,
  directPullWindow,
  directSeriesTickers,
  eventCandleSheetMarkets,
  eventClosesAfter,
  eventDiscoveryStatuses,
  eventForecastable,
  fitForecastWindow,
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
  holderPositionStatus,
  kalshiTraderJoinChoices,
  kalshiTraderJoinPullSpec,
  kalshiTraderJoinSheetTitle,
  kalshiTraderPullSpec,
  kalshiTraderTableNamesMarkets,
  traderMarketTickersFromRows,
  seriesDiscoveryCategories,
  seriesUpdatedAfter,
  forecastPercentileValues,
  forecastPullTargets,
  kalshiLiveEventForecastAttributeColumns,
  kalshiLiveMultivariateAttributeColumns,
  multivariateCollectionTicker,
} from "./kalshiLiveDirectScope.js";
import { normalizeKalshiLiveEventRow } from "@/lib/kalshiLive/normalizeEventRow";

const rolledEvent = normalizeKalshiLiveEventRow({
  event_ticker: "KXFED-26DEC",
  title: "Fed decision",
  markets: [
    { status: "active", volume_fp: "1200.50", volume_24h_fp: "10.00", open_interest_fp: "300.00", open_time: "2026-07-29T14:00:00Z", close_time: "2026-12-10T19:00:00Z" },
    { status: "closed", volume_fp: "800.00", volume_24h_fp: "0.00", open_interest_fp: "0.00", open_time: "2026-07-30T14:00:00Z", close_time: "2026-12-11T19:00:00Z" },
  ],
});
assert.equal(rolledEvent.event_status, "open");
assert.equal(rolledEvent.market_count, 2);
assert.equal(rolledEvent.volume_fp, 2000.5);
assert.equal(rolledEvent.volume_24h_fp, 10);
assert.equal(rolledEvent.open_interest_fp, 300);
assert.equal(rolledEvent.open_time, "2026-07-29T14:00:00.000Z");
assert.equal(rolledEvent.close_time, "2026-12-11T19:00:00.000Z");
assert.equal(normalizeKalshiLiveEventRow({ markets: [{ status: "finalized", volume_fp: "5" }, { status: "settled" }] }).event_status, "settled");
assert.equal(normalizeKalshiLiveEventRow({ markets: [{ status: "initialized" }] }).event_status, "unopened");
const bareEvent = normalizeKalshiLiveEventRow({ event_ticker: "KXNEW-27" });
assert.equal(bareEvent.volume_fp, null);
assert.equal(bareEvent.event_status, "");
assert.equal(kalshiLiveEventAttributeColumns([{ id: "event_status" }, { id: "volume_fp" }]).filter((column) => column.id === "status").length, 1);

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
assert.deepEqual(
  traderNicknamesFromRows([{ trader_nickname: "Cy" }, { taker_nickname: "", maker_nickname: "Di" }, { taker_nickname: "" }]),
  ["Cy", "Di"],
);
assert.equal(isKalshiLiveDirectTable("holder_positions"), true);
assert.equal(kalshiLiveDirectScopeError("holder_positions", [], {}, {}), "Add a trader nickname.");
assert.equal(kalshiLiveDirectScopeError("holder_positions", [], {}, { nicknames: { containsTags: ["Ada"] } }), "");
assert.deepEqual(kalshiTraderJoinChoices("leaderboard").map((item) => item.id), ["profile", "positions", "trades"]);
assert.deepEqual(kalshiTraderJoinChoices("holder_profile").map((item) => item.id), ["positions", "trades"]);
assert.deepEqual(kalshiTraderJoinChoices("holder_positions").map((item) => item.id), ["profile", "trades"]);
assert.deepEqual(kalshiTraderJoinChoices("trades_by_holder").map((item) => item.id), ["profile", "positions"]);
assert.deepEqual(kalshiTraderJoinChoices("markets"), []);
assert.equal(kalshiTraderTableNamesMarkets("holder_positions"), true);
assert.equal(kalshiTraderTableNamesMarkets("leaderboard"), false);
assert.deepEqual(
  traderMarketTickersFromRows([{ market_ticker: "A" }, { ticker: "B" }, { market_ticker: "A" }, { market_ticker: "" }, { ticker: "C" }], 2),
  ["A", "B"],
);
assert.equal(kalshiTraderJoinSheetTitle("positions", "Ada"), "Ada's positions");
assert.equal(kalshiTraderJoinSheetTitle("trades", "Ada"), "Ada's trades");
assert.equal(holderPositionStatus({}), "open");
assert.equal(holderPositionStatus({ position_status: { value: "all" } }), "all");
assert.deepEqual(kalshiTraderJoinPullSpec("positions", "Ada"), { table: "holder_positions", nicknames: ["Ada"], status: "open" });
assert.deepEqual(
  kalshiTraderPullSpec("trades_by_holder", {
    nickname: { containsTags: ["Ada"] },
    series_ticker: { containsTags: ["kxfed", "KXCPI"] },
    market_ticker: { containsTags: ["kxfed-26dec-t4.00"] },
    min_amount: { min: "10" },
  }),
  {
    table: "trades_by_holder",
    nicknames: ["Ada"],
    seriesTickers: ["KXFED", "KXCPI"],
    eventTickers: [],
    marketTickers: ["KXFED-26DEC-T4.00"],
    minAmount: 10,
  },
);
assert.deepEqual(kalshiTraderPullSpec("holder_profile", { nicknames: { containsTags: ["Ada"] }, time_period: { value: "yearly" } }), {
  table: "holder_profile",
  nicknames: ["Ada"],
  timePeriod: "yearly",
});
assert.deepEqual(
  kalshiLiveTraderAttributeColumns("holder_positions", [{ id: "nickname" }, { id: "status" }, { id: "pnl" }]).map((column) => column.id),
  ["nicknames", "position_status", "pnl"],
);
assert.ok(kalshiLiveTraderAttributeColumns("trades_by_holder", []).some((column) => column.id === "market_ticker"));
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
assert.equal(seeded.time_range.preset, "life-last-day");
assert.equal(defaultJoinWindowFilters("trades").time_range.preset, "market-life");
assert.equal(defaultJoinWindowFilters("candlesticks").period_interval.value, "60");
assert.deepEqual(defaultJoinWindowFilters("orderbook"), { depth: { value: "20" } });
assert.equal(kalshiLiveDirectAttributeColumns("trades", [])[0].lifeWindows, true);
assert.equal(kalshiLiveDirectAttributeColumns("event_candlesticks", [])[0].lifeWindows, true);
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
assert.equal(defaultDirectAttributeFilters("event_candlesticks", new Date("2026-10-06T12:00:00Z")).time_range.preset, "life-last-day");
assert.deepEqual(
  eventCandleSheetMarkets(
    [
      { ticker: "EV-C", rows: [{ end_period_ts: 1 }] },
      { ticker: "EV-EMPTY", rows: [] },
      { ticker: "EV-EXTRA", rows: [{ end_period_ts: 1 }] },
      { ticker: "EV-A", rows: [{ end_period_ts: 1 }] },
    ],
    [{ ticker: "EV-A" }, { ticker: "EV-B" }, { ticker: "EV-C" }, { ticker: "EV-EMPTY" }],
  ).map((market) => market.ticker),
  ["EV-A", "EV-C", "EV-EXTRA"],
);
assert.deepEqual(eventCandleSheetMarkets(null, null), []);

assert.equal(defaultJoinWindowFilters("event_forecast").time_range.preset, "life-last-week");
assert.equal(defaultJoinWindowFilters("event_forecast").period_interval.value, "60");
assert.equal(eventForecastable([{ strike_type: "less", cap_strike: 72 }]), true);
assert.equal(eventForecastable([{ strike_type: "greater", floor_strike: 0 }]), true);
assert.equal(eventForecastable([{ strike_type: "structured", floor_strike: null, cap_strike: "" }]), false);
assert.equal(eventForecastable([{ strike_type: "" }]), false);
assert.equal(eventForecastable([]), true);
const forecastNow = Date.UTC(2026, 9, 18, 12) / 1000;
assert.deepEqual(fitForecastWindow({ minTs: forecastNow - 3600 * 10, maxTs: forecastNow + 86400, period: 60 }, forecastNow * 1000), {
  minTs: forecastNow - 3600 * 10,
  maxTs: forecastNow,
  period: 60,
});
assert.equal(fitForecastWindow({ minTs: 0, maxTs: forecastNow, period: 60 }, forecastNow * 1000).minTs, forecastNow - 3600 * 4999);
assert.equal(fitForecastWindow({ minTs: 0, maxTs: forecastNow, period: 0 }, forecastNow * 1000).minTs, forecastNow - 5 * 4999);
assert.equal(fitForecastWindow({ maxTs: forecastNow, period: 1440 }, forecastNow * 1000).minTs, forecastNow - 86400);
assert.equal(fitForecastWindow({ minTs: forecastNow + 10, maxTs: forecastNow + 20, period: 60 }, forecastNow * 1000).empty, true);
assert.deepEqual(fitForecastWindow({ empty: true }), { empty: true });

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
