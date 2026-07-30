import {
  buildKalshiHistoricalV2MarketsDiscoveryQueryParams,
  KALSHI_HISTORICAL_V2_MARKETS_DISCOVERY_GENERAL_LIMIT,
  KALSHI_HISTORICAL_V2_MARKETS_DISCOVERY_MAX_ROWS,
  normalizeKalshiHistoricalV2MarketsDiscoveryScope,
  summarizeKalshiHistoricalV2MarketsDiscoveryRequest,
  validateKalshiHistoricalV2MarketsDiscoveryPull,
} from "@/lib/kalshiHistoricalV2/historicalMarketsDiscovery";
import { projectKalshiLiveMarketRows } from "@/lib/kalshiLive/normalizeMarketRow";

/**
 * Discovery pull: GET /historical/markets with supported filters.
 *
 * - General (no ticker): single page, default limit 100 — do not walk the full archive.
 * - Event / series / markets filters: paginate until exhausted (or safety cap).
 *
 * Always intended for a single combined sheet.
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

  const tickerScope = normalizeKalshiHistoricalV2MarketsDiscoveryScope(params.tickerScope);
  const generalOnly = tickerScope === "general";
  const maxRows = generalOnly
    ? KALSHI_HISTORICAL_V2_MARKETS_DISCOVERY_GENERAL_LIMIT
    : KALSHI_HISTORICAL_V2_MARKETS_DISCOVERY_MAX_ROWS;
  const pageSize = generalOnly
    ? KALSHI_HISTORICAL_V2_MARKETS_DISCOVERY_GENERAL_LIMIT
    : 1000;

  /** @type {Record<string, unknown>[]} */
  const raw = [];
  let cursor = "";
  let page = 0;
  let lastCursor = "";

  while (raw.length < maxRows) {
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");

    const remaining = maxRows - raw.length;
    const pageLimit = Math.min(pageSize, remaining);

    const built = buildKalshiHistoricalV2MarketsDiscoveryQueryParams(params, {
      limit: pageLimit,
    });
    const qs = new URLSearchParams({
      ...built,
      discovery: "1",
      ticker_scope: tickerScope,
    });
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

    // General pull is a single probe page (limit=100) — stop even if a cursor remains.
    if (generalOnly) break;

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
    truncated: generalOnly
      ? !!cursor
      : raw.length >= KALSHI_HISTORICAL_V2_MARKETS_DISCOVERY_MAX_ROWS && !!cursor,
  };
}
