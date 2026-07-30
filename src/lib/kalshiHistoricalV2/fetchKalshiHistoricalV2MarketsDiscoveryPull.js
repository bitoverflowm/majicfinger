import {
  buildKalshiHistoricalV2MarketsDiscoveryQueryParams,
  KALSHI_HISTORICAL_V2_MARKETS_DISCOVERY_MAX_ROWS,
  summarizeKalshiHistoricalV2MarketsDiscoveryRequest,
  validateKalshiHistoricalV2MarketsDiscoveryPull,
} from "@/lib/kalshiHistoricalV2/historicalMarketsDiscovery";
import { projectKalshiLiveMarketRows } from "@/lib/kalshiLive/normalizeMarketRow";

/**
 * Discovery pull: GET /historical/markets with supported filters, paginate until exhausted
 * (or safety cap). Always intended for a single combined sheet.
 *
 * @param {{
 *   params: import("@/lib/kalshiHistoricalV2/historicalMarketsDiscovery").KalshiHistoricalV2MarketsDiscoveryParams;
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
  const err = validateKalshiHistoricalV2MarketsDiscoveryPull(params);
  if (err) throw new Error(err);

  /** @type {Record<string, unknown>[]} */
  const raw = [];
  let cursor = "";
  let page = 0;
  let lastCursor = "";

  while (raw.length < KALSHI_HISTORICAL_V2_MARKETS_DISCOVERY_MAX_ROWS) {
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const remaining = KALSHI_HISTORICAL_V2_MARKETS_DISCOVERY_MAX_ROWS - raw.length;
    const pageLimit = Math.min(1000, remaining);

    const built = buildKalshiHistoricalV2MarketsDiscoveryQueryParams(params, {
      limit: pageLimit,
    });
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
    // Guard against a stuck/repeating cursor that would loop forever.
    if (cursor === lastCursor) break;
    lastCursor = cursor;
  }

  const rows = projectKalshiLiveMarketRows(raw, opts.selectedColumns);

  return {
    raw,
    rows,
    querySummary: summarizeKalshiHistoricalV2MarketsDiscoveryRequest(params, {
      loadedRowCount: rows.length,
    }),
    truncated: raw.length >= KALSHI_HISTORICAL_V2_MARKETS_DISCOVERY_MAX_ROWS && !!cursor,
  };
}
