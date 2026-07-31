import {
  partitionHistoricalCandlestickApiParams,
  summarizeKalshiHistoricalV2CandlestickRequest,
  validateKalshiHistoricalV2CandlestickPull,
} from "@/lib/kalshiHistoricalV2/historicalCandlestickCompose";
import {
  flattenKalshiHistoricalV2CandlestickGroups,
  projectKalshiHistoricalV2CandlestickRows,
} from "@/lib/kalshiHistoricalV2/normalizeHistoricalCandlestickRow";
import { parseKalshiLiveMarketTickersInput } from "@/lib/kalshiLive/candlesticksColumns";
import {
  applyKalshiLiveClientSort,
  applyKalshiLiveClientWhere,
} from "@/lib/kalshiLive/kalshiLiveCompose";

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const t = setTimeout(() => {
      signal?.removeEventListener?.("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener?.("abort", onAbort, { once: true });
  });
}

/**
 * @param {Response} res
 * @param {Record<string, unknown>} body
 */
function isRateLimited(res, body) {
  if (res.status === 429) return true;
  const err = String(body?.error || body?.message || "").toLowerCase();
  return err.includes("rate limit") || err.includes("too many requests");
}

/**
 * @param {Response} res
 * @param {number} attempt
 */
function rateLimitWaitMs(res, attempt) {
  const retryAfter = Number(res.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) {
    return Math.min(60_000, Math.max(1000, retryAfter * 1000));
  }
  return Math.min(30_000, 1000 * 2 ** Math.min(attempt, 4));
}

/**
 * Historical candlesticks: one GET /historical/markets/{ticker}/candlesticks per market.
 *
 * @param {{
 *   marketTickers: string;
 *   whereFilters?: import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveWhereFilter[];
 *   sortClauses?: import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveSortClause[];
 *   limit?: number;
 *   selectedColumns?: string[];
 *   signal?: AbortSignal;
 *   onTickerProgress?: (info: { ticker: string; index: number; total: number }) => void;
 * }} opts
 */
export async function fetchKalshiHistoricalV2CandlesticksPull(opts) {
  const err = validateKalshiHistoricalV2CandlestickPull(opts.marketTickers, opts.whereFilters);
  if (err) throw new Error(err);

  const tickers = parseKalshiLiveMarketTickersInput(opts.marketTickers);
  const whereFilters = Array.isArray(opts.whereFilters) ? opts.whereFilters : [];
  const sortClauses = Array.isArray(opts.sortClauses) ? opts.sortClauses : [];
  const { apiParams, clientWhere } = partitionHistoricalCandlestickApiParams(whereFilters);
  const maxPerTicker = Math.max(1, Math.min(10_000, Math.floor(Number(opts.limit) || 1000)));

  /** @type {{ ticker: string; raw: Record<string, unknown>[]; rows: Record<string, unknown>[] }[]} */
  const byTicker = [];

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    opts.onTickerProgress?.({ ticker, index: i, total: tickers.length });

    const qs = new URLSearchParams({
      ticker,
      start_ts: String(apiParams.start_ts),
      end_ts: String(apiParams.end_ts),
      period_interval: String(apiParams.period_interval),
    });

    let res;
    let body = {};
    let rateAttempts = 0;
    for (;;) {
      res = await fetch(
        `/api/integrations/kalshi-live/historical/markets/candlesticks?${qs.toString()}`,
        {
          credentials: "same-origin",
          headers: { Accept: "application/json" },
          signal: opts.signal,
        },
      );
      body = await res.json().catch(() => ({}));
      if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");

      if (isRateLimited(res, body) && rateAttempts < 6) {
        rateAttempts += 1;
        await sleep(rateLimitWaitMs(res, rateAttempts), opts.signal);
        continue;
      }
      break;
    }

    if (!res.ok) {
      throw new Error(
        typeof body?.error === "string"
          ? `${ticker}: ${body.error}`
          : `${ticker}: ${res.statusText || "Historical candlesticks request failed"}`,
      );
    }

    const markets = Array.isArray(body?.markets)
      ? body.markets
      : [
          {
            market_ticker: String(body?.ticker || ticker),
            candlesticks: Array.isArray(body?.candlesticks) ? body.candlesticks : [],
          },
        ];

    const flat = flattenKalshiHistoricalV2CandlestickGroups(markets);
    const capped = flat.slice(0, maxPerTicker);
    const filtered = applyKalshiLiveClientWhere(capped, clientWhere);
    const sorted = applyKalshiLiveClientSort(filtered, sortClauses, "candlesticks");
    const rows = projectKalshiHistoricalV2CandlestickRows(sorted, opts.selectedColumns);
    byTicker.push({ ticker, raw: sorted, rows });

    if (i < tickers.length - 1) {
      await sleep(150, opts.signal);
    }
  }

  const raw = byTicker.flatMap((g) => g.raw);
  const rows = byTicker.flatMap((g) => g.rows);

  return {
    byTicker,
    raw,
    rows,
    querySummary: summarizeKalshiHistoricalV2CandlestickRequest(tickers, apiParams, {
      limit: maxPerTicker,
    }),
  };
}
