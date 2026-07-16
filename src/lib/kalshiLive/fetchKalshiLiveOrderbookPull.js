import {
  applyKalshiLiveClientSort,
  applyKalshiLiveClientWhere,
} from "@/lib/kalshiLive/kalshiLiveCompose";
import {
  normalizeKalshiLiveOrderbook,
  projectKalshiLiveOrderbookRows,
} from "@/lib/kalshiLive/normalizeOrderbookRow";
import {
  partitionOrderbookApiParams,
  summarizeKalshiLiveOrderbookRequest,
} from "@/lib/kalshiLive/orderbookCompose";
import { parseKalshiLiveOrderbookTickerInput } from "@/lib/kalshiLive/orderbookColumns";

/**
 * Single-shot client fetch for Kalshi Live market orderbook (via same-origin proxy).
 * No auth headers — same pattern as other Kalshi Live public proxies.
 *
 * @param {{
 *   marketTicker: string;
 *   whereFilters?: import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveWhereFilter[];
 *   sortClauses?: import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveSortClause[];
 *   selectedColumns?: string[];
 *   signal?: AbortSignal;
 * }} opts
 */
export async function fetchKalshiLiveOrderbookPull(opts) {
  const ticker = parseKalshiLiveOrderbookTickerInput(opts.marketTicker);
  const whereFilters = Array.isArray(opts.whereFilters) ? opts.whereFilters : [];
  const sortClauses = Array.isArray(opts.sortClauses) ? opts.sortClauses : [];
  const { apiParams, clientWhere } = partitionOrderbookApiParams(whereFilters);

  if (!ticker) {
    throw new Error("Enter a market ticker.");
  }

  const qs = new URLSearchParams({ ticker });
  if (Number.isFinite(Number(apiParams.depth))) {
    qs.set("depth", String(apiParams.depth));
  }

  const res = await fetch(
    `/api/integrations/kalshi-live/markets/orderbook?${qs.toString()}`,
    {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal: opts.signal,
    },
  );
  const body = await res.json().catch(() => ({}));
  if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");
  if (!res.ok) {
    throw new Error(
      typeof body?.error === "string"
        ? body.error
        : typeof body?.message === "string"
          ? body.message
          : res.statusText || "Orderbook request failed",
    );
  }

  const normalized = normalizeKalshiLiveOrderbook(ticker, body?.orderbook_fp);
  const filtered = applyKalshiLiveClientWhere(normalized, clientWhere);
  const sorted = applyKalshiLiveClientSort(filtered, sortClauses, "orderbook");
  const rows = projectKalshiLiveOrderbookRows(sorted, opts.selectedColumns);

  return {
    raw: sorted,
    rows,
    querySummary: summarizeKalshiLiveOrderbookRequest(ticker, apiParams),
  };
}
