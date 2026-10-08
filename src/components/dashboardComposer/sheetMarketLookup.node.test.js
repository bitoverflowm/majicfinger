import assert from "node:assert/strict";

import { marketMetaComplete, sheetMarketSubject } from "./sheetMarketLookup.js";
import { sheetMarketCaption } from "../../lib/markets/marketLife.js";

const orderbook = {
  id: "run-live-getOrderbooks-will-wti-reach-150-in-october-2026",
  integrationId: "polymarket",
  table: "getOrderbooks",
  title: "Orderbook(s) · Will WTI Crude Oil (WTI) hit (HIGH) $150 in October?",
  columns: [{ id: "market_title" }, { id: "outcome" }],
  cells: { "0,0": "Will WTI Crude Oil (WTI) hit (HIGH) $150 in October?", "1,0": "Yes", "1,1": "No" },
};

const holders = sheetMarketSubject(orderbook);
assert.equal(holders.family, "polymarket");
assert.equal(holders.kind, "market");
assert.equal(holders.slug, "will-wti-reach-150-in-october-2026");

const historical = sheetMarketSubject({
  table: "trades",
  title: "Trades · will-polymarket-us-go-live-in-2025",
  pull: { ticker: "0x77b4a1d4cd398a86c18b6bb9b5218917dc9f04b01a3cd4bae1c71ea345f15fa8" },
});
assert.equal(historical.family, "polymarket");
assert.equal(historical.kind, "market");
assert.equal(historical.slug, "will-polymarket-us-go-live-in-2025");
assert.equal(historical.conditionId.startsWith("0x77b4"), true);

const kalshiTrade = sheetMarketSubject({
  integrationId: "kalshiLive",
  table: "orderbook",
  title: "Order book · KXCS2GAME-26OCT041200ASTNEMI-AST",
  pull: null,
});
assert.equal(kalshiTrade.kind, "market");
assert.equal(kalshiTrade.ticker, "KXCS2GAME-26OCT041200ASTNEMI-AST");

const series = sheetMarketSubject({
  id: "run-fanout-markets-KXG7LEADEROUT",
  integrationId: "kalshiLive",
  table: "markets",
  title: "Markets · KXG7LEADEROUT",
  columns: [{ id: "ticker" }, { id: "yes_sub_title" }],
  cells: { "0,0": "KXG7LEADEROUT-26JUL20-DJT", "0,1": "KXG7LEADEROUT-26JUL20-STAK", "1,0": "Trump", "1,1": "Starmer" },
});
assert.equal(series.kind, "series");
assert.equal(series.seriesTicker, "KXG7LEADEROUT");
const seriesCaption = sheetMarketCaption({
  title: "Markets · KXG7LEADEROUT",
  columns: series.columns,
  cells: series.cells,
});
assert.equal(seriesCaption.includes("Trump"), false);
assert.equal(seriesCaption.includes("KXG7LEADEROUT"), true);

const catalog = sheetMarketSubject({
  integrationId: "kalshiLive",
  table: "markets",
  title: "Markets",
  columns: [{ id: "ticker" }],
  cells: { "0,0": "KXAAA-1", "0,1": "KXBBB-2" },
});
assert.equal(catalog.kind, "");

assert.equal(marketMetaComplete({ pull: { marketTitle: "G7", seriesTicker: "KXG7LEADEROUT" } }), true);
assert.equal(marketMetaComplete({ pull: { ticker: "KXAAA-1" } }), false);

console.log("sheet market subject ok");
