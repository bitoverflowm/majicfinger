import {
  KALSHI_LIVE_HOLDER_TRADES_LIMIT_DEFAULT,
  KALSHI_LIVE_HOLDER_TRADES_PAGE_SIZE_MAX,
  normalizeKalshiLiveHolderTradesLimit,
  normalizeKalshiLiveHolderTradesMinAmount,
} from "@/lib/kalshiLive/holderTradesColumns";
import {
  summarizeKalshiLiveHolderTradesRequest,
  validateKalshiLiveHolderTradesPull,
} from "@/lib/kalshiLive/holderTradesCompose";
import { projectKalshiLiveHolderTradeRows } from "@/lib/kalshiLive/normalizeHolderTradeRow";
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
 * Pull Kalshi social trades (public feed / filtered by nickname, series, event).
 * Follows cursor until Refine row limit is reached.
 *
 * @param {{
 *   nickname?: string;
 *   seriesTicker?: string;
 *   eventTicker?: string;
 *   minAmount?: unknown;
 *   limit?: number;
 *   whereFilters?: import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveWhereFilter[];
 *   sortClauses?: import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveSortClause[];
 *   selectedColumns?: string[];
 *   signal?: AbortSignal;
 *   onProgress?: (info: { label: string; progress: number }) => void;
 * }} opts
 */
export async function fetchKalshiLiveHolderTradesPull(opts) {
  const nickname = String(opts.nickname || "").trim();
  const seriesTicker = String(opts.seriesTicker || "").trim();
  const eventTicker = String(opts.eventTicker || "").trim();
  const minAmount = normalizeKalshiLiveHolderTradesMinAmount(opts.minAmount);
  const limit = normalizeKalshiLiveHolderTradesLimit(
    opts.limit ?? KALSHI_LIVE_HOLDER_TRADES_LIMIT_DEFAULT,
  );
  const whereFilters = Array.isArray(opts.whereFilters) ? opts.whereFilters : [];
  const sortClauses = Array.isArray(opts.sortClauses) ? opts.sortClauses : [];

  const err = validateKalshiLiveHolderTradesPull({
    nickname,
    seriesTicker,
    eventTicker,
    minAmount: opts.minAmount,
    limit,
  });
  if (err) throw new Error(err);

  if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");

  /** @type {Record<string, unknown>[]} */
  const accumulated = [];
  let cursor = "";
  let page = 0;
  let visibilityState = "";

  opts.onProgress?.({ label: "Fetching Kalshi trader trades…", progress: 12 });

  while (accumulated.length < limit) {
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const pageSize = Math.min(
      KALSHI_LIVE_HOLDER_TRADES_PAGE_SIZE_MAX,
      limit - accumulated.length,
    );
    if (pageSize < 1) break;

    const qs = new URLSearchParams({ page_size: String(pageSize) });
    if (nickname) qs.set("nickname", nickname);
    if (seriesTicker) qs.set("series_ticker", seriesTicker);
    if (eventTicker) qs.set("event_ticker", eventTicker);
    if (minAmount != null) qs.set("min_amount", String(minAmount));
    if (cursor) qs.set("cursor", cursor);

    let attempt = 0;
    /** @type {Response | null} */
    let res = null;
    /** @type {Record<string, unknown>} */
    let body = {};

    for (;;) {
      res = await fetch(`/api/integrations/kalshi-live/social/trades?${qs.toString()}`, {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: opts.signal,
      });
      body = await res.json().catch(() => ({}));
      if (!isRateLimited(res, body)) break;
      attempt += 1;
      if (attempt > 5) break;
      opts.onProgress?.({
        label: "Rate limited — waiting to retry…",
        progress: Math.min(90, 12 + page * 8),
      });
      await sleep(rateLimitWaitMs(res, attempt), opts.signal);
    }

    if (!res?.ok) {
      const nested =
        body?.error && typeof body.error === "object" ? body.error.message : null;
      const details = typeof body?.details === "string" ? body.details : "";
      const base =
        typeof body?.error === "string"
          ? body.error
          : typeof nested === "string"
            ? nested
            : typeof body?.message === "string"
              ? body.message
              : res?.statusText || "Holder trades request failed";
      throw new Error(details ? `${base} (${details})` : base);
    }

    const trades = Array.isArray(body?.trades) ? body.trades : [];
    const vis = String(body?.visibility_state || "").trim();
    if (vis) visibilityState = vis;

    if (page === 0 && nickname && vis === "hidden" && trades.length === 0) {
      throw new Error(
        `Trade activity for “${nickname}” is hidden (visibility_state=hidden). Try another nickname, or omit nickname to browse the public trades feed.`,
      );
    }

    for (const t of trades) {
      if (accumulated.length >= limit) break;
      if (t && typeof t === "object") accumulated.push(/** @type {Record<string, unknown>} */ (t));
    }

    page += 1;
    const nextCursor = String(body?.cursor || "").trim();
    opts.onProgress?.({
      label: `Loaded ${accumulated.length} trader trade${accumulated.length === 1 ? "" : "s"}…`,
      progress: Math.min(88, 12 + page * 10),
    });

    if (!nextCursor || trades.length === 0 || accumulated.length >= limit) break;
    cursor = nextCursor;
  }

  opts.onProgress?.({ label: "Projecting trader trade rows…", progress: 92 });

  let rows = projectKalshiLiveHolderTradeRows(accumulated, opts.selectedColumns);
  rows = applyKalshiLiveClientWhere(rows, whereFilters);
  rows = applyKalshiLiveClientSort(rows, sortClauses);

  return {
    raw: accumulated,
    rows,
    nickname,
    seriesTicker,
    eventTicker,
    minAmount,
    limit,
    visibilityState,
    querySummary: summarizeKalshiLiveHolderTradesRequest({
      nickname,
      seriesTicker,
      eventTicker,
      minAmount,
      limit,
      loadedRowCount: rows.length,
      visibilityState: visibilityState || undefined,
    }),
  };
}
