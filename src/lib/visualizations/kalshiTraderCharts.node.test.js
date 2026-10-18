import assert from "node:assert/strict";
import { describeSheet, stampDataset } from "./datasetDescriptor.js";
import { hasVisualTable, visualPresentationLabel } from "./presetRegistry.js";
import { chartSpecsForSheet } from "./sheetCharts.js";
import { buildVisualTable, leaderboardBarRows } from "./visualTable.js";
import { positionsSizedByContracts, zeroValueSummary } from "./portfolioTreemap.js";

const trades = {
  type: "sheet",
  title: "hkin's trades",
  integrationId: "kalshi-live",
  table: "trades_by_holder",
  columns: ["create_date", "ticker", "trader_nickname", "trader_side", "trader_action", "trader_price", "count_fp", "notional", "activity_type"].map((id) => ({ id })),
  records: [
    { create_date: "2026-10-18T11:22:13Z", ticker: "KXEPL-ARS", trader_nickname: "hkin", trader_side: "YES", trader_action: "BUY", trader_price: 0.61, count_fp: 6.38, notional: 3.89, activity_type: "TRADE" },
    { create_date: "2026-10-17T09:00:00Z", ticker: "KXFED-26DEC", trader_nickname: "hkin", trader_side: "NO", trader_action: "BUY", trader_price: 0.92, count_fp: 100, notional: 92, activity_type: "TRADE" },
  ],
};
const tradesDataset = describeSheet(trades);
assert.equal(tradesDataset.datasetType, "trader_activity");
assert.equal(tradesDataset.fields.value, "notional");
assert.equal(hasVisualTable(tradesDataset), true);
assert.equal(visualPresentationLabel(tradesDataset), "Rich Table");
assert.deepEqual(chartSpecsForSheet(trades).map((chart) => chart.chartView), ["activity-calendar", "activity-stack"]);

const positions = {
  type: "sheet",
  title: "BitcoinTradingChallenge's positions",
  integrationId: "kalshi-live",
  table: "holder_positions",
  columns: ["nickname", "market_ticker", "side", "position", "pnl", "status", "event_ticker"].map((id) => ({ id })),
  records: [
    { nickname: "BitcoinTradingChallenge", market_ticker: "KXGAME-26SEP28-SLV", side: "NO", position: 125744, pnl: 1322.01, status: "open", event_ticker: "KXGAME-26SEP28" },
    { nickname: "BitcoinTradingChallenge", market_ticker: "KXFED-26DEC-T4.00", side: "YES", position: 300, pnl: -12.5, status: "open", event_ticker: "KXFED-26DEC" },
  ],
};
const positionsDataset = describeSheet(positions);
assert.equal(positionsDataset.datasetType, "trader_positions");
assert.equal(positionsSizedByContracts(positionsDataset), true);
assert.equal(visualPresentationLabel(positionsDataset), "Visual Table");
assert.ok(chartSpecsForSheet(positions).length > 0);
const log = buildVisualTable(positions.records, positionsDataset);
assert.deepEqual(log.columns.map((column) => column.label), ["Position", "Status", "Contracts", "P&L"]);
assert.deepEqual(log.caption, ["BitcoinTradingChallenge"]);
assert.equal(log.rows[0].market, "KXGAME-26SEP28-SLV");
assert.equal(log.rows[0].outcome, "NO");
assert.equal(zeroValueSummary([{ pnl: 2 }, { pnl: -1 }], { contracts: true }).startsWith("2 positions with no contracts"), true);
assert.equal(zeroValueSummary([{ pnl: 2 }]).includes("USDC unrealized"), true);

const leaderboardSheet = (metric) => ({
  type: "sheet",
  integrationId: "kalshi-live",
  table: "leaderboard",
  pull: { table: "leaderboard", metric, timePeriod: "all_time" },
  columns: ["rank", "nickname", "value", "metric_name"].map((id) => ({ id })),
  records: [
    { rank: 1, nickname: "Ada", value: 120000, metric_name: metric },
    { rank: 2, nickname: "Bea", value: 90000, metric_name: metric },
  ],
});
assert.equal(describeSheet(leaderboardSheet("projected_pnl")).units.metric, "usdc");
assert.equal(describeSheet(leaderboardSheet("dollars_traded")).units.metric, "usdc");
assert.equal(describeSheet(leaderboardSheet("volume")).units.metric, "rank_metric");
assert.equal(stampDataset(leaderboardSheet("projected_pnl")).dataset.units.metric, "usdc");
const unpulled = leaderboardSheet("projected_pnl");
delete unpulled.pull;
assert.equal(describeSheet(unpulled).units.metric, "usdc");
assert.deepEqual(
  leaderboardBarRows(leaderboardSheet("projected_pnl").records, describeSheet(leaderboardSheet("projected_pnl"))).map((row) => row.name),
  ["Ada", "Bea"],
);

const profile = {
  type: "sheet",
  title: "Ada's profile",
  integrationId: "kalshi-live",
  table: "holder_profile",
  columns: ["nickname", "pnl", "dollars_traded", "num_markets_traded"].map((id) => ({ id })),
  records: [{ nickname: "Ada", pnl: 8237017.9, dollars_traded: 65965419.75, num_markets_traded: 23271 }],
};
const profileDataset = describeSheet(profile);
assert.equal(profileDataset.datasetType, "leaderboard");
assert.equal(profileDataset.units.metric, "usdc");
assert.equal(profileDataset.fields.value, "pnl");

console.log("kalshi trader charts ok");
