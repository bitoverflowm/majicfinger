import assert from "node:assert/strict";
import { describeSheet } from "./datasetDescriptor.js";
import { hasVisualTable, resolveVisualization, visualPresentationLabel } from "./presetRegistry.js";
import { chartSpecsForSheet } from "./sheetCharts.js";
import { marketPriceCards, snapshotStatCards, statCardBlockHeight } from "./marketPriceCards.js";
import { formatVolume, layoutVolumeTiles, volumeLabel, volumeTreemapModel } from "./volumeTreemap.js";
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

const kalshiLiveSeriesSheet = {
  type: "sheet",
  title: "Series",
  table: "series",
  integrationId: "kalshiLive",
  columns: ["ticker", "title", "category", "frequency", "volume_fp"].map((id) => ({ id })),
  records: [
    { ticker: "KXFED", title: "Fed rate", category: "Economics", frequency: "custom", volume_fp: 6020587 },
    { ticker: "KXMLB", title: "MLB game", category: "Sports", frequency: "daily", volume_fp: 3431369 },
    { ticker: "KXNEW", title: "New series", category: "Politics", frequency: "one_off", volume_fp: 0 },
  ],
};
const kalshiLiveSeries = describeSheet(kalshiLiveSeriesSheet);
assert.equal(kalshiLiveSeries.fields.value, "volume_fp");
assert.equal(kalshiLiveSeries.units.volume, "contracts");
assert.equal(volumeLabel(kalshiLiveSeries), "Volume");
assert.equal(formatVolume(6020587, kalshiLiveSeries), "6M");
assert.equal(hasVisualTable(kalshiLiveSeries), true);
assert.equal(visualPresentationLabel(kalshiLiveSeries), "Rich Table");
assert.deepEqual(chartSpecsForSheet(kalshiLiveSeriesSheet).map((chart) => chart.chartView), ["treemap"]);
assert.deepEqual(
  volumeTreemapModel(kalshiLiveSeriesSheet, kalshiLiveSeries).tiles.map((tile) => [tile.label, tile.value]),
  [["Fed rate", 6020587], ["MLB game", 3431369], ["New series", 0]],
);
const savedKalshiSeries = {
  ...kalshiLiveSeriesSheet,
  dataset: { datasetType: "series", sourceTable: "series", fields: { market: "ticker", label: "title", category: "category" }, seriesKeys: ["ticker"], required: ["ticker"] },
};
assert.equal(describeSheet(savedKalshiSeries).fields.value, "volume_fp");
assert.deepEqual(chartSpecsForSheet(savedKalshiSeries).map((chart) => chart.chartView), ["treemap"]);
const oneKalshiSeries = { ...kalshiLiveSeriesSheet, records: [kalshiLiveSeriesSheet.records[0]] };
assert.equal(resolveVisualization(describeSheet(oneKalshiSeries), { columnIds: ["ticker", "title", "volume_fp"] }).view, "overview");

const kalshiLiveEventsSheet = {
  type: "sheet",
  title: "Events",
  table: "events",
  integrationId: "kalshiLive",
  columns: ["event_ticker", "series_ticker", "title", "event_status", "volume_fp", "volume_24h_fp", "open_interest_fp"].map((id) => ({ id })),
  records: [
    { event_ticker: "KXFED-26DEC", series_ticker: "KXFED", title: "Fed decision in December", event_status: "open", volume_fp: 4200000, volume_24h_fp: 12000, open_interest_fp: 800000 },
    { event_ticker: "KXMLB-26OCT18", series_ticker: "KXMLB", title: "Yankees vs Dodgers", event_status: "closed", volume_fp: 950000, volume_24h_fp: 0, open_interest_fp: 0 },
    { event_ticker: "KXNEW-27", series_ticker: "KXNEW", title: "New event", event_status: "unopened", volume_fp: 0, volume_24h_fp: 0, open_interest_fp: 0 },
  ],
};
const kalshiLiveEvents = describeSheet(kalshiLiveEventsSheet);
assert.equal(kalshiLiveEvents.fields.value, "volume_fp");
assert.equal(kalshiLiveEvents.fields.status, "event_status");
assert.equal(kalshiLiveEvents.units.volume, "contracts");
assert.equal(volumeLabel(kalshiLiveEvents), "Volume");
assert.equal(formatVolume(4200000, kalshiLiveEvents), "4.2M");
assert.equal(hasVisualTable(kalshiLiveEvents), true);
assert.equal(visualPresentationLabel(kalshiLiveEvents), "Rich Table");
assert.deepEqual(chartSpecsForSheet(kalshiLiveEventsSheet).map((chart) => chart.chartView), ["treemap"]);
assert.deepEqual(
  volumeTreemapModel(kalshiLiveEventsSheet, kalshiLiveEvents).tiles.map((tile) => [tile.label, tile.value]),
  [["Fed decision in December", 4200000], ["Yankees vs Dodgers", 950000], ["New event", 0]],
);
const oneKalshiEvent = { ...kalshiLiveEventsSheet, records: [kalshiLiveEventsSheet.records[0]] };
assert.equal(resolveVisualization(describeSheet(oneKalshiEvent), { columnIds: kalshiLiveEventsSheet.columns.map((column) => column.id) }).view, "overview");
const oldKalshiEventsSheet = {
  ...kalshiLiveEventsSheet,
  columns: ["event_ticker", "series_ticker", "title", "sub_title"].map((id) => ({ id })),
  dataset: { datasetType: "events", sourceTable: "events", fields: { market: "event_ticker", label: "title", value: "volume_fp" }, seriesKeys: ["event_ticker"], required: ["event_ticker"] },
};
const oldKalshiEvents = describeSheet(oldKalshiEventsSheet);
assert.equal(oldKalshiEvents.fields.value, undefined);
assert.equal(hasVisualTable(oldKalshiEvents), true);
assert.equal(chartSpecsForSheet(oldKalshiEventsSheet).length, 0);

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

const kalshiLakeMarkets = {
  type: "sheet",
  title: "Kalshi markets",
  table: "markets",
  integrationId: "kalshiHistorical",
  columns: ["ticker", "title", "status", "last_price", "yes_bid", "volume", "close_time"].map((id) => ({ id })),
  records: [
    { ticker: "KXFED-26DEC-T4.00", title: "Fed above 4.00%?", status: "finalized", volume: "18234012", open_interest: "120400" },
    { ticker: "KXFED-26DEC-T3.75", title: "Fed above 3.75%?", status: "active", volume: "2210400", open_interest: "56000" },
  ],
};
const kalshiLakeDataset = describeSheet(kalshiLakeMarkets);
assert.equal(kalshiLakeDataset.datasetType, "markets");
assert.equal(kalshiLakeDataset.fields.value, "volume");
assert.equal(kalshiLakeDataset.units.volume, "contracts");
assert.equal(volumeLabel(kalshiLakeDataset), "Volume");
assert.equal(formatVolume(18234012, kalshiLakeDataset), "18.2M");
assert.equal(formatVolume(18234012, lakeMarketsDataset), "$18.2M");
assert.equal(hasVisualTable(kalshiLakeDataset), true);
assert.equal(visualPresentationLabel(kalshiLakeDataset), "Rich Table");
assert.deepEqual(chartSpecsForSheet(kalshiLakeMarkets).map((chart) => chart.chartView), ["treemap"]);
assert.deepEqual(volumeTreemapModel(kalshiLakeMarkets, kalshiLakeDataset).tiles.map((tile) => tile.label), ["Fed above 4.00%?", "Fed above 3.75%?"]);
const savedBeforeUnits = {
  ...kalshiLakeMarkets,
  dataset: { ...kalshiLakeDataset, units: { price: "probability", quantity: "contracts", currency: "USD", metric: "probability" } },
};
assert.equal(describeSheet(savedBeforeUnits).units.volume, "contracts");
const kalshiLiveSheet = {
  type: "sheet",
  title: "Kalshi Live markets",
  table: "markets",
  integrationId: "kalshiLive",
  columns: ["ticker", "yes_sub_title", "status", "volume_fp", "volume_24h_fp", "open_interest_fp"].map((id) => ({ id })),
  records: [
    { ticker: "KXHIGHNY-26OCT17-B70", yes_sub_title: "70° to 71°", status: "initialized", volume_fp: "0.00", volume_24h_fp: "0.00", open_interest_fp: "0.00" },
    { ticker: "KXHIGHNY-26OCT17-B72", yes_sub_title: "72° to 73°", status: "initialized", volume_fp: "0.00", volume_24h_fp: "0.00", open_interest_fp: "0.00" },
    { ticker: "KXHIGHNY-26OCT17-T74", yes_sub_title: "", status: "initialized", volume_fp: "0.00", volume_24h_fp: "0.00", open_interest_fp: "0.00" },
  ],
};
const kalshiLiveMarkets = describeSheet(kalshiLiveSheet);
assert.equal(kalshiLiveMarkets.fields.value, "volume_24h_fp");
assert.equal(kalshiLiveMarkets.units.volume, "contracts");
assert.equal(volumeLabel(kalshiLiveMarkets), "24h volume");
assert.deepEqual(chartSpecsForSheet(kalshiLiveSheet).map((chart) => chart.chartView), ["treemap"]);
const kalshiLiveModel = volumeTreemapModel(kalshiLiveSheet, kalshiLiveMarkets);
assert.deepEqual(kalshiLiveModel.tiles.map((tile) => tile.label), ["70° to 71°", "72° to 73°", "KXHIGHNY-26OCT17-T74"]);
assert.deepEqual(kalshiLiveModel.tiles.map((tile) => tile.value), [0, 0, 0]);
assert.equal(kalshiLiveModel.tiles[0].detail, "KXHIGHNY-26OCT17-B70");
assert.equal(kalshiLiveModel.tiles[2].detail, undefined);
assert.equal(kalshiLiveModel.basis, undefined);
const closedEventSheet = {
  ...kalshiLiveSheet,
  records: [
    { ticker: "KXFED-26SEP-T4.00", yes_sub_title: "Above 4.00%", status: "finalized", volume_fp: "1200.00", volume_24h_fp: "0.00" },
    { ticker: "KXFED-26SEP-T3.75", yes_sub_title: "Above 3.75%", status: "finalized", volume_fp: "4800.00", volume_24h_fp: "0.00" },
  ],
};
const closedEventModel = volumeTreemapModel(closedEventSheet, describeSheet(closedEventSheet));
assert.equal(closedEventModel.basis, "total");
assert.deepEqual(closedEventModel.tiles.map((tile) => [tile.label, tile.value]), [["Above 3.75%", 4800], ["Above 4.00%", 1200]]);
const staleLive = { ...kalshiLiveSheet, dataset: { ...kalshiLiveMarkets, fields: { market: "ticker", label: "title", value: "volume_fp" } } };
assert.deepEqual(chartSpecsForSheet(staleLive).map((chart) => chart.chartView), ["treemap"]);

const quiet = layoutVolumeTiles(kalshiLiveModel.tiles.map((tile) => ({ ...tile, weight: tile.value })), 300, 200);
assert.equal(quiet.length, 3);
assert.ok(quiet.every((tile) => Math.abs(tile.w * tile.h - 20000) < 1));
const mixed = layoutVolumeTiles(
  [
    { label: "Busy", weight: 900, value: 900 },
    { label: "Some", weight: 100, value: 100 },
    { label: "New A", weight: 0, value: 0 },
    { label: "New B", weight: 0, value: 0 },
  ],
  526,
  275,
);
assert.deepEqual(mixed.map((tile) => tile.label).sort(), ["Busy", "New A", "New B", "Some"]);
assert.ok(mixed.every((tile) => tile.w > 0 && tile.h > 0));

const kalshiLakeTrades = {
  type: "sheet",
  title: "Trades · KXFED-26DEC-T4.00",
  table: "trades",
  integrationId: "kalshiHistorical",
  pull: { lake: "kalshi", table: "trades", ticker: "KXFED-26DEC-T4.00" },
  columns: ["created_time", "ticker", "taker_side", "yes_price", "no_price", "count", "trade_id", "_fetched_at"].map((id) => ({ id })),
  records: [
    { created_time: "1790812800000000000", ticker: "KXFED-26DEC-T4.00", taker_side: "yes", yes_price: 62, no_price: 38, count: 5 },
    { created_time: "1790812860000000000", ticker: "KXFED-26DEC-T4.00", taker_side: "no", yes_price: 60, no_price: 40, count: 3 },
  ],
};
const kalshiTradeDataset = describeSheet(kalshiLakeTrades);
assert.equal(kalshiTradeDataset.fields.size, "count");
const kalshiTradeCharts = chartSpecsForSheet(kalshiLakeTrades);
assert.deepEqual(kalshiTradeCharts.map((chart) => chart.chartView), ["trade-price"]);
assert.equal(kalshiTradeCharts[0].w, lakeTradeCharts[0].w);
assert.equal(volumeLabel(seriesDataset), "24h volume");

const kalshiLiveTrades = {
  type: "sheet",
  title: "Trades · KXFED-26DEC-T4.00",
  table: "trades",
  integrationId: "kalshiLive",
  columns: ["created_time", "ticker", "taker_outcome_side", "yes_price_dollars", "no_price_dollars", "count_fp"].map((id) => ({ id })),
  records: [
    { created_time: "2026-10-04T15:00:00Z", ticker: "KXFED-26DEC-T4.00", taker_outcome_side: "yes", yes_price_dollars: "0.6200", no_price_dollars: "0.3800", count_fp: "5.00" },
    { created_time: "2026-10-04T15:01:00Z", ticker: "KXFED-26DEC-T4.00", taker_outcome_side: "no", yes_price_dollars: "0.6000", no_price_dollars: "0.4000", count_fp: "3.00" },
  ],
};
const kalshiLiveDataset = describeSheet(kalshiLiveTrades);
assert.equal(kalshiLiveDataset.fields.price, "yes_price_dollars");
assert.equal(kalshiLiveDataset.fields.size, "count_fp");
const kalshiLiveTradeCharts = chartSpecsForSheet(kalshiLiveTrades);
assert.deepEqual(kalshiLiveTradeCharts.map((chart) => chart.chartView), ["trade-price"]);
assert.equal(kalshiLiveTradeCharts[0].w, lakeTradeCharts[0].w);
assert.equal(kalshiLiveTradeCharts[0].h, lakeTradeCharts[0].h);
const staleLiveTrades = {
  ...kalshiLiveTrades,
  dataset: { ...kalshiLiveDataset, fields: { ...kalshiLiveDataset.fields, price: "yes_price", size: "count" } },
};
assert.equal(describeSheet(staleLiveTrades).fields.price, "yes_price_dollars");
assert.deepEqual(chartSpecsForSheet(staleLiveTrades).map((chart) => chart.chartView), ["trade-price"]);

console.log("sheet charts ok");
