import {
  applyKalshiLiveClientSort,
  applyKalshiLiveClientWhere,
} from "@/lib/kalshiLive/kalshiLiveCompose";
import {
  normalizeKalshiLiveOrderbook,
  projectKalshiLiveOrderbookRows,
} from "@/lib/kalshiLive/normalizeOrderbookRow";
import {
  partitionOrderbookApiParams,
  summarizeKalshiLiveOrderbookRequest,
} from "@/lib/kalshiLive/orderbookCompose";
import { parseKalshiLiveOrderbookTickersInput } from "@/lib/kalshiLive/orderbookColumns";

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
 * Client fetch for Kalshi Live market orderbook (via same-origin proxy).
 * Fetches one market at a time so each ticker can land in its own sheet.
 *
 * @param {{
 *   marketTickers?: string;
 *   marketTicker?: string;
 *   whereFilters?: import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveWhereFilter[];
 *   sortClauses?: import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveSortClause[];
 *   selectedColumns?: string[];
 *   signal?: AbortSignal;
 *   onTickerProgress?: (info: { ticker: string; index: number; total: number }) => void;
 * }} opts
 * @returns {Promise<{
 *   byTicker: { ticker: string; raw: Record<string, unknown>[]; rows: Record<string, unknown>[] }[];
 *   raw: Record<string, unknown>[];
 *   rows: Record<string, unknown>[];
 *   querySummary: string;
 * }>}
 */
export async function fetchKalshiLiveOrderbookPull(opts) {
  const tickers = parseKalshiLiveOrderbookTickersInput(opts.marketTickers || opts.marketTicker);
  const whereFilters = Array.isArray(opts.whereFilters) ? opts.whereFilters : [];
  const sortClauses = Array.isArray(opts.sortClauses) ? opts.sortClauses : [];
  const { apiParams, clientWhere } = partitionOrderbookApiParams(whereFilters);

  if (!tickers.length) {
    throw new Error("Enter at least one market ticker.");
  }

  /** @type {{ ticker: string; raw: Record<string, unknown>[]; rows: Record<string, unknown>[] }[]} */
  const byTicker = [];

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    opts.onTickerProgress?.({ ticker, index: i, total: tickers.length });

    const qs = new URLSearchParams({ ticker });
    if (Number.isFinite(Number(apiParams.depth))) {
      qs.set("depth", String(apiParams.depth));
    }

    let res;
    let body = {};
    let rateAttempts = 0;
    for (;;) {
      res = await fetch(`/api/integrations/kalshi-live/markets/orderbook?${qs.toString()}`, {
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
          : typeof body?.message === "string"
            ? `${ticker}: ${body.message}`
            : `${ticker}: ${res.statusText || "Orderbook request failed"}`,
      );
    }

    const normalized = normalizeKalshiLiveOrderbook(ticker, body?.orderbook_fp);
    const filtered = applyKalshiLiveClientWhere(normalized, clientWhere);
    const sorted = applyKalshiLiveClientSort(filtered, sortClauses, "orderbook");
    const rows = projectKalshiLiveOrderbookRows(sorted, opts.selectedColumns);
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
    querySummary: summarizeKalshiLiveOrderbookRequest(tickers, apiParams),
  };
}
