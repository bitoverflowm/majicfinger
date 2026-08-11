/**
 * Deterministic static OHLC rows for the Kalshi Live Batch Candlesticks demo.
 * Shape matches normalizeKalshiLiveCandlestickRow / mapRowsToCandlestickSeriesData.
 */

/**
 * @param {string} str
 * @returns {number}
 */
function hashSeed(str) {
  let h = 2166136261;
  const s = String(str || "");
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * @param {number} seed
 * @returns {() => number}
 */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {{
 *   marketTicker: string;
 *   periods?: number;
 *   periodSeconds?: number;
 *   endTs?: number;
 *   startPrice?: number | null;
 * }} opts
 * @returns {Record<string, unknown>[]}
 */
export function buildStaticCandlestickRows(opts) {
  const marketTicker = String(opts.marketTicker || "").trim().toUpperCase();
  const periods = Math.max(12, Math.min(120, Math.floor(Number(opts.periods) || 48)));
  const periodSeconds = Math.max(
    60,
    Math.floor(Number(opts.periodSeconds) || 3600),
  );
  const endTs =
    Number.isFinite(Number(opts.endTs)) && Number(opts.endTs) > 0
      ? Math.floor(Number(opts.endTs))
      : Math.floor(Date.now() / 1000);

  const rand = mulberry32(hashSeed(marketTicker || "market"));
  const startHint = Number(opts.startPrice);
  let close =
    Number.isFinite(startHint) && startHint > 0 && startHint < 1
      ? startHint
      : 0.18 + rand() * 0.64;

  /** @type {Record<string, unknown>[]} */
  const rows = [];
  for (let i = periods - 1; i >= 0; i -= 1) {
    const open = close;
    const drift = (rand() - 0.48) * 0.045;
    close = Math.min(0.97, Math.max(0.03, open + drift));
    const high = Math.min(0.99, Math.max(open, close) + rand() * 0.018);
    const low = Math.max(0.01, Math.min(open, close) - rand() * 0.018);
    rows.push({
      market_ticker: marketTicker,
      end_period_ts: endTs - i * periodSeconds,
      price_open_dollars: Number(open.toFixed(4)),
      price_high_dollars: Number(high.toFixed(4)),
      price_low_dollars: Number(low.toFixed(4)),
      price_close_dollars: Number(close.toFixed(4)),
      volume_fp: Math.round(80 + rand() * 4200),
      open_interest_fp: Math.round(200 + rand() * 8000),
    });
  }
  return rows;
}
