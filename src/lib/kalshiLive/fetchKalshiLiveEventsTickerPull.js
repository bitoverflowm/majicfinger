import {
  normalizeKalshiLiveEventsRowMode,
  normalizeKalshiLiveEventsSheetMode,
  parseKalshiLiveEventsTickersInput,
  summarizeKalshiLiveEventsTickerPullRequest,
  validateKalshiLiveEventsPull,
} from "@/lib/kalshiLive/eventCompose";
import { fetchKalshiLiveEvent } from "@/lib/kalshiLive/fetchKalshiLiveEvent";
import { projectKalshiLiveEventPayloads } from "@/lib/kalshiLive/normalizeEventRow";

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
 * @param {() => Promise<{ event: Record<string, unknown>; markets: unknown[] }>} run
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
 * Fetch one or more events via GET /events/{event_ticker} (looped).
 *
 * @param {{
 *   eventTickers: string;
 *   selectedColumns?: string[];
 *   includeMarkets?: boolean;
 *   rowMode?: import("@/lib/kalshiLive/eventCompose").KalshiLiveEventsRowMode;
 *   sheetMode?: import("@/lib/kalshiLive/eventCompose").KalshiLiveEventsSheetMode;
 *   signal?: AbortSignal;
 *   onTickerProgress?: (info: { ticker: string; index: number; total: number }) => void;
 * }} opts
 */
export async function fetchKalshiLiveEventsTickerPull(opts) {
  const err = validateKalshiLiveEventsPull(opts.eventTickers);
  if (err) throw new Error(err);

  const tickers = parseKalshiLiveEventsTickersInput(opts.eventTickers);
  const includeMarkets = !!opts.includeMarkets;
  const rowMode = normalizeKalshiLiveEventsRowMode(opts.rowMode);
  const sheetMode = normalizeKalshiLiveEventsSheetMode(opts.sheetMode);
  const querySummary = summarizeKalshiLiveEventsTickerPullRequest(tickers, {
    sheetMode,
    includeMarkets,
    rowMode,
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

  /** @type {{ ticker: string; event: Record<string, unknown>; markets: unknown[]; rows: Record<string, unknown>[] }[]} */
  const byTicker = [];
  /** @type {Array<{ event: Record<string, unknown>; markets: unknown[] }>} */
  const raw = [];
  /** @type {Record<string, unknown>[]} */
  const allRows = [];

  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    opts.onTickerProgress?.({ ticker, index: i, total: tickers.length });

    const payload = await withRateLimitRetry(sleep, opts.signal, () =>
      fetchKalshiLiveEvent({
        eventTicker: ticker,
        withNestedMarkets: includeMarkets,
        signal: opts.signal,
      }),
    );

    const rows = projectKalshiLiveEventPayloads([payload], opts.selectedColumns, {
      includeMarkets,
      rowMode,
    });

    raw.push(payload);
    byTicker.push({ ticker, event: payload.event, markets: payload.markets, rows });
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
