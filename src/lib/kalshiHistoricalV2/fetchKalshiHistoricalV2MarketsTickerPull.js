import {
  applyKalshiLiveClientSort,
  applyKalshiLiveClientWhere,
} from "@/lib/kalshiLive/kalshiLiveCompose";
import { fetchKalshiHistoricalV2Market } from "@/lib/kalshiHistoricalV2/fetchKalshiHistoricalV2Market";
import {
  normalizeKalshiLiveMarketsSheetMode,
  parseKalshiLiveMarketsTickersInput,
  validateKalshiLiveMarketsPull,
} from "@/lib/kalshiLive/marketCompose";
import { summarizeKalshiLiveMarketsTickerPullRequest } from "@/lib/kalshiLive/marketCompose";
import { projectKalshiLiveMarketRows } from "@/lib/kalshiLive/normalizeMarketRow";

/**
 * @param {(ms: number) => Promise<void>} sleep
 * @param {AbortSignal | undefined} signal
 * @param {() => Promise<Record<string, unknown>>} run
 */
async function withRateLimitRetry(sleep, signal, run) {
  let attempt = 0;
  for (;;) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    try {
      return await run();
    } catch (e) {
      const status = e && typeof e === "object" && "status" in e ? Number(e.status) : 0;
      const retryAfterMs =
        e && typeof e === "object" && "retryAfterMs" in e ? Number(e.retryAfterMs) : null;
      if (status === 429 && attempt < 5) {
        await sleep(Number.isFinite(retryAfterMs) ? retryAfterMs : Math.min(20_000, 500 * 2 ** Math.max(0, attempt)));
        attempt += 1;
        continue;
      }
      throw e;
    }
  }
}

/**
 * Fetch one or more historical v2 markets via GET /historical/markets/{ticker} (looped).
 *
 * @param {{
 *   marketTickers: string;
 *   selectedColumns?: string[];
 *   whereFilters?: import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveWhereFilter[];
 *   sortClauses?: import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveSortClause[];
 *   sheetMode?: import("@/lib/kalshiLive/marketCompose").KalshiLiveMarketsSheetMode;
 *   signal?: AbortSignal;
 *   onTickerProgress?: (info: { ticker: string; index: number; total: number }) => void;
 * }} opts
 */
export async function fetchKalshiHistoricalV2MarketsTickerPull(opts) {
  const err = validateKalshiLiveMarketsPull(opts.marketTickers);
  if (err) throw new Error(err);

  const tickers = parseKalshiLiveMarketsTickersInput(opts.marketTickers);
  const whereFilters = Array.isArray(opts.whereFilters) ? opts.whereFilters : [];
  const sortClauses = Array.isArray(opts.sortClauses) ? opts.sortClauses : [];
  const sheetMode = normalizeKalshiLiveMarketsSheetMode(opts.sheetMode);

  const querySummary = summarizeKalshiLiveMarketsTickerPullRequest(tickers, { sheetMode });

  const sleep = (ms) =>
    new Promise((resolve, reject) => {
      if (opts.signal?.aborted) {
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      const t = setTimeout(resolve, ms);
      opts.signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(t);
          reject(new DOMException("Aborted", "AbortError"));
        },
        { once: true },
      );
    });

  /** @type {{ ticker: string; market: Record<string, unknown>; rows: Record<string, unknown>[] }[]} */
  const byTicker = [];
  /** @type {Record<string, unknown>[]} */
  const raw = [];
  /** @type {Record<string, unknown>[]} */
  const allRows = [];

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    opts.onTickerProgress?.({ ticker, index: i, total: tickers.length });

    const market = await withRateLimitRetry(sleep, opts.signal, () =>
      fetchKalshiHistoricalV2Market({ marketTicker: ticker, signal: opts.signal }),
    );

    const clientWhere = whereFilters.filter((f) => f.column !== "ticker");
    const sorted = applyKalshiLiveClientSort(
      applyKalshiLiveClientWhere([market], clientWhere),
      sortClauses,
      "markets",
    );
    const rows = projectKalshiLiveMarketRows(sorted, opts.selectedColumns);

    raw.push(market);
    byTicker.push({ ticker, market, rows });
    allRows.push(...rows);

    if (i < tickers.length - 1) await sleep(80);
  }

  return {
    byTicker,
    raw,
    rows: allRows,
    querySummary,
    sheetMode,
  };
}

