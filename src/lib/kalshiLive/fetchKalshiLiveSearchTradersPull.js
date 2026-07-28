import {
  KALSHI_LIVE_SEARCH_TRADERS_HOLDINGS_PER_TRADER_MAX,
  KALSHI_LIVE_SEARCH_TRADERS_LIMIT_DEFAULT,
  KALSHI_LIVE_SEARCH_TRADERS_PAGE_SIZE_MAX,
  normalizeKalshiLiveSearchTradersLimit,
  normalizeKalshiLiveSearchTradersQuery,
} from "@/lib/kalshiLive/searchTradersColumns";
import {
  summarizeKalshiLiveSearchTradersRequest,
  validateKalshiLiveSearchTradersPull,
} from "@/lib/kalshiLive/searchTradersCompose";
import { projectKalshiLiveSearchTradersRows } from "@/lib/kalshiLive/normalizeSearchTradersRow";
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
 * @param {string} url
 * @param {AbortSignal | undefined} signal
 * @param {(info: { label: string; progress: number }) => void} [onProgress]
 * @param {number} [progress]
 */
async function fetchJsonWithRetry(url, signal, onProgress, progress = 20) {
  let attempt = 0;
  /** @type {Response | null} */
  let res = null;
  /** @type {Record<string, unknown>} */
  let body = {};
  for (;;) {
    res = await fetch(url, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal,
    });
    body = await res.json().catch(() => ({}));
    if (!isRateLimited(res, body)) break;
    attempt += 1;
    if (attempt > 5) break;
    onProgress?.({
      label: "Rate limited — waiting to retry…",
      progress,
    });
    await sleep(rateLimitWaitMs(res, attempt), signal);
  }
  return { res, body };
}

/**
 * @param {Response | null} res
 * @param {Record<string, unknown>} body
 * @param {string} fallback
 */
function throwIfNotOk(res, body, fallback) {
  if (res?.ok) return;
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
          : res?.statusText || fallback;
  throw new Error(details ? `${base} (${details})` : base);
}

/**
 * Search traders by nickname prefix; optionally enrich with metrics / holdings.
 *
 * @param {{
 *   query?: string;
 *   limit?: number;
 *   includeMetrics?: boolean;
 *   includeHoldings?: boolean;
 *   closedPositions?: boolean;
 *   whereFilters?: import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveWhereFilter[];
 *   sortClauses?: import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveSortClause[];
 *   selectedColumns?: string[];
 *   signal?: AbortSignal;
 *   onProgress?: (info: { label: string; progress: number }) => void;
 * }} opts
 */
export async function fetchKalshiLiveSearchTradersPull(opts) {
  const query = normalizeKalshiLiveSearchTradersQuery(opts.query);
  const limit = normalizeKalshiLiveSearchTradersLimit(
    opts.limit ?? KALSHI_LIVE_SEARCH_TRADERS_LIMIT_DEFAULT,
  );
  const includeMetrics = !!opts.includeMetrics;
  const includeHoldings = !!opts.includeHoldings;
  const closedPositions = opts.closedPositions !== false;
  const whereFilters = Array.isArray(opts.whereFilters) ? opts.whereFilters : [];
  const sortClauses = Array.isArray(opts.sortClauses) ? opts.sortClauses : [];

  const err = validateKalshiLiveSearchTradersPull({
    query,
    limit,
    includeMetrics,
    includeHoldings,
  });
  if (err) throw new Error(err);

  if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");

  /** @type {Record<string, unknown>[]} */
  const profiles = [];
  let cursor = "";
  let page = 0;

  opts.onProgress?.({ label: "Searching Kalshi traders…", progress: 10 });

  while (profiles.length < limit) {
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const pageSize = Math.min(
      KALSHI_LIVE_SEARCH_TRADERS_PAGE_SIZE_MAX,
      limit - profiles.length,
    );
    if (pageSize < 1) break;

    const qs = new URLSearchParams({
      query,
      limit: String(pageSize),
    });
    if (cursor) qs.set("cursor", cursor);

    const { res, body } = await fetchJsonWithRetry(
      `/api/integrations/kalshi-live/search/social-profiles?${qs.toString()}`,
      opts.signal,
      opts.onProgress,
      Math.min(70, 10 + page * 8),
    );
    throwIfNotOk(res, body, "Trader search request failed");

    const batch = Array.isArray(body?.profiles) ? body.profiles : [];
    for (const p of batch) {
      if (profiles.length >= limit) break;
      if (p && typeof p === "object") {
        profiles.push(/** @type {Record<string, unknown>} */ (p));
      }
    }

    page += 1;
    const nextCursor = String(body?.cursor || "").trim();
    opts.onProgress?.({
      label: `Found ${profiles.length} trader${profiles.length === 1 ? "" : "s"}…`,
      progress: Math.min(55, 10 + page * 10),
    });

    if (!nextCursor || batch.length === 0 || profiles.length >= limit) break;
    cursor = nextCursor;
  }

  /** @type {Array<{ profile: Record<string, unknown>; metrics?: Record<string, unknown> | null; holdingsPayload?: Record<string, unknown> | null }>} */
  const enriched = [];

  for (let i = 0; i < profiles.length; i += 1) {
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const profile = profiles[i];
    const nickname = String(profile?.nickname || "").trim();
    /** @type {Record<string, unknown> | null} */
    let metrics = null;
    /** @type {Record<string, unknown> | null} */
    let holdingsPayload = null;

    const progress = Math.min(88, 55 + Math.round((i / Math.max(1, profiles.length)) * 30));

    if (includeMetrics && nickname) {
      opts.onProgress?.({
        label: `Fetching metrics for ${nickname}…`,
        progress,
      });
      const qs = new URLSearchParams({ nickname });
      const { res, body } = await fetchJsonWithRetry(
        `/api/integrations/kalshi-live/social/profile/metrics?${qs.toString()}`,
        opts.signal,
        opts.onProgress,
        progress,
      );
      if (res?.ok) {
        metrics = body;
      } else if (res?.status !== 404) {
        throwIfNotOk(res, body, `Metrics request failed for ${nickname}`);
      }
    }

    if (includeHoldings && nickname) {
      opts.onProgress?.({
        label: `Fetching holdings for ${nickname}…`,
        progress,
      });
      /** @type {unknown[]} */
      const holdingsAcc = [];
      let holdCursor = "";
      let visibilityState = "";
      let holdingsSocialId = "";

      while (holdingsAcc.length < KALSHI_LIVE_SEARCH_TRADERS_HOLDINGS_PER_TRADER_MAX) {
        const pageSize = Math.min(
          50,
          KALSHI_LIVE_SEARCH_TRADERS_HOLDINGS_PER_TRADER_MAX - holdingsAcc.length,
        );
        const qs = new URLSearchParams({
          nickname,
          limit: String(pageSize),
          closed_positions: closedPositions ? "true" : "false",
        });
        if (holdCursor) qs.set("cursor", holdCursor);

        const { res, body } = await fetchJsonWithRetry(
          `/api/integrations/kalshi-live/social/profile/holdings?${qs.toString()}`,
          opts.signal,
          opts.onProgress,
          progress,
        );
        throwIfNotOk(res, body, `Holdings request failed for ${nickname}`);

        const batch = Array.isArray(body?.holdings) ? body.holdings : [];
        for (const h of batch) {
          if (holdingsAcc.length >= KALSHI_LIVE_SEARCH_TRADERS_HOLDINGS_PER_TRADER_MAX) break;
          holdingsAcc.push(h);
        }
        if (typeof body?.visibility_state === "string") {
          visibilityState = body.visibility_state;
        }
        if (typeof body?.social_id === "string") {
          holdingsSocialId = body.social_id;
        }

        const next = String(body?.cursor || "").trim();
        if (!next || batch.length === 0) break;
        holdCursor = next;
      }

      holdingsPayload = {
        holdings: holdingsAcc,
        visibility_state: visibilityState,
        social_id: holdingsSocialId,
      };
    }

    enriched.push({ profile, metrics, holdingsPayload });
  }

  opts.onProgress?.({ label: "Projecting trader search rows…", progress: 92 });

  let rows = projectKalshiLiveSearchTradersRows(enriched, opts.selectedColumns, {
    includeMetrics,
    includeHoldings,
    closedPositions,
  });
  rows = applyKalshiLiveClientWhere(rows, whereFilters);
  rows = applyKalshiLiveClientSort(rows, sortClauses);

  return {
    raw: enriched,
    rows,
    query,
    limit,
    includeMetrics,
    includeHoldings,
    closedPositions,
    profileCount: profiles.length,
    querySummary: summarizeKalshiLiveSearchTradersRequest({
      query,
      limit,
      includeMetrics,
      includeHoldings,
      profileCount: profiles.length,
      loadedRowCount: rows.length,
    }),
  };
}
