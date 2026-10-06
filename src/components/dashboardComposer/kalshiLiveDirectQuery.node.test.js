import assert from "node:assert/strict";
import {
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
  seriesDiscoveryCategories,
  seriesUpdatedAfter,
} from "./kalshiLiveDirectScope.js";

assert.equal(isKalshiLiveDirectTable("trades"), true);
assert.equal(isKalshiLiveDirectTable("events"), true);
assert.equal(isKalshiLiveDirectTable("markets"), false);
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
assert.equal(kalshiLiveDirectScopeError("series", [], query, {}), "Search for a series or select a category.");
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
  ["time_range", "period_interval", "end_period_ts", "volume_fp", "market_ticker"],
);
assert.equal(candleAttributes[0].queryOnly, true);
assert.equal(candleAttributes[1].control, "period");
assert.equal(candleAttributes[2].dateEpoch, "unix");

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
  ["time_range", "depth", "side", "price_dollars"],
);
assert.equal(bookAttributes[1].control, "depth");

const seeded = defaultDirectAttributeFilters("candlesticks", new Date("2026-10-05T15:00:00Z"));
assert.equal(seeded.time_range.preset, "past-24h");
assert.equal(seeded.period_interval.value, "60");
const windowed = directPullWindow("candlesticks", seeded, query);
assert.equal(windowed.period, 60);
assert.ok(windowed.maxTs > windowed.minTs);
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

console.log("kalshi live direct query ok");
