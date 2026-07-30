import {
  applyKalshiLiveClientSort,
  applyKalshiLiveClientWhere,
} from "@/lib/kalshiLive/kalshiLiveCompose";
import { partitionTradesApiParams } from "@/lib/kalshiLive/tradeCompose";
import { parseKalshiLiveTradesTickersInput } from "@/lib/kalshiLive/tradesColumns";
import {
  KALSHI_HISTORICAL_V2_TRADES_PAGE_LIMIT_MAX,
  isKalshiHistoricalV2TradesPullScoped,
  resolveKalshiHistoricalV2TradesRowCap,
  summarizeKalshiHistoricalV2TradesRequest,
  validateKalshiHistoricalV2TradesPull,
} from "@/lib/kalshiHistoricalV2/historicalTradesCompose";
import {
  normalizeKalshiHistoricalV2Trades,
  projectKalshiHistoricalV2TradeRows,
} from "@/lib/kalshiHistoricalV2/normalizeHistoricalTradeRow";

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
 * Paginated GET /historical/trades pull.
 *
 * - Multiple market tickers → one group per ticker (caller writes one sheet each).
 * - No tickers → single combined group (unscoped).
 * - No ticker and no date range → hard-capped at 1000 rows.
 * - Otherwise paginate until refine limit or cursor exhausted.
 *
 * @param {{
 *   marketTickers?: string;
 *   whereFilters?: import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveWhereFilter[];
 *   sortClauses?: import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveSortClause[];
 *   limit?: number;
 *   includeBlockTrades?: boolean;
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
 */
export async function fetchKalshiHistoricalV2TradesPull(opts) {
  const tickersRaw = opts.marketTickers || "";
  const err = validateKalshiHistoricalV2TradesPull(tickersRaw, opts.whereFilters);
  if (err) throw new Error(err);

  const tickers = parseKalshiLiveTradesTickersInput(tickersRaw);
  const whereFilters = Array.isArray(opts.whereFilters) ? opts.whereFilters : [];
  const sortClauses = Array.isArray(opts.sortClauses) ? opts.sortClauses : [];
  const { apiParams, clientWhere } = partitionTradesApiParams(whereFilters);
  const includeBlockTrades = opts.includeBlockTrades !== false;
  const unscoped = !isKalshiHistoricalV2TradesPullScoped(tickersRaw, whereFilters);
  const rowCap = resolveKalshiHistoricalV2TradesRowCap({
    tickersRaw,
    whereFilters,
    limit: opts.limit,
  });

  /** @type {string[]} */
  const queryKeys = tickers.length ? tickers : [""];

  /** @type {{ ticker: string; raw: Record<string, unknown>[]; rows: Record<string, unknown>[] }[]} */
  const byTicker = [];

  for (let i = 0; i < queryKeys.length; i++) {
    const ticker = queryKeys[i];
    const label = ticker || "all";
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    opts.onTickerProgress?.({ ticker: label, index: i, total: queryKeys.length });

    /** @type {Record<string, unknown>[]} */
    const all = [];
    let cursor = "";
    let page = 0;

    while (all.length < rowCap) {
      if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");

      const remaining = rowCap - all.length;
      const pageLimit = Math.min(KALSHI_HISTORICAL_V2_TRADES_PAGE_LIMIT_MAX, remaining);

      const qs = new URLSearchParams({ limit: String(pageLimit) });
      if (ticker) qs.set("ticker", ticker);
      if (cursor) qs.set("cursor", cursor);
      if (Number.isFinite(Number(apiParams.min_ts))) {
        qs.set("min_ts", String(apiParams.min_ts));
      }
      if (Number.isFinite(Number(apiParams.max_ts))) {
        qs.set("max_ts", String(apiParams.max_ts));
      }
      if (!includeBlockTrades) qs.set("is_block_trade", "false");

      let res;
      let body = {};
      let rateAttempts = 0;
      for (;;) {
        res = await fetch(`/api/integrations/kalshi-live/historical/trades?${qs.toString()}`, {
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
            ? `${label}: ${body.error}`
            : `${label}: ${res.statusText || "Historical trades request failed"}`,
        );
      }

      const batch = normalizeKalshiHistoricalV2Trades(body?.trades);
      const slice = batch.slice(0, remaining);
      all.push(...slice);
      page += 1;
      cursor = String(body?.cursor || "").trim();

      await opts.onPage?.({
        ticker: label,
        page,
        rows: slice,
        totalLoaded: all.length,
      });

      if (all.length >= rowCap) break;
      if (!cursor || batch.length === 0) break;
    }

    const filtered = applyKalshiLiveClientWhere(all, clientWhere);
    const sorted = applyKalshiLiveClientSort(filtered, sortClauses, "trades");
    const rows = projectKalshiHistoricalV2TradeRows(sorted, opts.selectedColumns);
    byTicker.push({ ticker: label, raw: sorted, rows });

    if (i < queryKeys.length - 1) {
      await sleep(150, opts.signal);
    }
  }

  const raw = byTicker.flatMap((g) => g.raw);
  const rows = byTicker.flatMap((g) => g.rows);

  return {
    byTicker,
    raw,
    rows,
    querySummary: summarizeKalshiHistoricalV2TradesRequest({
      tickers,
      apiParams,
      includeBlockTrades,
      limit: rowCap,
      unscoped,
    }),
    unscoped,
    rowCap,
  };
}
