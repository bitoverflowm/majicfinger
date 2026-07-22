import { fetchKalshiLiveSeries } from "@/lib/kalshiLive/fetchKalshiLiveSeries";
import { projectKalshiLiveSeriesRows } from "@/lib/kalshiLive/normalizeSeriesRow";
import {
  normalizeKalshiLiveSeriesSheetMode,
  parseKalshiLiveSeriesTickersInput,
  summarizeKalshiLiveSeriesPullRequest,
  validateKalshiLiveSeriesPull,
} from "@/lib/kalshiLive/seriesCompose";
import { kalshiLiveSeriesWantsIncludeVolume } from "@/lib/kalshiLive/seriesColumns";

/**
 * @param {number} attempt
 * @param {number | null} retryAfterMs
 */
function backoffMs(attempt, retryAfterMs) {
  if (retryAfterMs != null) return retryAfterMs;
  return Math.min(20_000, 500 * 2 ** Math.max(0, attempt));
}

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
        await sleep(backoffMs(attempt, Number.isFinite(retryAfterMs) ? retryAfterMs : null));
        attempt += 1;
        continue;
      }
      throw e;
    }
  }
}

/**
 * Fetch one or more series via GET /series/{series_ticker} (looped).
 *
 * @param {{
 *   seriesTickers: string;
 *   selectedColumns?: string[];
 *   sheetMode?: import("@/lib/kalshiLive/seriesCompose").KalshiLiveSeriesSheetMode;
 *   signal?: AbortSignal;
 *   onTickerProgress?: (info: { ticker: string; index: number; total: number }) => void;
 * }} opts
 */
export async function fetchKalshiLiveSeriesPull(opts) {
  const err = validateKalshiLiveSeriesPull(opts.seriesTickers);
  if (err) throw new Error(err);

  const tickers = parseKalshiLiveSeriesTickersInput(opts.seriesTickers);
  const includeVolume = kalshiLiveSeriesWantsIncludeVolume(opts.selectedColumns);
  const sheetMode = normalizeKalshiLiveSeriesSheetMode(opts.sheetMode);
  const querySummary = summarizeKalshiLiveSeriesPullRequest(tickers, {
    includeVolume,
    sheetMode,
  });

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

  /** @type {{ ticker: string; series: Record<string, unknown>; rows: Record<string, unknown>[] }[]} */
  const byTicker = [];
  /** @type {Record<string, unknown>[]} */
  const raw = [];
  /** @type {Record<string, unknown>[]} */
  const allRows = [];

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    opts.onTickerProgress?.({ ticker, index: i, total: tickers.length });

    const series = await withRateLimitRetry(sleep, opts.signal, async () => {
      try {
        return await fetchKalshiLiveSeries({
          seriesTicker: ticker,
          includeVolume,
          signal: opts.signal,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        if (/429|rate limit/i.test(msg)) {
          const err429 = new Error(msg);
          // @ts-expect-error status for retry helper
          err429.status = 429;
          throw err429;
        }
        throw e;
      }
    });

    const rows = projectKalshiLiveSeriesRows([series], opts.selectedColumns);
    raw.push(series);
    byTicker.push({ ticker, series, rows });
    allRows.push(...rows);

    // Small courtesy pause between tickers to reduce 429s.
    if (i < tickers.length - 1) await sleep(80);
  }

  return {
    byTicker,
    raw,
    rows: allRows,
    querySummary,
    sheetMode,
    includeVolume,
  };
}
