/**
 * Server-side full-snapshot fetch for Kalshi Live market orderbook (direct upstream).
 */

import { kalshiLiveUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";
import {
  normalizeKalshiLiveOrderbook,
  projectKalshiLiveOrderbookRows,
} from "@/lib/kalshiLive/normalizeOrderbookRow";
import { KALSHI_LIVE_ORDERBOOK_COLUMNS } from "@/lib/kalshiLive/orderbookColumns";

const ALL_ORDERBOOK_COLUMN_NAMES = KALSHI_LIVE_ORDERBOOK_COLUMNS.map((c) => c.name);

/**
 * @param {{
 *   ticker: string;
 *   depth?: number | null;
 * }} opts
 */
async function fetchOrderbookUpstream(opts) {
  const ticker = String(opts.ticker || "").trim().toUpperCase();
  const depthRaw = Math.floor(Number(opts.depth));
  const qs = new URLSearchParams();
  if (Number.isFinite(depthRaw) && depthRaw >= 0 && depthRaw <= 100) {
    qs.set("depth", String(depthRaw));
  }
  const suffix = qs.toString() ? `?${qs.toString()}` : "";
  const url = `${kalshiLiveUrl(`markets/${encodeURIComponent(ticker)}/orderbook`)}${suffix}`;
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
          : `${ticker}: ${upstream.statusText || "Orderbook request failed"}`,
    );
  }
  const normalized = normalizeKalshiLiveOrderbook(ticker, body?.orderbook_fp);
  return projectKalshiLiveOrderbookRows(normalized, ALL_ORDERBOOK_COLUMN_NAMES);
}

/**
 * @param {{
 *   marketTickers: string[];
 *   depth?: number | null;
 * }} opts
 */
export async function fetchKalshiLiveOrderbookIncrementalServer(opts) {
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

  const depthRaw = Math.floor(Number(opts.depth));
  const depth = Number.isFinite(depthRaw) && depthRaw >= 0 && depthRaw <= 100 ? depthRaw : null;

  /** @type {{ ticker: string; rows: Record<string, unknown>[] }[]} */
  const byMarket = [];
  for (const ticker of marketTickers) {
    const rows = await fetchOrderbookUpstream({ ticker, depth });
    byMarket.push({ ticker, rows });
  }

  return { byMarket, depth };
}
