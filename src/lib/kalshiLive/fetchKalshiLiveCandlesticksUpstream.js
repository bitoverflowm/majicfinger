import { kalshiLiveUrl } from "@/lib/kalshiLive/kalshiLiveApiBase";

const DEFAULT_TIMEOUT_MS = 90_000;

function isAbortError(err) {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

/**
 * Batch GET /markets/candlesticks (1–100 tickers).
 *
 * @param {{
 *   marketTickers: string[];
 *   start_ts: number;
 *   end_ts: number;
 *   period_interval: number;
 *   include_latest_before_start?: boolean;
 *   signal?: AbortSignal;
 *   timeoutMs?: number;
 * }} opts
 */
export async function fetchKalshiLiveCandlesticksBatchUpstream(opts) {
  const tickers = (opts.marketTickers || []).map((t) => String(t).trim()).filter(Boolean);
  if (!tickers.length) throw new Error("At least one market ticker is required.");
  if (tickers.length > 100) throw new Error("Maximum 100 market tickers per request.");

  const qs = new URLSearchParams({
    market_tickers: tickers.join(","),
    start_ts: String(Math.floor(Number(opts.start_ts))),
    end_ts: String(Math.floor(Number(opts.end_ts))),
    period_interval: String(Math.floor(Number(opts.period_interval))),
  });
  if (opts.include_latest_before_start) {
    qs.set("include_latest_before_start", "true");
  }

  const body = await fetchKalshiLiveCandlesticksUrl(`${kalshiLiveUrl("markets/candlesticks")}?${qs}`, opts);
  return Array.isArray(body?.markets) ? body.markets : [];
}

/**
 * Single-market GET /series/{series_ticker}/markets/{ticker}/candlesticks
 *
 * @param {{
 *   seriesTicker: string;
 *   marketTicker: string;
 *   start_ts: number;
 *   end_ts: number;
 *   period_interval: number;
 *   include_latest_before_start?: boolean;
 *   signal?: AbortSignal;
 *   timeoutMs?: number;
 * }} opts
 */
export async function fetchKalshiLiveCandlesticksSingleUpstream(opts) {
  const seriesTicker = String(opts.seriesTicker || "").trim();
  const marketTicker = String(opts.marketTicker || "").trim();
  if (!seriesTicker || !marketTicker) {
    throw new Error("series_ticker and market ticker are required for single-market candlesticks.");
  }

  const qs = new URLSearchParams({
    start_ts: String(Math.floor(Number(opts.start_ts))),
    end_ts: String(Math.floor(Number(opts.end_ts))),
    period_interval: String(Math.floor(Number(opts.period_interval))),
  });
  if (opts.include_latest_before_start) {
    qs.set("include_latest_before_start", "true");
  }

  const path = `series/${encodeURIComponent(seriesTicker)}/markets/${encodeURIComponent(marketTicker)}/candlesticks`;
  const body = await fetchKalshiLiveCandlesticksUrl(`${kalshiLiveUrl(path)}?${qs}`, opts);

  return [
    {
      market_ticker: String(body?.ticker || marketTicker),
      candlesticks: Array.isArray(body?.candlesticks) ? body.candlesticks : [],
    },
  ];
}

/**
 * @param {string} url
 * @param {{ signal?: AbortSignal; timeoutMs?: number }} opts
 */
async function fetchKalshiLiveCandlesticksUrl(url, opts) {
  const timeoutMs = Math.max(5_000, Number(opts.timeoutMs) || DEFAULT_TIMEOUT_MS);
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

  const onParentAbort = () => timeoutController.abort();
  if (opts.signal) {
    if (opts.signal.aborted) {
      clearTimeout(timeoutId);
      throw new DOMException("Aborted", "AbortError");
    }
    opts.signal.addEventListener("abort", onParentAbort, { once: true });
  }

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: timeoutController.signal,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg =
        typeof body?.message === "string"
          ? body.message
          : typeof body?.error === "string"
            ? body.error
            : body?.error?.message || res.statusText || "Candlesticks request failed";
      throw new Error(typeof msg === "string" ? msg : "Candlesticks request failed");
    }
    return body;
  } catch (err) {
    if (isAbortError(err)) {
      if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");
      throw new Error(
        `Kalshi candlesticks timed out after ${Math.round(timeoutMs / 1000)}s. Narrow the time range or fewer tickers.`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
    opts.signal?.removeEventListener("abort", onParentAbort);
  }
}

/**
 * Heuristic: series ticker is usually the leading segment before dated suffixes.
 * User can override via series_ticker in state when this fails.
 *
 * @param {string} marketTicker
 */
export function inferSeriesTickerFromMarket(marketTicker) {
  const t = String(marketTicker || "").trim().toUpperCase();
  if (!t) return "";
  const parts = t.split("-");
  if (parts.length <= 1) return t;
  return parts[0];
}
