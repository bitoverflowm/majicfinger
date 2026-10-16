import assert from "node:assert/strict";
import { describeSheet } from "./datasetDescriptor.js";
import { hasVisualTable, resolveVisualization, visualPresentationLabel } from "./presetRegistry.js";
import { chartSpecsForSheet } from "./sheetCharts.js";
import { marketPriceCards, snapshotStatCards, statCardBlockHeight } from "./marketPriceCards.js";
import { layoutVolumeTiles, volumeLabel, volumeTreemapModel } from "./volumeTreemap.js";
import { parseVisualNumber } from "./visualTable.js";

assert.equal(parseVisualNumber("2.35065166637259E8"), 235065166.637259);
assert.equal(parseVisualNumber("1.5e-3"), 0.0015);
assert.equal(parseVisualNumber("$1,200"), 1200);
assert.equal(parseVisualNumber("361.5K"), 361500);
assert.equal(parseVisualNumber("55¢"), 55);
assert.equal(parseVisualNumber("\u22124.2M"), -4200000);
assert.equal(parseVisualNumber(42), 42);
assert.equal(parseVisualNumber("0x4bFb41d5"), null);
assert.equal(parseVisualNumber(""), null);
assert.equal(parseVisualNumber(Number.NaN), null);

const orderBook = chartSpecsForSheet({
  type: "sheet",
  title: "Orderbook(s) · Example",
  table: "getOrderbooks",
  columns: [{ id: "side" }, { id: "price" }, { id: "size" }, { id: "outcome" }],
});
assert.deepEqual(
  orderBook.map((chart) => chart.chartView),
  ["order-book", "depth"],
);

const activity = chartSpecsForSheet({
  type: "sheet",
  title: "Zoomify's activity",
  table: "getTraderActivity",
  integrationId: "polymarket",
  columns: [{ id: "timestamp" }, { id: "type" }, { id: "usdcSize" }],
  records: [{ timestamp: 1, type: "TRADE", usdcSize: 2 }],
});
assert.deepEqual(
  activity.map((chart) => chart.chartView),
  ["activity-calendar", "activity-stack"],
);

const plain = chartSpecsForSheet({
  type: "sheet",
  title: "Notes",
  columns: [{ id: "name" }, { id: "note" }],
  records: [{ name: "A", note: "hello" }],
});
assert.equal(plain.length, 0);

const series = {
  type: "sheet",
  title: "Series",
  table: "series",
  integrationId: "polymarket",
  columns: [
    { id: "series:id" },
    { id: "series:title" },
    { id: "series:volume24hr" },
    { id: "series:volume" },
  ],
  records: [
    { "series:id": "1", "series:title": "NFL", "series:volume24hr": 100, "series:volume": 900 },
    { "series:id": "2", "series:title": "NBA", "series:volume24hr": 40, "series:volume": 200 },
  ],
};
const seriesDataset = describeSheet(series);
assert.equal(hasVisualTable(seriesDataset), true);
assert.equal(visualPresentationLabel(seriesDataset), "Rich Table");
assert.equal(
  resolveVisualization(seriesDataset, { columnIds: series.columns.map((column) => column.id) }).view,
  "treemap",
);
assert.deepEqual(chartSpecsForSheet(series).map((chart) => chart.chartView), ["treemap"]);
assert.deepEqual(
  volumeTreemapModel(series, seriesDataset).tiles.map((tile) => tile.label),
  ["NFL", "NBA"],
);
const laid = layoutVolumeTiles(
  [
    { label: "FOMC", weight: 6020587, value: 6020587 },
    { label: "MLB", weight: 3431369, value: 3431369 },
    { label: "UFC", weight: 27575, value: 27575 },
    { label: "NFL", weight: 7944, value: 7944 },
    { label: "EPL", weight: 250, value: 250 },
    { label: "NBA", weight: 11, value: 11 },
  ],
  526,
  275,
);
assert.equal(laid.length, 6);
assert.ok(laid.every((tile) => tile.w >= 72 && tile.h >= 28));

const oneSeries = { ...series, records: [series.records[0]] };
assert.equal(
  resolveVisualization(describeSheet(oneSeries), { columnIds: oneSeries.columns.map((column) => column.id) }).view,
  "overview",
);

const staleSeries = {
  ...series,
  dataset: {
    datasetType: "series",
    sourceTable: "series",
    fields: { market: "id", label: "title", category: "category" },
    seriesKeys: ["id"],
    required: ["title"],
  },
};
const refreshed = describeSheet(staleSeries);
assert.equal(refreshed.fields.label, "series:title");
assert.equal(refreshed.fields.value, "series:volume24hr");
assert.equal(refreshed.seriesCount, 2);
assert.equal(
  resolveVisualization(refreshed, { columnIds: staleSeries.columns.map((column) => column.id) }).view,
  "treemap",
);
assert.deepEqual(chartSpecsForSheet(staleSeries).map((chart) => chart.chartView), ["treemap"]);

const kalshiSeries = describeSheet({
  type: "sheet",
  table: "series",
  integrationId: "kalshi",
  columns: [{ id: "ticker" }, { id: "title" }],
  records: [
    { ticker: "A", title: "Alpha" },
    { ticker: "B", title: "Beta" },
  ],
});
assert.equal(hasVisualTable(kalshiSeries), false);
assert.equal(resolveVisualization(kalshiSeries, { columnIds: ["ticker", "title"] }).view, "overview");

const marketPrices = {
  type: "sheet",
  title: "Market Price",
  table: "getMarketPrices",
  integrationId: "polymarket",
  columns: [
    { id: "market_title" },
    { id: "outcome" },
    { id: "buy_price" },
    { id: "sell_price" },
    { id: "token_id" },
  ],
  records: [
    { market_title: "FOMC hike", outcome: "Yes", buy_price: 0.62, sell_price: 0.64, token_id: "yes" },
    { market_title: "FOMC hike", outcome: "No", buy_price: 0.36, sell_price: 0.38, token_id: "no" },
  ],
  dataset: {
    datasetType: "quote",
    sourceTable: "getMarketPrices",
    priceBasis: "source",
    fields: { market: "token_id", outcome: "outcome", bid: "bid", ask: "ask" },
    seriesKeys: ["token_id"],
    required: ["token_id"],
  },
};
const priced = describeSheet(marketPrices);
const barePrices = {
  type: "sheet",
  title: "Market Price",
  table: "getMarketPrices",
  columns: marketPrices.columns,
  records: marketPrices.records,
};
assert.equal(describeSheet(barePrices).priceBasis, "market");
assert.deepEqual(chartSpecsForSheet(barePrices).map((chart) => chart.chartView), ["stat-cards"]);

assert.equal(priced.priceBasis, "market");
assert.equal(priced.fields.value, "buy_price");
assert.equal(resolveVisualization(priced, { columnIds: marketPrices.columns.map((column) => column.id) }).view, "stat-cards");
const priceCharts = chartSpecsForSheet(marketPrices);
assert.deepEqual(priceCharts.map((chart) => chart.chartView), ["stat-cards"]);
assert.equal(priceCharts[0].h, statCardBlockHeight(2));
const cards = marketPriceCards(marketPrices, priced);
assert.equal(cards.length, 2);
assert.equal(cards[0].label, "FOMC hike");
assert.equal(cards[0].format(), "62.0¢");
assert.equal(cards[0].caption, "Yes · Sell 64.0¢ · Spread 2.0¢");
assert.equal(cards[1].caption, "No · Sell 38.0¢ · Spread 2.0¢");
assert.equal(priceCharts[0].title, "Market Price stats card");

function snapshotSheet(table, columns, records) {
  return {
    type: "sheet",
    title: table,
    table,
    integrationId: "polymarket",
    columns: columns.map((id) => ({ id })),
    records,
  };
}

const midpoint = snapshotSheet(
  "getMidpointPrices",
  ["market_title", "outcome", "midpoint_price", "token_id"],
  [{ market_title: "Fed decision", outcome: "Yes", midpoint_price: 0.735, token_id: "yes" }],
);
const midpointDescribed = describeSheet(midpoint);
assert.equal(midpointDescribed.fields.value, "midpoint_price");
assert.equal(resolveVisualization(midpointDescribed, { columnIds: midpoint.columns.map((column) => column.id) }).view, "stat-cards");
assert.deepEqual(chartSpecsForSheet(midpoint).map((chart) => chart.chartView), ["stat-cards"]);
assert.equal(chartSpecsForSheet(midpoint)[0].title, "getMidpointPrices stats card");
assert.equal(snapshotStatCards(midpoint, midpointDescribed)[0].format(), "73.5¢");
assert.equal(snapshotStatCards(midpoint, midpointDescribed)[0].caption, "Yes");

const spreads = snapshotSheet(
  "getSpreads",
  ["market_title", "outcome", "spread", "token_id"],
  [{ market_title: "Fed decision", outcome: "Yes", spread: 0.01, token_id: "yes" }],
);
assert.equal(resolveVisualization(describeSheet(spreads), { columnIds: ["market_title", "outcome", "spread", "token_id"] }).view, "stat-cards");
assert.equal(snapshotStatCards(spreads, describeSheet(spreads))[0].format(), "1.0¢");

const ticks = snapshotSheet(
  "getTickSize",
  ["market_title", "outcome", "minimum_tick_size", "token_id"],
  [{ market_title: "Fed decision", outcome: "No", minimum_tick_size: 0.001, token_id: "no" }],
);
assert.equal(resolveVisualization(describeSheet(ticks), { columnIds: ["market_title", "outcome", "minimum_tick_size", "token_id"] }).view, "stat-cards");
assert.equal(snapshotStatCards(ticks, describeSheet(ticks))[0].format(), "0.1¢");
assert.equal(snapshotStatCards(ticks, describeSheet(ticks))[0].label, "Fed decision");

const lastTrade = snapshotSheet(
  "getLastTradePrices",
  ["market_title", "outcome", "last_trade_price", "last_trade_side", "token_id"],
  [{ market_title: "Fed decision", outcome: "Yes", last_trade_price: 0.74, last_trade_side: "BUY", token_id: "yes" }],
);
const lastDescribed = describeSheet(lastTrade);
assert.equal(lastDescribed.priceBasis, "trade");
assert.equal(resolveVisualization(lastDescribed, { columnIds: lastTrade.columns.map((column) => column.id) }).view, "stat-cards");
assert.deepEqual(chartSpecsForSheet(lastTrade).map((chart) => chart.chartView), ["stat-cards"]);
const lastCards = snapshotStatCards(lastTrade, lastDescribed);
assert.equal(lastCards[0].format(), "74.0¢");
assert.equal(lastCards[0].caption, "Yes · BUY");

const priceHistory = chartSpecsForSheet({
  type: "sheet",
  title: "Price History",
  table: "getBatchPricesHistory",
  integrationId: "polymarket",
  columns: [{ id: "outcome" }, { id: "t" }, { id: "p" }],
  records: [
    { outcome: "Yes", t: 1791452719, p: 0.03 },
    { outcome: "Yes", t: 1791452844, p: 0.04 },
  ],
});
assert.deepEqual(priceHistory.map((chart) => chart.chartView), ["price"]);
assert.ok(priceHistory[0].w > 540);
assert.ok(priceHistory[0].h > 360);

const tokenHistory = chartSpecsForSheet({
  type: "sheet",
  title: "Token Price History",
  table: "getTokenPriceHistory",
  columns: [{ id: "outcome" }, { id: "observed_at" }, { id: "price" }, { id: "timestamp" }],
  records: [
    { outcome: "Yes", observed_at: "2026-10-01T00:00:00.000Z", price: 0.4, timestamp: "1790812800" },
    { outcome: "No", observed_at: "2026-10-01T00:00:00.000Z", price: 0.6, timestamp: "1790812800" },
  ],
});
assert.deepEqual(tokenHistory.map((chart) => chart.chartView), ["price"]);
assert.equal(tokenHistory[0].w, priceHistory[0].w);
assert.equal(tokenHistory[0].h, priceHistory[0].h);

const tradeRecords = Array.from({ length: 12 }, (_, index) => ({
  observed_at: new Date(Date.UTC(2026, 9, 1, index)).toISOString(),
  outcome: index % 2 ? "No" : "Yes",
  side: "BUY",
  price: 0.5,
  size: 10,
  title: "Fed decision",
}));
const tradeColumns = ["observed_at", "outcome", "side", "price", "size", "title"].map((id) => ({ id }));
const polymarketTrades = chartSpecsForSheet({ type: "sheet", title: "Trade History", table: "getTradesByMarket", columns: tradeColumns, records: tradeRecords });
assert.deepEqual(polymarketTrades.map((chart) => chart.chartView), ["trade-price"]);
assert.equal(polymarketTrades[0].w, priceHistory[0].w);
assert.equal(polymarketTrades[0].h, priceHistory[0].h);

const lakeFills = {
  type: "sheet",
  title: "Trades · will-lula-win",
  table: "trades",
  integrationId: "polymarketHistorical",
  pull: { lake: "polymarket", table: "trades", ticker: "0xabc" },
  columns: ["timestamp", "outcome", "side", "price", "size", "usdc_amount", "maker_amount", "taker_amount", "fee"].map((id) => ({ id })),
  records: tradeRecords.map((row, index) => ({ timestamp: 1790812800 + index, outcome: row.outcome, side: "BUY", price: 0.5, size: 10, usdc_amount: 5 })),
};
const lakeTradeCharts = chartSpecsForSheet(lakeFills);
assert.deepEqual(lakeTradeCharts.map((chart) => chart.chartView), ["trade-price"]);
assert.equal(lakeTradeCharts[0].w, priceHistory[0].w);

const lakeMarkets = {
  type: "sheet",
  title: "Polymarket markets",
  table: "markets",
  integrationId: "polymarketHistorical",
  columns: ["question", "volume", "liquidity", "closed"].map((id) => ({ id })),
  records: [
    { question: "Will Lula win?", volume: 14900000, liquidity: 570900, closed: false },
    { question: "Will Xi leave?", volume: 2100000, liquidity: 80000, closed: true },
  ],
};
const lakeMarketsDataset = describeSheet(lakeMarkets);
assert.equal(lakeMarketsDataset.fields.value, "volume");
assert.equal(lakeMarketsDataset.seriesCount, 2);
assert.equal(volumeLabel(lakeMarketsDataset), "Volume");
assert.equal(visualPresentationLabel(lakeMarketsDataset), "Rich Table");
assert.deepEqual(chartSpecsForSheet(lakeMarkets).map((chart) => chart.chartView), ["treemap"]);
assert.deepEqual(volumeTreemapModel(lakeMarkets, lakeMarketsDataset).tiles.map((tile) => tile.value), [14900000, 2100000]);

const athenaMarkets = {
  ...lakeMarkets,
  records: [
    { question: "Fed cuts in December?", volume: "2.35065166637259E8", liquidity: "1.2E6", closed: false },
    { question: "Fed holds in December?", volume: "8812345.5", liquidity: "64000", closed: false },
  ],
};
const athenaDataset = describeSheet(athenaMarkets);
assert.equal(athenaDataset.fields.value, "volume");
assert.deepEqual(chartSpecsForSheet(athenaMarkets).map((chart) => chart.chartView), ["treemap"]);
assert.deepEqual(volumeTreemapModel(athenaMarkets, athenaDataset).tiles.map((tile) => tile.value), [235065166.637259, 8812345.5]);
assert.equal(volumeLabel(seriesDataset), "24h volume");

console.log("sheet charts ok");
