import {
  applyKalshiLiveClientSort,
  applyKalshiLiveClientWhere,
} from "@/lib/kalshiLive/kalshiLiveCompose";
import {
  normalizeKalshiLiveTrades,
  projectKalshiLiveTradeRows,
} from "@/lib/kalshiLive/normalizeTradeRow";
import {
  KALSHI_LIVE_TRADES_DEFAULT_LIMIT,
  KALSHI_LIVE_TRADES_PAGE_LIMIT_MAX,
  KALSHI_LIVE_TRADES_ROW_LIMIT_MAX,
  partitionTradesApiParams,
  summarizeKalshiLiveTradesRequest,
} from "@/lib/kalshiLive/tradeCompose";
import { parseKalshiLiveTradesTickersInput } from "@/lib/kalshiLive/tradesColumns";

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
 * Paginated client fetch for Kalshi Live trades (via same-origin proxy).
 * Fetches one market at a time so each ticker can land in its own sheet.
 * Paginated with cursor until the Refine row limit is reached (or the market is exhausted).
 *
 * @param {{
 *   marketTickers?: string;
 *   marketTicker?: string;
 *   whereFilters?: import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveWhereFilter[];
 *   sortClauses?: import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveSortClause[];
 *   limit?: number;
 *   selectedColumns?: string[];
 *   signal?: AbortSignal;
 *   onTickerProgress?: (info: { ticker: string; index: number; total: number }) => void;
 *   onPage?: (info: {
 *     ticker: string;
 *     page: number;
 *     rows: Record<string, unknown>[];
 *     totalLoaded: number;
 *   }) => void | Promise<void>;
 * }} opts
 * @returns {Promise<{
 *   byTicker: { ticker: string; raw: Record<string, unknown>[]; rows: Record<string, unknown>[] }[];
 *   raw: Record<string, unknown>[];
 *   rows: Record<string, unknown>[];
 *   querySummary: string;
 * }>}
 */
export async function fetchKalshiLiveTradesPull(opts) {
  const tickers = parseKalshiLiveTradesTickersInput(opts.marketTickers || opts.marketTicker);
  const whereFilters = Array.isArray(opts.whereFilters) ? opts.whereFilters : [];
  const sortClauses = Array.isArray(opts.sortClauses) ? opts.sortClauses : [];
  const { apiParams, clientWhere } = partitionTradesApiParams(whereFilters);
  const maxPerTicker = Math.max(
    1,
    Math.min(
      KALSHI_LIVE_TRADES_ROW_LIMIT_MAX,
      Math.floor(Number(opts.limit) || KALSHI_LIVE_TRADES_DEFAULT_LIMIT),
    ),
  );

  /** @type {{ ticker: string; raw: Record<string, unknown>[]; rows: Record<string, unknown>[] }[]} */
  const byTicker = [];

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    opts.onTickerProgress?.({ ticker, index: i, total: tickers.length });

    /** @type {Record<string, unknown>[]} */
    const all = [];
    let cursor = "";
    let page = 0;

    while (all.length < maxPerTicker) {
      if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");

      const remaining = maxPerTicker - all.length;
      const pageLimit = Math.min(KALSHI_LIVE_TRADES_PAGE_LIMIT_MAX, remaining);

      const qs = new URLSearchParams({
        ticker,
        limit: String(pageLimit),
      });
      if (cursor) qs.set("cursor", cursor);
      if (Number.isFinite(Number(apiParams.min_ts))) {
        qs.set("min_ts", String(apiParams.min_ts));
      }
      if (Number.isFinite(Number(apiParams.max_ts))) {
        qs.set("max_ts", String(apiParams.max_ts));
      }

      let res;
      let body = {};
      let rateAttempts = 0;
      for (;;) {
        res = await fetch(`/api/integrations/kalshi-live/markets/trades?${qs.toString()}`, {
          credentials: "same-origin",
          headers: { Accept: "application/json" },
          signal: opts.signal,
        });
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
            : `${ticker}: ${res.statusText || "Trades request failed"}`,
        );
      }

      const batch = normalizeKalshiLiveTrades(body?.trades);
      const slice = batch.slice(0, remaining);
      all.push(...slice);
      page += 1;
      cursor = String(body?.cursor || "").trim();

      await opts.onPage?.({
        ticker,
        page,
        rows: slice,
        totalLoaded: all.length,
      });

      if (all.length >= maxPerTicker) break;
      if (!cursor || batch.length === 0) break;
    }

    const filtered = applyKalshiLiveClientWhere(all, clientWhere);
    const sorted = applyKalshiLiveClientSort(filtered, sortClauses, "trades");
    const rows = projectKalshiLiveTradeRows(sorted, opts.selectedColumns);
    byTicker.push({ ticker, raw: sorted, rows });

    // Brief pause between markets to reduce rate-limit pressure.
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
    querySummary: summarizeKalshiLiveTradesRequest(tickers, apiParams, { limit: maxPerTicker }),
  };
}
