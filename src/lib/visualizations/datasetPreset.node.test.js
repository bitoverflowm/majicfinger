import assert from "node:assert/strict";

import {
  centsDigits,
  countObservations,
  describeSheet,
  eventCloseSeries,
  formatCents,
  holderLabel,
  kalshiYesBook,
  partialCaption,
  stampDataset,
  toProbability,
} from "./datasetDescriptor.js";
import { resolveVisualization } from "./presetRegistry.js";

const holders = describeSheet({
  type: "sheet",
  integrationId: "polymarket",
  table: "getHoldersByMarkets",
  columns: [
    { id: "market_title" },
    { id: "name" },
    { id: "amount" },
    { id: "proxy_wallet" },
    { id: "outcome" },
  ],
  cells: {
    "0,0": "Will WTI hit $150?",
    "1,0": "ThetaWhale",
    "2,0": "100",
    "3,0": "0xabc",
    "4,0": "Yes",
    "0,1": "Will WTI hit $150?",
    "1,1": "",
    "2,1": "40",
    "3,1": "0xdef",
    "4,1": "Yes",
  },
});

assert.equal(holders.datasetType, "holders");
assert.equal(holderLabel({ market_title: "Will WTI hit $150?", name: "ThetaWhale", proxy_wallet: "0xabc" }, holders.fields), "ThetaWhale");
assert.equal(holderLabel({ market_title: "Will WTI hit $150?", name: "", proxy_wallet: "0xdef" }, holders.fields), "0xdef");
assert.notEqual(holderLabel({ market_title: "Will WTI hit $150?", name: "", proxy_wallet: "" }, holders.fields), "Will WTI hit $150?");

const oi = describeSheet({
  type: "sheet",
  integrationId: "polymarket",
  table: "getOpenInterestCompose",
  columns: [{ id: "condition_id" }, { id: "value" }],
  cells: { "0,0": "0xabc", "1,0": "1500" },
});
assert.equal(oi.datasetType, "open_interest");
assert.equal(countObservations({ columns: [{ id: "value" }], cells: { "0,0": "1500" } }, oi), 1);
assert.equal(resolveVisualization(oi, { observations: 1, columnIds: ["condition_id", "value"] }).view, "metric");

const book = kalshiYesBook([
  { side: "yes", price: 0.48, size: 10 },
  { side: "no", price: 0.49, size: 8 },
  { side: "no", price: 0.48, size: 4 },
]);
assert.deepEqual(book.bids, [{ price: 0.48, size: 10 }]);
assert.equal(book.asks[0].price, 0.51);
assert.equal(book.asks[0].size, 8);
assert.equal(book.asks[1].price, 0.52);
assert.equal(book.spread, 0.03);

const series = eventCloseSeries(
  [
    { market_ticker: "A", end_period_ts: 2, price_close_dollars: 0.4 },
    { market_ticker: "B", end_period_ts: 2, price_close_dollars: 0.7 },
    { market_ticker: "A", end_period_ts: 1, price_close_dollars: "" },
    { market_ticker: "A", end_period_ts: 1, price_close_dollars: 0.2 },
  ],
  { market: "market_ticker", time: "end_period_ts", close: "price_close_dollars" },
);
assert.equal(series.length, 2);
assert.deepEqual(series[0], { market: "A", points: [{ t: 1, price: 0.2 }, { t: 2, price: 0.4 }] });
assert.equal(series[1].market, "B");
assert.equal(series[0].points.some((point) => point.price === 0), false);

assert.equal(centsDigits([0.285, 0.2849]), 2);
assert.notEqual(formatCents(0.285, 2), formatCents(0.2849, 2));
assert.equal(toProbability(28.5, "cents"), 0.285);
assert.equal(toProbability(0.285, "probability"), 0.285);

const price = describeSheet({
  type: "sheet",
  integrationId: "polymarket",
  table: "getBatchPricesHistory",
  columns: [{ id: "p" }, { id: "t" }],
  cells: {},
});
assert.equal(price.coverage, "sampled");
assert.equal(resolveVisualization(price, { observations: 0, columnIds: ["p", "t"] }).view, "table");
assert.equal(resolveVisualization(price, { observations: 1, columnIds: ["p", "t"] }).reason, "single");
assert.equal(resolveVisualization(price, { observations: 4, columnIds: ["p", "t"] }).view, "price");

const eventCandles = describeSheet({
  type: "sheet",
  integrationId: "kalshiLive",
  table: "event_candlesticks",
  columns: [{ id: "market_ticker" }, { id: "end_period_ts" }, { id: "price_close_dollars" }],
  cells: {
    "0,0": "A",
    "1,0": "1",
    "2,0": "0.2",
    "0,1": "B",
    "1,1": "1",
    "2,1": "0.8",
  },
});
assert.equal(eventCandles.seriesCount, 2);
assert.equal(resolveVisualization(eventCandles, { observations: 2, columnIds: ["market_ticker", "end_period_ts", "price_close_dollars"] }).view, "event-lines");

const kalshiTrades = describeSheet({ type: "sheet", integrationId: "kalshi-live", table: "trades" });
const polyTrades = describeSheet({ type: "sheet", integrationId: "polymarket", table: "getTradesByMarket" });
assert.equal(kalshiTrades.datasetType, "trades");
assert.equal(polyTrades.datasetType, "trades");
assert.equal(describeSheet({ type: "sheet", integrationId: "kalshiHistorical", table: "candlesticks" }).delivery, "historical");
assert.equal(describeSheet({ type: "sheet", table: "not-a-real-endpoint" }), null);

const ranked = describeSheet({
  type: "sheet",
  integrationId: "polymarket",
  table: "getHoldersByMarkets",
  columns: [{ id: "name" }, { id: "amount" }],
});
const custom = resolveVisualization(ranked, { custom: true, userView: "table", columnIds: ["name", "amount"] });
assert.equal(custom.source, "user");
assert.equal(custom.view, "table");
const broken = resolveVisualization(ranked, { custom: true, userView: "order-book", columnIds: ["name", "amount"] });
assert.equal(broken.source, "fallback");
assert.equal(broken.reason, "fields-missing");

assert.equal(partialCaption({ coverage: "partial" }, { shown: 10, loaded: 40, noun: "markets" }), "Top 10 of loaded markets");
assert.equal(partialCaption({ coverage: "sampled" }, { shown: 1, loaded: 1, noun: "prices" }), "Sampled prices");

const stamped = stampDataset({ type: "sheet", integrationId: "polymarket", table: "getTickSize" });
assert.equal(stamped.dataset.datasetType, "tick_size");
assert.equal(stamped.dataset.seriesCount, undefined);

console.log("datasetPreset.node.test.js ok");
