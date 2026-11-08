import { polymarketLiveBuildColumns } from "@/components/dashboardComposer/polymarketLiveBuild";
import { lifePull } from "@/lib/markets/marketLife";
import { RECIPE_POLYMARKET_TRADE_HISTORY, RECIPE_TRADE_ROW_LIMIT } from "@/lib/dataLake/recipeLakeAccess";
import { TRADER_ACTIVITY_ENDPOINT_ID } from "@/lib/polymarketLive/traderActivityCompose";
import { TRADER_BY_ADDRESS_ENDPOINT_ID } from "@/lib/polymarketLive/traderByAddressCompose";
import { TRADER_PNL_ENDPOINT_ID } from "@/lib/polymarketLive/traderPnlCompose";

/**
 * Every Holder Terminal panel is a canvas block: a sheet with the same table, columns, query and
 * `pull` a recipe run stamps, or a chart that points at one. The terminal renders them with the
 * canvas's own grid and chart, so a panel can be placed on the canvas and replayed unchanged.
 */
export const HOLDER_TERMINAL = "holder";

export const TRADER_ACTIVITY_FILTERS = { type: { values: ["TRADE"] } };
export const TRADER_PNL_FILTERS = { interval: { value: "max" }, fidelity: { value: "1d" } };

/** The terminal's trade table leads with time and who traded; the market is the same on every row. */
const TERMINAL_TRADE_COLUMNS = [
  ["observed_at", 180],
  ["outcome", 90],
  ["side", 70],
  ["price", 80],
  ["size", 110],
  ["name", 160],
  ["pseudonym", 170],
  ["proxy_wallet", 340],
  ["transaction_hash", 520],
];
const TERMINAL_WIDTHS = new Map(TERMINAL_TRADE_COLUMNS);

export const TRADE_COLUMNS = polymarketLiveBuildColumns("getTradesByMarket").map((column) => ({
  ...column,
  defaultOn: TERMINAL_WIDTHS.has(column.id),
  ...(TERMINAL_WIDTHS.has(column.id) ? { width: TERMINAL_WIDTHS.get(column.id) } : {}),
}));

/** The columns the terminal shows, in its order. */
export const TRADE_GRID_COLUMNS = TERMINAL_TRADE_COLUMNS.map(([id]) => TRADE_COLUMNS.find((column) => column.id === id)).filter(Boolean);

function slugId(text) {
  return String(text || "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

/** `both`, `yes` or `no`, and the token ids that choice keeps. Index 0 is Yes (or Up), index 1 is No. */
export function outcomeTokens(meta, outcome) {
  const tokens = Array.isArray(meta?.tokenIds) ? meta.tokenIds : [];
  if (outcome === "yes") return tokens.slice(0, 1);
  if (outcome === "no") return tokens.slice(1, 2);
  return tokens.slice(0, 2);
}

/** One market's fused trade history. `rows` are trade sheet rows, newest first. */
export function marketTradeSheet(meta, rows, { outcome = "both", truncated = false, label = "" } = {}) {
  const handle = meta.slug || meta.conditionId;
  return {
    id: `terminal-${HOLDER_TERMINAL}-trades-${slugId(handle)}`,
    type: "sheet",
    title: `Trades · ${handle}`,
    columns: TRADE_COLUMNS,
    records: rows,
    rowCount: rows.length,
    keepAllRows: true,
    span: "full",
    integrationId: "polymarket",
    table: "getTradesByMarket",
    summary: [label, "Trades", meta.title].filter(Boolean).join(" · "),
    truncated,
    query: { table: "getTradesByMarket", filters: { quote_outcome: { value: outcome } } },
    pull: {
      terminal: HOLDER_TERMINAL,
      ticker: handle,
      tokens: outcomeTokens(meta, outcome),
      table: "getTradesByMarket",
      limit: RECIPE_TRADE_ROW_LIMIT,
      recipe: RECIPE_POLYMARKET_TRADE_HISTORY,
      marketTitle: meta.title,
      conditionId: meta.conditionId,
      ...(meta.eventSlug ? { eventSlug: meta.eventSlug } : {}),
      live: "websocket+history",
      ...lifePull({
        openTime: meta.openMs || undefined,
        closeTime: meta.closeMs || undefined,
        status: meta.status,
        closed: meta.closed,
        result: meta.winner,
      }),
    },
  };
}

/** A chart block drawn from a sheet. An empty view lets the canvas pick, as it does for a new sheet. */
export function sheetChartBlock(sheet, chartView = "") {
  return {
    id: `${sheet.id}-chart`,
    type: "chart",
    source: "sheet-chart",
    sourceSheetId: sheet.id,
    chartView,
    title: `${sheet.title} chart`,
  };
}

const TRADER_TITLES = {
  [TRADER_BY_ADDRESS_ENDPOINT_ID]: "profile",
  [TRADER_ACTIVITY_ENDPOINT_ID]: "trades",
  [TRADER_PNL_ENDPOINT_ID]: "PnL",
};

const TRADER_FILTERS = {
  [TRADER_ACTIVITY_ENDPOINT_ID]: TRADER_ACTIVITY_FILTERS,
  [TRADER_PNL_ENDPOINT_ID]: TRADER_PNL_FILTERS,
};

/** One trader table, with the query the holder recipe stamps on its trader sheets. */
export function traderSheet(endpointId, part, trader) {
  const name = trader.title || `${trader.address.slice(0, 6)}…${trader.address.slice(-4)}`;
  const filters = TRADER_FILTERS[endpointId];
  return {
    id: `terminal-${HOLDER_TERMINAL}-${endpointId}-${trader.address.toLowerCase()}`,
    type: "sheet",
    title: `${name} · ${TRADER_TITLES[endpointId] || endpointId}`,
    columns: part.columns || [],
    records: part.rows || [],
    rowCount: (part.rows || []).length,
    keepAllRows: true,
    integrationId: "polymarket",
    table: endpointId,
    query: {
      table: endpointId,
      address: trader.address,
      rowLimit: (part.rows || []).length,
      ...(filters ? { filters } : {}),
    },
    pull: { terminal: HOLDER_TERMINAL, address: trader.address, live: "poll" },
  };
}
