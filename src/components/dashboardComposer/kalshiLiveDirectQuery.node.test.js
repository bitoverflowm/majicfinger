import assert from "node:assert/strict";
import {
  defaultKalshiLiveDirectQuery,
  directMarketTickers,
  directSeriesTickers,
  isKalshiLiveDirectTable,
  kalshiLiveDirectScopeError,
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
assert.equal(kalshiLiveDirectScopeError("series", picks, { mode: "tickers" }), "");
assert.equal(kalshiLiveDirectScopeError("series", [], { mode: "discover", category: "" }), "Select a category to discover series.");
assert.equal(kalshiLiveDirectScopeError("series", [], { mode: "discover", category: "Sports" }), "");

console.log("kalshi live direct query ok");
