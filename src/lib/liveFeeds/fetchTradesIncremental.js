/**
 * Incremental client tick for Kalshi Live market trades (one request per ticker).
 * Uses min_ts from sheet max created_time (or lookback seconds when empty).
 */

import { fetchKalshiLiveTradesPull } from "@/lib/kalshiLive/fetchKalshiLiveTradesPull";
import { fetchKalshiLiveMarket } from "@/lib/kalshiLive/fetchKalshiLiveMarket";
import { KALSHI_LIVE_MARKETS_COLUMNS } from "@/lib/kalshiLive/marketsColumns";
import { KALSHI_LIVE_TRADES_COLUMNS } from "@/lib/kalshiLive/tradesColumns";
import { projectKalshiLiveMarketRows } from "@/lib/kalshiLive/normalizeMarketRow";
import { maxTradeCreatedTs } from "@/lib/liveFeeds/merge/kalshiTradesUpsert";
import { getLiveFeedEndpointDef } from "@/lib/liveFeeds/registry";

const ALL_TRADE_COLUMN_NAMES = KALSHI_LIVE_TRADES_COLUMNS.map((c) => c.name);
const ALL_MARKET_COLUMN_NAMES = KALSHI_LIVE_MARKETS_COLUMNS.map((c) => c.name);

/** Overlap seconds so we don't miss boundary trades between ticks. */
const MIN_TS_OVERLAP_SEC = 2;

/** Modest per-tick page budget (newest window only; backfill may page more). */
const TICK_ROW_LIMIT = 1_000;
const BACKFILL_ROW_LIMIT = 5_000;

/**
 * Resolve min_ts for a ticker sheet: max created_time − overlap, or now − lookbackSec.
 *
 * @param {{
 *   dataSheets?: Record<string, object> | null;
 *   sheetId?: string | null;
 *   lookbackSec?: number;
 *   endTs?: number;
 *   forceLookback?: boolean;
 * }} opts
 * @returns {{ minTs: number; usedBackfillWindow: boolean }}
 */
export function resolveTradesIncrementalMinTs(opts = {}) {
  const endTs =
    Number.isFinite(Number(opts.endTs)) && Number(opts.endTs) > 0
      ? Math.floor(Number(opts.endTs))
      : Math.floor(Date.now() / 1000);
  const lookbackSec = Math.max(
    60,
    Math.floor(Number(opts.lookbackSec)) ||
      getLiveFeedEndpointDef("kalshi-live", "trades")?.lookbackPeriods ||
      3_600,
  );
  const lookbackStart = endTs - lookbackSec;

  if (opts.forceLookback) {
    return { minTs: lookbackStart, usedBackfillWindow: true };
  }

  const sheetId = String(opts.sheetId || "").trim();
  const sheet = sheetId && opts.dataSheets ? opts.dataSheets[sheetId] : null;
  const rows = Array.isArray(sheet?.data) ? sheet.data : [];
  const maxTs = maxTradeCreatedTs(rows);
  if (maxTs == null) {
    return { minTs: lookbackStart, usedBackfillWindow: true };
  }
  const minTs = Math.max(0, maxTs - MIN_TS_OVERLAP_SEC);
  // If sheet history is within lookback, treat as normal incremental (not full backfill).
  const usedBackfillWindow = maxTs < lookbackStart;
  return { minTs: usedBackfillWindow ? lookbackStart : minTs, usedBackfillWindow };
}

/**
 * @param {{
 *   marketTickers: string[];
 *   lookbackSec?: number;
 *   minTsByTicker?: Record<string, number>;
 *   dataSheets?: Record<string, object> | null;
 *   marketSheetIdsByTicker?: Record<string, string>;
 *   forceLookback?: boolean;
 *   limitPerTicker?: number;
 *   signal?: AbortSignal;
 * }} opts
 * @returns {Promise<{
 *   metaRows: Record<string, unknown>[];
 *   byMarket: { ticker: string; rows: Record<string, unknown>[] }[];
 *   endTs: number;
 *   usedBackfillWindow: boolean;
 * }>}
 */
export async function fetchKalshiLiveTradesIncremental(opts) {
  const marketTickers = [
    ...new Set(
      (Array.isArray(opts.marketTickers) ? opts.marketTickers : [])
        .map((t) => String(t || "").trim().toUpperCase())
        .filter(Boolean),
    ),
  ];
  if (!marketTickers.length) {
    throw new Error("marketTickers are required.");
  }

  const endTs = Math.floor(Date.now() / 1000);
  const lookbackSec =
    Math.floor(Number(opts.lookbackSec)) ||
    getLiveFeedEndpointDef("kalshi-live", "trades")?.lookbackPeriods ||
    3_600;
  const sheetMap =
    opts.marketSheetIdsByTicker && typeof opts.marketSheetIdsByTicker === "object"
      ? opts.marketSheetIdsByTicker
      : {};

  let usedBackfillWindow = false;
  /** @type {Record<string, unknown>[]} */
  const rawMarkets = [];
  /** @type {{ ticker: string; rows: Record<string, unknown>[] }[]} */
  const byMarket = [];

  for (const ticker of marketTickers) {
    if (opts.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError");
    }

    try {
      const market = await fetchKalshiLiveMarket({
        marketTicker: ticker,
        signal: opts.signal,
      });
      rawMarkets.push(market);
    } catch {
      // Meta refresh is best-effort.
    }

    const sheetId = sheetMap[ticker] || null;
    let minTs = null;
    if (
      opts.minTsByTicker &&
      Number.isFinite(Number(opts.minTsByTicker[ticker])) &&
      Number(opts.minTsByTicker[ticker]) > 0
    ) {
      minTs = Math.floor(Number(opts.minTsByTicker[ticker]));
    } else {
      const resolved = resolveTradesIncrementalMinTs({
        dataSheets: opts.dataSheets,
        sheetId,
        lookbackSec,
        endTs,
        forceLookback: !!opts.forceLookback,
      });
      minTs = resolved.minTs;
      if (resolved.usedBackfillWindow) usedBackfillWindow = true;
    }

    const limit =
      Math.floor(Number(opts.limitPerTicker)) ||
      (usedBackfillWindow || opts.forceLookback ? BACKFILL_ROW_LIMIT : TICK_ROW_LIMIT);

    const { byTicker } = await fetchKalshiLiveTradesPull({
      marketTickers: ticker,
      whereFilters: [{ column: "min_ts", value: minTs }],
      sortClauses: [{ column: "created_time", direction: "asc" }],
      limit,
      selectedColumns: ALL_TRADE_COLUMN_NAMES,
      signal: opts.signal,
    });

    const group = byTicker[0];
    byMarket.push({
      ticker,
      rows: Array.isArray(group?.rows) ? group.rows : [],
    });
  }

  const metaRows = projectKalshiLiveMarketRows(rawMarkets, ALL_MARKET_COLUMN_NAMES);

  return { byMarket, metaRows, endTs, usedBackfillWindow };
}
