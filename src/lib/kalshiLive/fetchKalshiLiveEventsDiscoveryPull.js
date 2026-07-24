import {
  buildKalshiLiveEventsDiscoveryQueryParams,
  KALSHI_LIVE_EVENTS_DISCOVERY_MAX_ROWS,
  summarizeKalshiLiveEventsDiscoveryRequest,
  validateKalshiLiveEventsDiscoveryPull,
} from "@/lib/kalshiLive/eventDiscovery";
import { normalizeKalshiLiveEventsRowMode } from "@/lib/kalshiLive/eventCompose";
import { kalshiLiveEventsWantsMilestones } from "@/lib/kalshiLive/eventsColumns";
import { projectKalshiLiveEventPayloads } from "@/lib/kalshiLive/normalizeEventRow";

/**
 * Discovery pull: GET /events with filters, paginate until exhausted (or safety cap).
 * Always a single combined sheet.
 *
 * @param {{
 *   params: import("@/lib/kalshiLive/eventDiscovery").KalshiLiveEventsDiscoveryParams;
 *   selectedColumns?: string[];
 *   includeMarkets?: boolean;
 *   rowMode?: import("@/lib/kalshiLive/eventCompose").KalshiLiveEventsRowMode;
 *   signal?: AbortSignal;
 *   onPage?: (info: {
 *     page: number;
 *     batchSize: number;
 *     totalLoaded: number;
 *     cursor: string | null;
 *   }) => void;
 * }} opts
 */
export async function fetchKalshiLiveEventsDiscoveryPull(opts) {
  const params = opts.params || {};
  const err = validateKalshiLiveEventsDiscoveryPull(params);
  if (err) throw new Error(err);

  const includeMarkets = !!opts.includeMarkets;
  const rowMode = normalizeKalshiLiveEventsRowMode(opts.rowMode);
  const withMilestones = kalshiLiveEventsWantsMilestones(opts.selectedColumns);

  /** @type {Array<{ event: Record<string, unknown>; markets?: unknown[]; milestones?: unknown }>} */
  const raw = [];
  let cursor = "";
  let page = 0;
  let totalExpanded = 0;

  while (totalExpanded < KALSHI_LIVE_EVENTS_DISCOVERY_MAX_ROWS) {
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const remaining = KALSHI_LIVE_EVENTS_DISCOVERY_MAX_ROWS - totalExpanded;
    const pageLimit = Math.min(200, remaining);
    const built = buildKalshiLiveEventsDiscoveryQueryParams(params, {
      limit: pageLimit,
      withNestedMarkets: includeMarkets,
      withMilestones,
    });
    const qs = new URLSearchParams({ ...built, discovery: "1" });
    if (cursor) qs.set("cursor", cursor);

    const res = await fetch(`/api/integrations/kalshi-live/events?${qs.toString()}`, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal: opts.signal,
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        typeof body?.error === "string"
          ? body.error
          : typeof body?.message === "string"
            ? body.message
            : res.statusText || "Events discovery request failed",
      );
    }

    const events = Array.isArray(body?.events) ? body.events : [];
    const milestonesByEvent = body?.milestones;
    const batchPayloads = events.map((event) => {
      const eventObj =
        event && typeof event === "object"
          ? /** @type {Record<string, unknown>} */ (event)
          : {};
      return {
        event: eventObj,
        markets: Array.isArray(eventObj.markets) ? eventObj.markets : [],
        milestones:
          eventObj.milestones !== undefined ? eventObj.milestones : milestonesByEvent,
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
    if (totalExpanded >= KALSHI_LIVE_EVENTS_DISCOVERY_MAX_ROWS) break;
  }

  const rows = projectKalshiLiveEventPayloads(raw, opts.selectedColumns, {
    includeMarkets,
    rowMode,
  }).slice(0, KALSHI_LIVE_EVENTS_DISCOVERY_MAX_ROWS);

  return {
    raw,
    rows,
    querySummary: summarizeKalshiLiveEventsDiscoveryRequest(params, {
      loadedRowCount: rows.length,
      includeMarkets,
      rowMode,
      withMilestones,
    }),
    truncated: rows.length >= KALSHI_LIVE_EVENTS_DISCOVERY_MAX_ROWS && !!cursor,
  };
}
