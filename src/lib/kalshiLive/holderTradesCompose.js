import {
  KALSHI_LIVE_HOLDER_TRADES_LIMIT_MAX,
  normalizeKalshiLiveHolderTradesLimit,
  normalizeKalshiLiveHolderTradesMinAmount,
} from "@/lib/kalshiLive/holderTradesColumns";

/**
 * @param {{
 *   nickname?: string;
 *   seriesTicker?: string;
 *   eventTicker?: string;
 *   minAmount?: unknown;
 *   limit?: number;
 * }} params
 * @returns {string | null}
 */
export function validateKalshiLiveHolderTradesPull(params = {}) {
  const minAmount = normalizeKalshiLiveHolderTradesMinAmount(params.minAmount);
  if (
    params.minAmount != null &&
    String(params.minAmount).trim() !== "" &&
    minAmount == null
  ) {
    return "Minimum amount must be a non-negative number (or leave blank).";
  }

  const limit = normalizeKalshiLiveHolderTradesLimit(params.limit);
  if (limit < 1 || limit > KALSHI_LIVE_HOLDER_TRADES_LIMIT_MAX) {
    return `Limit must be between 1 and ${KALSHI_LIVE_HOLDER_TRADES_LIMIT_MAX}.`;
  }
  return null;
}

/**
 * @param {{
 *   nickname?: string;
 *   seriesTicker?: string;
 *   eventTicker?: string;
 *   minAmount?: number | null;
 *   limit: number;
 *   loadedRowCount?: number;
 *   visibilityState?: string;
 * }} opts
 */
export function summarizeKalshiLiveHolderTradesRequest(opts) {
  const parts = ["GET /v1/social/trades"];
  const nickname = String(opts.nickname || "").trim();
  const seriesTicker = String(opts.seriesTicker || "").trim();
  const eventTicker = String(opts.eventTicker || "").trim();
  const minAmount =
    opts.minAmount == null ? null : normalizeKalshiLiveHolderTradesMinAmount(opts.minAmount);
  const limit = normalizeKalshiLiveHolderTradesLimit(opts.limit);
  if (nickname) parts.push(`nickname=${nickname}`);
  if (seriesTicker) parts.push(`series_ticker=${seriesTicker}`);
  if (eventTicker) parts.push(`event_ticker=${eventTicker}`);
  if (minAmount != null) parts.push(`min_amount=${minAmount}`);
  parts.push(`limit=${limit}`);
  if (opts.visibilityState) parts.push(`visibility=${opts.visibilityState}`);
  if (typeof opts.loadedRowCount === "number") parts.push(`rows=${opts.loadedRowCount}`);
  return parts.join(" · ");
}
