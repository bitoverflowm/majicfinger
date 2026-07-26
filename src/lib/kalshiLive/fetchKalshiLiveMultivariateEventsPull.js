import {
  buildKalshiLiveMultivariateEventsDiscoveryQueryParams,
  clampMultivariateEventsPageLimit,
  KALSHI_LIVE_MULTIVARIATE_EVENTS_MAX_ROWS,
  summarizeKalshiLiveMultivariateEventsDiscoveryRequest,
  validateKalshiLiveMultivariateEventsDiscoveryPull,
} from "@/lib/kalshiLive/multivariateEventsDiscovery";
import { normalizeKalshiLiveEventsRowMode } from "@/lib/kalshiLive/eventCompose";
import { projectKalshiLiveEventPayloads } from "@/lib/kalshiLive/normalizeEventRow";

/**
 * Discovery pull: GET /events/multivariate with series / collection filters.
 * Paginates with cursor until exhausted or the 20k soft row cap.
 * Always a single combined sheet.
 *
 * @param {{
 *   params: import("@/lib/kalshiLive/multivariateEventsDiscovery").KalshiLiveMultivariateEventsDiscoveryParams;
 *   selectedColumns?: string[];
 *   includeMarkets?: boolean;
 *   rowMode?: import("@/lib/kalshiLive/eventCompose").KalshiLiveEventsRowMode;
 *   pageLimit?: number;
 *   signal?: AbortSignal;
 *   onPage?: (info: {
 *     page: number;
 *     batchSize: number;
 *     totalLoaded: number;
 *     cursor: string | null;
 *   }) => void;
 * }} opts
 */
export async function fetchKalshiLiveMultivariateEventsPull(opts) {
  const params = opts.params || {};
  const err = validateKalshiLiveMultivariateEventsDiscoveryPull(params);
  if (err) throw new Error(err);

  const includeMarkets = !!opts.includeMarkets;
  const rowMode = normalizeKalshiLiveEventsRowMode(opts.rowMode);
  const pageLimit = clampMultivariateEventsPageLimit(opts.pageLimit);

  /** @type {Array<{ event: Record<string, unknown>; markets?: unknown[] }>} */
  const raw = [];
  let cursor = "";
  let page = 0;
  let totalExpanded = 0;

  while (totalExpanded < KALSHI_LIVE_MULTIVARIATE_EVENTS_MAX_ROWS) {
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const remaining = KALSHI_LIVE_MULTIVARIATE_EVENTS_MAX_ROWS - totalExpanded;
    const built = buildKalshiLiveMultivariateEventsDiscoveryQueryParams(params, {
      limit: Math.min(pageLimit, remaining),
      withNestedMarkets: includeMarkets,
    });
    const qs = new URLSearchParams(built);
    if (cursor) qs.set("cursor", cursor);

    const res = await fetch(
      `/api/integrations/kalshi-live/events/multivariate?${qs.toString()}`,
      {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
        signal: opts.signal,
      },
    );
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        typeof body?.error === "string"
          ? body.error
          : typeof body?.message === "string"
            ? body.message
            : res.statusText || "Multivariate events request failed",
      );
    }

    const events = Array.isArray(body?.events) ? body.events : [];
    const batchPayloads = events.map((event) => {
      const eventObj =
        event && typeof event === "object"
          ? /** @type {Record<string, unknown>} */ (event)
          : {};
      return {
        event: eventObj,
        markets: Array.isArray(eventObj.markets) ? eventObj.markets : [],
      };
    });

    const batchRows = projectKalshiLiveEventPayloads(batchPayloads, opts.selectedColumns, {
      includeMarkets,
      rowMode,
    });

    raw.push(...batchPayloads);
    totalExpanded += batchRows.length;
    page += 1;
    cursor = String(body?.cursor || "").trim();

    opts.onPage?.({
      page,
      batchSize: events.length,
      totalLoaded: totalExpanded,
      cursor: cursor || null,
    });

    if (!cursor || events.length === 0) break;
    if (totalExpanded >= KALSHI_LIVE_MULTIVARIATE_EVENTS_MAX_ROWS) break;
  }

  const rows = projectKalshiLiveEventPayloads(raw, opts.selectedColumns, {
    includeMarkets,
    rowMode,
  }).slice(0, KALSHI_LIVE_MULTIVARIATE_EVENTS_MAX_ROWS);

  return {
    raw,
    rows,
    querySummary: summarizeKalshiLiveMultivariateEventsDiscoveryRequest(params, {
      loadedRowCount: rows.length,
      includeMarkets,
      rowMode,
      pageLimit,
    }),
    truncated: rows.length >= KALSHI_LIVE_MULTIVARIATE_EVENTS_MAX_ROWS && !!cursor,
  };
}
