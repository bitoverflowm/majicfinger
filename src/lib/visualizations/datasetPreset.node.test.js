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
import { isStatsDataset, resolveVisualization, visualizationChoices } from "./presetRegistry.js";
import { buildVisualTable, formatSignedUsd, leaderboardBarRows, shortWallet } from "./visualTable.js";

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

const leaderboard = describeSheet({
  type: "sheet",
  integrationId: "polymarket",
  table: "getTraderLeaderboard",
  columns: [{ id: "user_name" }, { id: "pnl" }, { id: "rank" }],
});
assert.equal(leaderboard.datasetType, "leaderboard");
assert.equal(leaderboard.category, "stats");
assert.equal(isStatsDataset(leaderboard), true);
assert.deepEqual(
  visualizationChoices(leaderboard, ["user_name", "pnl", "rank"]).map((choice) => choice.label),
  ["Rank", "Visual Table"],
);
assert.equal(
  resolveVisualization(leaderboard, { custom: true, userView: "visual-table", columnIds: ["user_name", "pnl", "rank"] }).view,
  "visual-table",
);
assert.equal(describeSheet({ type: "sheet", integrationId: "kalshiLive", table: "leaderboard" }).category, "stats");

const table = buildVisualTable(
  [
    { rank: 2, user_name: "nigiri99", user_id: "0x1111111111111111111111111111111111111111", pnl: 1200, volume: 50000, verified: false, time_period: "day", category: "overall", sort_by: "PNL" },
    { rank: 1, user_name: "HomeRunHazard", user_id: "0x5268527977f700f9bf9b6d5cd843859e4e70135d", pnl: "207.8K", volume: "1.2M", profile_image: "https://example.com/a.png", x_username: "homer", verified: "Yes", time_period: "day", category: "overall", sort_by: "PNL" },
  ],
  leaderboard,
);
assert.equal(table.rows[0].name, "HomeRunHazard");
assert.equal(table.rows[0].avatar, "https://example.com/a.png");
assert.equal(table.rows[0].handle, "homer");
assert.equal(table.rows[0].pnl, 207800);
assert.equal(table.rows[0].volume, 1200000);
assert.equal(table.rows[0].verified, true);
assert.equal(table.rows[1].verified, false);
assert.deepEqual(table.caption, ["day", "overall", "PNL"]);
assert.deepEqual(table.columns.map((column) => column.id), ["rank", "trader", "pnl", "volume", "verified", "handle"]);

const bars = leaderboardBarRows(
  [
    { rank: "2", user_name: "nigiri99", pnl: "1.2K" },
    { rank: "1", user_name: "HomeRunHazard", pnl: "207.8K" },
    { rank: "3", user_name: "AVeryLongTraderNameThatWillNotFit", pnl: "-40" },
  ],
  leaderboard,
  10,
);
assert.equal(bars[0].name, "HomeRunHazard");
assert.equal(bars[0].value, 207800);
assert.equal(bars[0].display.startsWith("+"), true);
assert.equal(bars[1].name, "nigiri99");
assert.equal(bars[2].value, -40);
assert.equal(bars[2].short.endsWith("…"), true);
assert.equal(shortWallet(table.rows[0].wallet), "0x5268…135d");
assert.equal(formatSignedUsd(207776).startsWith("+"), true);
assert.equal(formatSignedUsd(-12).startsWith("−"), true);

const biggestWins = describeSheet({
  type: "sheet",
  integrationId: "polymarket",
  table: "getBiggestWinners",
  columns: [{ id: "user_name" }, { id: "pnl" }, { id: "win_rank" }, { id: "event_title" }],
});
assert.equal(biggestWins.datasetType, "biggest_wins");
assert.equal(biggestWins.category, "stats");
assert.equal(isStatsDataset(biggestWins), true);
assert.deepEqual(
  visualizationChoices(biggestWins, ["user_name", "pnl", "win_rank", "event_title"]).map((choice) => choice.label),
  ["Wins", "Visual Table"],
);
assert.equal(resolveVisualization(biggestWins, { columnIds: ["user_name", "pnl", "event_title"] }).view, "bars");

const winTable = buildVisualTable(
  [
    {
      win_rank: 2,
      kind: "market",
      user_name: "Sassy-Bucket",
      user_id: "0x1111111111111111111111111111111111111111",
      pnl: "9.1K",
      initial_value: 400,
      event_title: "Georgia vs Alabama",
      resolved_at: "Oct 11, 2026, 1:00:00 AM",
      time_period: "day",
      category: "overall",
    },
    {
      win_rank: 1,
      kind: "combo",
      user_name: "HomeRunHazard",
      pnl: "20.4K",
      initial_value: "1.2K",
      event_title: "Cleveland Guardians vs. Chicago White Sox: O/U 8.5 / Jacksonville State vs. Kennesaw State: O/U 47.5",
      event_id: 0,
      time_period: "day",
      category: "overall",
    },
  ],
  biggestWins,
);
assert.equal(winTable.rows[0].name, "HomeRunHazard");
assert.equal(winTable.rows[0].kind, "Combo");
assert.equal(winTable.rows[0].event.includes(" / "), true);
assert.equal(winTable.rows[0].stake, 1200);
assert.equal(winTable.rows[1].kind, "Market");
assert.equal(winTable.rows[1].when.includes("Oct"), true);
assert.deepEqual(winTable.caption, ["day", "overall"]);
assert.deepEqual(winTable.columns.map((column) => column.id), ["rank", "trader", "win", "pnl"]);

const winBars = leaderboardBarRows(
  [
    { win_rank: "2", user_name: "Sassy-Bucket", pnl: "9.1K", event_title: "Georgia vs Alabama" },
    { win_rank: "1", user_name: "HomeRunHazard", pnl: "20.4K", event_title: "Cleveland Guardians vs. Chicago White Sox: O/U 8.5" },
  ],
  biggestWins,
  10,
);
assert.equal(winBars[0].name.startsWith("HomeRunHazard · "), true);
assert.equal(winBars[0].name.includes("Cleveland"), true);
assert.equal(winBars[0].short, "HomeRunHazard");
assert.equal(winBars[0].value, 20400);
assert.equal(winBars[1].short, "Sassy-Bucket");

console.log("datasetPreset.node.test.js ok");
