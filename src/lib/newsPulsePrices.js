/**
 * Pulse market prices: current YES + change over a documented window.
 *
 * Window (price_change_window):
 * - "since_article" — baseline = last YES print at or before the article timestamp
 *   (history fetched from article.t − 6h through now so we have a nearby prior).
 * - "trailing_6h" — fallback when no print exists near the article time; baseline =
 *   YES at or before now − 6h (or the earliest point in that window).
 *
 * Prices are 0–1 probabilities (YES). Pure helpers are network-free for unit tests.
 */

export const PRICE_TRAILING_MS = 6 * 60 * 60 * 1000;
export const PRICE_HISTORY_PAD_MS = PRICE_TRAILING_MS;
export const PRICE_FETCH_TIMEOUT_MS = 4_000;

const CLOB_BASE = (process.env.POLYMARKET_CLOB_API_URL || "https://clob.polymarket.com").replace(/\/$/, "");

/** @param {unknown} n */
export function asProb(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  if (n > 1 && n <= 100) return n / 100;
  if (n < 0 || n > 1) return null;
  return n;
}

/**
 * Pick baseline + current from sorted `{ tMs, p }[]` history.
 * @param {Array<{ tMs: number; p: number }>} points
 * @param {number} articleMs
 * @param {number} [nowMs]
 */
export function priceChangeFromHistory(points, articleMs, nowMs = Date.now()) {
  const sorted = (points || [])
    .filter((pt) => Number.isFinite(pt?.tMs) && Number.isFinite(pt?.p))
    .sort((a, b) => a.tMs - b.tMs);
  if (!sorted.length) {
    return { price: null, price_change: null, price_change_window: null, price_as_of: null };
  }

  const current = sorted[sorted.length - 1];
  const article = Number(articleMs);
  const nearArticle =
    Number.isFinite(article) &&
    sorted.filter((pt) => pt.tMs <= article && article - pt.tMs <= PRICE_HISTORY_PAD_MS).pop();

  if (nearArticle) {
    return {
      price: current.p,
      price_change: roundDelta(current.p - nearArticle.p),
      price_change_window: "since_article",
      price_as_of: current.tMs,
    };
  }

  const trailStart = nowMs - PRICE_TRAILING_MS;
  const baseline = sorted.filter((pt) => pt.tMs <= trailStart).pop() || sorted[0];
  return {
    price: current.p,
    price_change: roundDelta(current.p - baseline.p),
    price_change_window: "trailing_6h",
    price_as_of: current.tMs,
  };
}

function roundDelta(d) {
  return Math.round(d * 10_000) / 10_000;
}

/**
 * @param {string} tokenId
 * @param {number} startMs
 * @param {number} endMs
 * @returns {Promise<Array<{ tMs: number; p: number }>>}
 */
export async function fetchPolymarketYesHistory(tokenId, startMs, endMs) {
  const market = String(tokenId || "").trim();
  if (!market) return [];
  const startTs = Math.floor(Math.min(startMs, endMs) / 1000);
  const endTs = Math.floor(Math.max(startMs, endMs) / 1000);
  if (!(endTs > startTs)) return [];

  const params = new URLSearchParams({
    market,
    startTs: String(startTs),
    endTs: String(endTs),
    fidelity: "15",
  });
  const res = await fetch(`${CLOB_BASE}/prices-history?${params}`, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(PRICE_FETCH_TIMEOUT_MS),
  });
  if (!res.ok) return [];
  const body = await res.json().catch(() => null);
  const history = Array.isArray(body?.history) ? body.history : [];
  return history
    .map((pt) => {
      const tSec = Number(pt?.t);
      const p = asProb(Number(pt?.p));
      if (!Number.isFinite(tSec) || p == null) return null;
      return { tMs: tSec * 1000, p };
    })
    .filter(Boolean);
}

/**
 * Normalize Kalshi candlestick batches into YES close points (dollars 0–1).
 * @param {Array<{ market_ticker?: string; candlesticks?: unknown[] }>} markets
 * @returns {Map<string, Array<{ tMs: number; p: number }>>}
 */
export function kalshiCandlesToHistory(markets) {
  /** @type {Map<string, Array<{ tMs: number; p: number }>>} */
  const out = new Map();
  for (const row of markets || []) {
    const ticker = String(row?.market_ticker || "").trim().toUpperCase();
    if (!ticker) continue;
    const points = [];
    for (const candle of row.candlesticks || []) {
      if (!candle || typeof candle !== "object") continue;
      const c = /** @type {Record<string, unknown>} */ (candle);
      const tSec = Number(c.end_period_ts);
      const price = c.price && typeof c.price === "object" ? /** @type {Record<string, unknown>} */ (c.price) : null;
      const yesBid = c.yes_bid && typeof c.yes_bid === "object" ? /** @type {Record<string, unknown>} */ (c.yes_bid) : null;
      const p = asProb(Number(price?.close_dollars ?? yesBid?.close_dollars));
      if (!Number.isFinite(tSec) || p == null) continue;
      points.push({ tMs: tSec * 1000, p });
    }
    points.sort((a, b) => a.tMs - b.tMs);
    if (points.length) out.set(ticker, points);
  }
  return out;
}

/**
 * Attach price fields onto a market from history + optional known current.
 * @param {Record<string, unknown>} market
 * @param {Array<{ tMs: number; p: number }>} points
 * @param {number} articleMs
 * @param {number | null} [knownPrice]
 */
export function withMarketPrice(market, points, articleMs, knownPrice = null) {
  const fromHist = priceChangeFromHistory(points, articleMs);
  const price = fromHist.price ?? asProb(knownPrice);
  if (price == null) return { ...market };
  return {
    ...market,
    price,
    price_change: fromHist.price_change,
    price_change_window: fromHist.price_change_window,
    price_as_of: fromHist.price_as_of,
  };
}

export { formatPulsePrice, formatPulsePriceChange } from "@/lib/newsPulseFormat";
