import assert from "node:assert/strict";
import {
  defaultKalshiLiveDirectQuery,
  directMarketTickers,
  directSeriesTickers,
  isKalshiLiveDirectTable,
  kalshiLiveDirectScopeError,
  kalshiLiveSeriesAttributeColumns,
  seriesDiscoveryCategory,
  seriesUpdatedAfter,
} from "./kalshiLiveDirectScope.js";

assert.equal(isKalshiLiveDirectTable("trades"), true);
assert.equal(isKalshiLiveDirectTable("markets"), false);

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
assert.equal(seriesDiscoveryCategory({ category: { include: ["", "Crypto"] } }), "Crypto");
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

console.log("kalshi live direct query ok");
