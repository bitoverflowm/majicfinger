import {
  fetchKalshiLiveCandlesticksBatchUpstream,
  fetchKalshiLiveCandlesticksSingleUpstream,
  inferSeriesTickerFromMarket,
} from "@/lib/kalshiLive/fetchKalshiLiveCandlesticksUpstream";
import { parseKalshiLiveMarketTickersInput } from "@/lib/kalshiLive/candlesticksColumns";

function queryParam(req, name) {
  const raw = req.query[name];
  return String(Array.isArray(raw) ? raw[0] : raw || "").trim();
}

function parseBool(raw) {
  const v = String(Array.isArray(raw) ? raw[0] : raw || "")
    .trim()
    .toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

function parseIntParam(req, name) {
  const n = Math.floor(Number(queryParam(req, name)));
  return Number.isFinite(n) ? n : NaN;
}

/**
 * GET /api/integrations/kalshi-live/markets/candlesticks
 * Proxies batch (default) or single-market candlesticks when one ticker + series_ticker.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ error: "Method not allowed" });
  }

  const tickers = parseKalshiLiveMarketTickersInput(queryParam(req, "market_tickers"));
  const startTs = parseIntParam(req, "start_ts");
  const endTs = parseIntParam(req, "end_ts");
  const periodInterval = parseIntParam(req, "period_interval");
  const includeLatest = parseBool(req.query.include_latest_before_start);
  const seriesTickerParam = queryParam(req, "series_ticker");

  if (!tickers.length) {
    return res.status(400).json({ error: "market_tickers is required", code: "BAD_REQUEST" });
  }
  if (tickers.length > 100) {
    return res.status(400).json({ error: "Maximum 100 market tickers", code: "BAD_REQUEST" });
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

  const baseOpts = {
    start_ts: startTs,
    end_ts: endTs,
    period_interval: periodInterval,
    include_latest_before_start: includeLatest,
  };

  try {
    let markets;
    if (tickers.length === 1) {
      const seriesTicker = seriesTickerParam || inferSeriesTickerFromMarket(tickers[0]);
      try {
        markets = await fetchKalshiLiveCandlesticksSingleUpstream({
          ...baseOpts,
          seriesTicker,
          marketTicker: tickers[0],
        });
      } catch {
        markets = await fetchKalshiLiveCandlesticksBatchUpstream({
          ...baseOpts,
          marketTickers: tickers,
        });
      }
    } else {
      markets = await fetchKalshiLiveCandlesticksBatchUpstream({
        ...baseOpts,
        marketTickers: tickers,
      });
    }

    const normalized = (Array.isArray(markets) ? markets : []).map((m) => ({
      market_ticker: String(m.market_ticker || m.marketTicker || ""),
      candlesticks: Array.isArray(m.candlesticks) ? m.candlesticks : [],
    }));

    return res.status(200).json({ markets: normalized });
  } catch (e) {
    return res.status(502).json({
      error: e instanceof Error ? e.message : "Failed to reach Kalshi candlesticks API",
    });
  }
}
