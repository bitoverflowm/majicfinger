/**
 * Server-side incremental fetch for Kalshi Live market trades (direct upstream).
 */

import { kalshiLiveUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";
import {
  normalizeKalshiLiveTrades,
  projectKalshiLiveTradeRows,
} from "@/lib/kalshiLive/normalizeTradeRow";
import { KALSHI_LIVE_TRADES_COLUMNS } from "@/lib/kalshiLive/tradesColumns";
import { getLiveFeedEndpointDef } from "@/lib/liveFeeds/registry";

const ALL_TRADE_COLUMN_NAMES = KALSHI_LIVE_TRADES_COLUMNS.map((c) => c.name);
const PAGE_LIMIT = 1_000;
const TICK_ROW_LIMIT = 1_000;
const BACKFILL_ROW_LIMIT = 5_000;

/**
 * @param {{
 *   ticker: string;
 *   minTs: number;
 *   limit: number;
 * }} opts
 */
async function fetchTradesPagesUpstream(opts) {
  const ticker = String(opts.ticker || "").trim().toUpperCase();
  const minTs = Math.floor(Number(opts.minTs));
  const maxPerTicker = Math.max(1, Math.min(BACKFILL_ROW_LIMIT, Math.floor(Number(opts.limit)) || TICK_ROW_LIMIT));
  /** @type {Record<string, unknown>[]} */
  const all = [];
  let cursor = "";

  while (all.length < maxPerTicker) {
    const remaining = maxPerTicker - all.length;
    const pageLimit = Math.min(PAGE_LIMIT, remaining);
    const qs = new URLSearchParams({
      ticker,
      limit: String(pageLimit),
    });
    if (Number.isFinite(minTs) && minTs > 0) qs.set("min_ts", String(minTs));
    if (cursor) qs.set("cursor", cursor);

    const url = `${kalshiLiveUrl("markets/trades")}?${qs.toString()}`;
    const upstream = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const body = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      throw new Error(
        typeof body?.message === "string"
          ? `${ticker}: ${body.message}`
          : typeof body?.error === "string"
            ? `${ticker}: ${body.error}`
            : `${ticker}: ${upstream.statusText || "Trades request failed"}`,
      );
    }
    const batch = normalizeKalshiLiveTrades(body?.trades);
    all.push(...batch.slice(0, remaining));
    cursor = String(body?.cursor || "").trim();
    if (!cursor || batch.length === 0) break;
  }

  return projectKalshiLiveTradeRows(all, ALL_TRADE_COLUMN_NAMES);
}

/**
 * @param {{
 *   marketTickers: string[];
 *   lookbackSec?: number;
 *   minTs?: number;
 *   forceLookback?: boolean;
 *   limitPerTicker?: number;
 * }} opts
 */
export async function fetchKalshiLiveTradesIncrementalServer(opts) {
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
  const lookbackStart = endTs - lookbackSec;
  let usedBackfillWindow = !!opts.forceLookback;
  let minTs = lookbackStart;
  if (Number.isFinite(Number(opts.minTs)) && Number(opts.minTs) > 0 && !opts.forceLookback) {
    minTs = Math.floor(Number(opts.minTs));
  } else {
    usedBackfillWindow = true;
    minTs = lookbackStart;
  }

  const limit =
    Math.floor(Number(opts.limitPerTicker)) ||
    (usedBackfillWindow ? BACKFILL_ROW_LIMIT : TICK_ROW_LIMIT);

  /** @type {{ ticker: string; rows: Record<string, unknown>[] }[]} */
  const byMarket = [];
  for (const ticker of marketTickers) {
    const rows = await fetchTradesPagesUpstream({ ticker, minTs, limit });
    byMarket.push({ ticker, rows });
  }

  return { byMarket, endTs, usedBackfillWindow, minTs, lookbackSec };
}
