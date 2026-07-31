import { kalshiLiveUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";
import {
  estimateKalshiCandlestickCount,
  KALSHI_CANDLESTICK_MAX_CANDLES,
  maxKalshiCandlestickRangeSec,
} from "@/lib/kalshiLive/candlestickCompose";
import { parseKalshiLiveMarketTickersInput } from "@/lib/kalshiLive/candlesticksColumns";

function queryParam(req, name) {
  const raw = req.query[name];
  return String(Array.isArray(raw) ? raw[0] : raw || "").trim();
}

function parseIntParam(req, name) {
  const n = Math.floor(Number(queryParam(req, name)));
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Proxy GET /historical/markets/{ticker}/candlesticks.
 * Query: ticker (required), start_ts, end_ts, period_interval (1|60|1440).
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ticker =
    parseKalshiLiveMarketTickersInput(queryParam(req, "ticker") || queryParam(req, "market_tickers"))[0] ||
    "";
  const startTs = parseIntParam(req, "start_ts");
  const endTs = parseIntParam(req, "end_ts");
  const periodInterval = parseIntParam(req, "period_interval");

  if (!ticker) {
    return res.status(400).json({ error: "ticker is required", code: "BAD_REQUEST" });
  }
  if (!Number.isFinite(startTs) || !Number.isFinite(endTs)) {
    return res.status(400).json({ error: "start_ts and end_ts are required", code: "BAD_REQUEST" });
  }
  if (![1, 60, 1440].includes(periodInterval)) {
    return res.status(400).json({
      error: "period_interval must be 1, 60, or 1440",
      code: "BAD_REQUEST",
    });
  }

  const estimatedCandles = estimateKalshiCandlestickCount(startTs, endTs, periodInterval);
  if (Number.isFinite(estimatedCandles) && estimatedCandles > KALSHI_CANDLESTICK_MAX_CANDLES) {
    const maxSec = maxKalshiCandlestickRangeSec(periodInterval);
    const maxDays = (maxSec / 86400).toFixed(periodInterval === 1 ? 1 : 0);
    return res.status(400).json({
      error:
        `Date range is too wide for period_interval=${periodInterval} ` +
        `(~${estimatedCandles.toLocaleString()} candles; Kalshi max is ${KALSHI_CANDLESTICK_MAX_CANDLES.toLocaleString()}, ` +
        `about ${maxDays} days). Narrow start_ts/end_ts or use a coarser interval.`,
      code: "CANDLE_WINDOW_TOO_LARGE",
      estimated_candles: estimatedCandles,
      max_candles: KALSHI_CANDLESTICK_MAX_CANDLES,
    });
  }

  const qs = new URLSearchParams({
    start_ts: String(startTs),
    end_ts: String(endTs),
    period_interval: String(periodInterval),
  });
  const url = `${kalshiLiveUrl(`historical/markets/${encodeURIComponent(ticker)}/candlesticks`)}?${qs}`;

  try {
    const upstream = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    const body = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const retryAfter = upstream.headers.get("retry-after");
      if (retryAfter) res.setHeader("Retry-After", retryAfter);
      return res.status(upstream.status >= 400 ? upstream.status : 502).json({
        error:
          typeof body?.message === "string"
            ? body.message
            : typeof body?.error === "string"
              ? body.error
              : upstream.statusText || "Kalshi historical candlesticks request failed",
        ...body,
      });
    }

    const candlesticks = Array.isArray(body?.candlesticks) ? body.candlesticks : [];
    const responseTicker = String(body?.ticker || ticker).trim() || ticker;

    return res.status(200).json({
      ticker: responseTicker,
      candlesticks,
      markets: [{ market_ticker: responseTicker, candlesticks }],
    });
  } catch (e) {
    return res.status(502).json({
      error:
        e instanceof Error ? e.message : "Failed to reach Kalshi historical candlesticks API",
    });
  }
}
