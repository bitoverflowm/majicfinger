import { defaultOrderBookCharts, isOrderBookSheet } from "@/components/dashboardComposer/orderBookLadder";
import { columnKey, countObservations, describeSheet, sheetRecords } from "@/lib/visualizations/datasetDescriptor";
import { statCardBlockHeight } from "@/lib/visualizations/marketPriceCards";
import { defaultActivityCharts } from "@/lib/visualizations/activityCharts";
import { resolveVisualization } from "@/lib/visualizations/presetRegistry";
import { isChainlinkStreamSheet } from "@/lib/chainlinkFeeds";

/** Views that stay on the sheet. They are not spawned as chart blocks. */
const SHEET_ONLY = new Set(["", "table", "activity", "scatter", "visual-table"]);

/**
 * The default chart blocks for one sheet.
 * Activity and order books open their pair. A table-only sheet opens none.
 * @param {object | null | undefined} sheet
 * @param {string} [forcedView]
 * @returns {Array<{ chartView: string, title: string, w: number, h: number }>}
 */
export function chartSpecsForSheet(sheet, forcedView) {
  const dataset = describeSheet(sheet);
  const resolved = resolveVisualization(dataset, {
    columnIds: (sheet?.columns || []).map((column) => columnKey(column)).filter(Boolean),
    observations: dataset ? countObservations(sheet, dataset) : undefined,
  });
  const base = String(sheet?.title || "Sheet").replace(/\s+chart$/, "").trim() || "Sheet";
  const requested = String(forcedView || "").trim();
  if ((!requested && isChainlinkStreamSheet(sheet)) || requested === "liveline") {
    return [{ chartView: "liveline", title: `${base} chart`, w: 680, h: 440 }];
  }
  const orderBook = !requested && (dataset?.datasetType === "orderbook" || isOrderBookSheet(sheet));
  if (!requested && dataset?.datasetType === "trader_activity") return defaultActivityCharts(base);
  if (orderBook) return defaultOrderBookCharts(base);
  const chartView = requested || (resolved.view === "table" ? "" : resolved.view);
  if (!requested && SHEET_ONLY.has(chartView)) return [];
  const statCards = chartView === "stat-cards";
  const columnIds = new Set((sheet?.columns || []).map((column) => columnKey(column)));
  const outcomeTrades =
    columnIds.has("outcome") ||
    (columnIds.has("yes_price") && columnIds.has("no_price")) ||
    (columnIds.has("yes_price_dollars") && columnIds.has("no_price_dollars"));
  const outcomeLines = chartView === "price" || (chartView === "trade-price" && (String(sheet?.table || "") === "getTradesByMarket" || outcomeTrades));
  return [
    {
      chartView,
      title: statCards
        ? `${base} stats card`
        : chartView === "order-book" && /^order\s*books?/i.test(base)
          ? base
          : `${base} chart`,
      w: chartView === "portfolio" ? 680 : outcomeLines ? 820 : 540,
      h: chartView === "portfolio" ? 560 : outcomeLines ? 500 : statCards ? statCardBlockHeight(sheetRecords(sheet).length) : 360,
    },
  ];
}
