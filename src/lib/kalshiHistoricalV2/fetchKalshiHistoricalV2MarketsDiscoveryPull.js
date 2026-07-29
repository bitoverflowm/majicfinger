import {
  buildKalshiLiveMarketsDiscoveryQueryParams,
  KALSHI_LIVE_MARKETS_DISCOVERY_MAX_ROWS,
  summarizeKalshiLiveMarketsDiscoveryRequest,
  validateKalshiLiveMarketsDiscoveryPull,
} from "@/lib/kalshiLive/marketDiscovery";
import { projectKalshiLiveMarketRows } from "@/lib/kalshiLive/normalizeMarketRow";

/**
 * Discovery pull: GET /historical/markets with filters, paginate until exhausted (or safety cap).
 *
 * Note: we reuse the live discovery query parameter builder/validator since the
 * query param names match the historical endpoint.
 *
 * @param {{
 *   params: import("@/lib/kalshiLive/marketDiscovery").KalshiLiveMarketsDiscoveryParams;
 *   selectedColumns?: string[];
 *   signal?: AbortSignal;
 *   onPage?: (info: {
 *     page: number;
 *     batchSize: number;
 *     totalLoaded: number;
 *     cursor: string | null;
 *   }) => void;
 * }} opts
 */
export async function fetchKalshiHistoricalV2MarketsDiscoveryPull(opts) {
  const params = opts.params || {};
  const err = validateKalshiLiveMarketsDiscoveryPull(params);
  if (err) throw new Error(err);

  const querySummary = summarizeKalshiLiveMarketsDiscoveryRequest(params);

  /** @type {Record<string, unknown>[]} */
  const raw = [];
  let cursor = "";
  let page = 0;

  while (raw.length < KALSHI_LIVE_MARKETS_DISCOVERY_MAX_ROWS) {
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const remaining = KALSHI_LIVE_MARKETS_DISCOVERY_MAX_ROWS - raw.length;
    const pageLimit = Math.min(1000, remaining);

    const built = buildKalshiLiveMarketsDiscoveryQueryParams(params, { limit: pageLimit });
    // discovery=1 is only used by our internal proxy route
    const qs = new URLSearchParams({ ...built, discovery: "1" });
    if (cursor) qs.set("cursor", cursor);

    const res = await fetch(`/api/integrations/kalshi-live/historical/markets?${qs.toString()}`, {
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
            : res.statusText || "Markets discovery request failed",
      );
    }

    const batch = Array.isArray(body?.markets) ? body.markets : [];
    raw.push(...batch);
    page += 1;
    cursor = String(body?.cursor || "").trim();

    opts.onPage?.({
      page,
      batchSize: batch.length,
      totalLoaded: raw.length,
      cursor: cursor || null,
    });

    if (!cursor || batch.length === 0) break;
  }

  const rows = projectKalshiLiveMarketRows(raw, opts.selectedColumns);

  return {
    raw,
    rows,
    querySummary: summarizeKalshiLiveMarketsDiscoveryRequest(params, {
      loadedRowCount: rows.length,
    }),
    truncated: raw.length >= KALSHI_LIVE_MARKETS_DISCOVERY_MAX_ROWS && !!cursor,
  };
}

