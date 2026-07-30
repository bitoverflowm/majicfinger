import { warmDuckDbWasm } from "@/lib/duckdb/duckdbWasmClient";
import { projectKalshiLiveCandlestickRows } from "@/lib/kalshiLive/normalizeCandlestickRow";
import { projectKalshiLiveEventForecastRows } from "@/lib/kalshiLive/normalizeEventForecastRow";
import { projectKalshiLiveLeaderboardRows } from "@/lib/kalshiLive/normalizeLeaderboardRow";
import { projectKalshiLiveHolderProfileRows } from "@/lib/kalshiLive/normalizeHolderProfileRow";
import { projectKalshiLiveHolderTradeRows } from "@/lib/kalshiLive/normalizeHolderTradeRow";
import { projectKalshiLiveSearchTradersRows } from "@/lib/kalshiLive/normalizeSearchTradersRow";
import { projectKalshiLiveTradeRows } from "@/lib/kalshiLive/normalizeTradeRow";
import { projectKalshiHistoricalV2TradeRows } from "@/lib/kalshiHistoricalV2/normalizeHistoricalTradeRow";
import { projectKalshiLiveOrderbookRows } from "@/lib/kalshiLive/normalizeOrderbookRow";
import { projectKalshiLiveMarketRows } from "@/lib/kalshiLive/normalizeMarketRow";
import { projectKalshiLiveEventPayloads } from "@/lib/kalshiLive/normalizeEventRow";
import { projectKalshiLiveSeriesRows } from "@/lib/kalshiLive/normalizeSeriesRow";

/** @type {Map<string, { virtualFileName: string; viewName: string }>} */
const kalshiLiveRegistry = new Map();

function sanitizeKeyPart(s) {
  const t = String(s || "x")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
  return t || "x";
}

function logicalKey(endpointId) {
  return `kalshi_live_${sanitizeKeyPart(endpointId)}`;
}

function viewNameFor(key) {
  return `v_kalshi_live_${key}`;
}

/**
 * Register Kalshi Live rows in DuckDB-WASM (background; sheet uses inline rows immediately).
 *
 * @param {{
 *   endpointId: string;
 *   markets?: unknown[];
 *   events?: Array<{ event: Record<string, unknown>; markets?: unknown[]; milestones?: unknown }>;
 *   series?: Record<string, unknown> | Record<string, unknown>[] | null;
 *   candlesticks?: unknown[];
 *   forecastHistory?: unknown[];
 *   rankList?: unknown[];
 *   leaderboardContext?: { metricName?: string; timePeriod?: string; category?: string };
 *   holderProfile?: { social_profile?: unknown; inner_circle?: unknown } | null;
 *   holderTrades?: unknown[];
 *   searchTraders?: Array<{
 *     profile: Record<string, unknown>;
 *     metrics?: Record<string, unknown> | null;
 *     holdingsPayload?: Record<string, unknown> | null;
 *   }>;
 *   searchTradersOpts?: { includeMetrics?: boolean; includeHoldings?: boolean; closedPositions?: boolean };
 *   trades?: unknown[];
 *   orderbook?: unknown[];
 *   selectedColumns?: string[];
 *   includeMarkets?: boolean;
 *   rowMode?: string;
 * }} opts
 */
export async function ingestKalshiLiveAsView(opts) {
  const endpointId = String(opts.endpointId || "markets").trim() || "markets";
  let sheetRows;
  if (endpointId === "candlesticks") {
    sheetRows = projectKalshiLiveCandlestickRows(
      Array.isArray(opts.candlesticks) ? opts.candlesticks : [],
      opts.selectedColumns,
    );
  } else if (endpointId === "event_forecast") {
    sheetRows = projectKalshiLiveEventForecastRows(
      Array.isArray(opts.forecastHistory) ? opts.forecastHistory : [],
      opts.selectedColumns,
    );
  } else if (endpointId === "leaderboard") {
    sheetRows = projectKalshiLiveLeaderboardRows(
      Array.isArray(opts.rankList) ? opts.rankList : [],
      opts.selectedColumns,
      opts.leaderboardContext || {},
    );
  } else if (endpointId === "holder_profile") {
    sheetRows = projectKalshiLiveHolderProfileRows(opts.holderProfile, opts.selectedColumns);
  } else if (endpointId === "trades_by_holder") {
    sheetRows = projectKalshiLiveHolderTradeRows(
      Array.isArray(opts.holderTrades) ? opts.holderTrades : [],
      opts.selectedColumns,
    );
  } else if (endpointId === "search_traders") {
    sheetRows = projectKalshiLiveSearchTradersRows(
      Array.isArray(opts.searchTraders) ? opts.searchTraders : [],
      opts.selectedColumns,
      opts.searchTradersOpts || {},
    );
  } else if (endpointId === "trades" || endpointId === "historical_v2_trades") {
    sheetRows =
      endpointId === "historical_v2_trades"
        ? projectKalshiHistoricalV2TradeRows(
            Array.isArray(opts.trades) ? opts.trades : [],
            opts.selectedColumns,
          )
        : projectKalshiLiveTradeRows(
            Array.isArray(opts.trades) ? opts.trades : [],
            opts.selectedColumns,
          );
  } else if (endpointId === "orderbook") {
    sheetRows = projectKalshiLiveOrderbookRows(
      Array.isArray(opts.orderbook) ? opts.orderbook : [],
      opts.selectedColumns,
    );
  } else if (endpointId === "markets") {
    sheetRows = projectKalshiLiveMarketRows(opts.markets, opts.selectedColumns);
  } else if (endpointId === "events" || endpointId === "multivariate_events") {
    sheetRows = projectKalshiLiveEventPayloads(
      Array.isArray(opts.events) ? opts.events : [],
      opts.selectedColumns,
      {
        includeMarkets: !!opts.includeMarkets,
        rowMode: opts.rowMode,
      },
    );
  } else if (endpointId === "series") {
    sheetRows = projectKalshiLiveSeriesRows(
      Array.isArray(opts.series)
        ? opts.series
        : opts.series
          ? [opts.series]
          : [],
      opts.selectedColumns,
    );
  } else {
    sheetRows = projectKalshiLiveMarketRows(opts.markets, opts.selectedColumns);
  }

  void registerKalshiLiveView(endpointId, sheetRows).catch((err) => {
    console.warn("[ingestKalshiLiveAsView] DuckDB registration failed:", err);
  });

  return {
    rows: sheetRows,
    rowCount: sheetRows.length,
    logicalKey: logicalKey(endpointId),
    viewName: viewNameFor(logicalKey(endpointId)),
  };
}

/**
 * @param {string} endpointId
 * @param {Record<string, unknown>[]} objects
 */
async function registerKalshiLiveView(endpointId, objects) {
  const key = logicalKey(endpointId);
  const viewName = viewNameFor(key);
  const jsonFileName = `kalshi_live_${key}.json`;

  const { db, conn } = await warmDuckDbWasm();

  const prev = kalshiLiveRegistry.get(key);
  if (prev) {
    try {
      await conn.query(`DROP VIEW IF EXISTS ${prev.viewName}`);
    } catch {
      /* ignore */
    }
    try {
      await db.dropFile(prev.virtualFileName);
    } catch {
      /* ignore */
    }
  }

  if (!objects.length) {
    await conn.query(`CREATE OR REPLACE VIEW ${viewName} AS SELECT 1 WHERE FALSE`);
    kalshiLiveRegistry.set(key, { virtualFileName: jsonFileName, viewName });
    return;
  }

  const jsonBytes = new TextEncoder().encode(JSON.stringify(objects));
  await db.registerFileBuffer(jsonFileName, jsonBytes);
  const escapedFile = jsonFileName.replace(/'/g, "''");
  await conn.query(
    `CREATE OR REPLACE VIEW ${viewName} AS SELECT * FROM read_json_auto('${escapedFile}')`,
  );
  kalshiLiveRegistry.set(key, { virtualFileName: jsonFileName, viewName });
}
