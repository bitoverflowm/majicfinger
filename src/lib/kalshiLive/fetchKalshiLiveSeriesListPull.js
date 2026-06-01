import { fetchKalshiLiveSeriesListUpstream } from "@/lib/kalshiLive/kalshiLiveSeriesList";
import {
  applyKalshiLiveClientSort,
  applyKalshiLiveClientWhere,
  partitionKalshiLiveCompose,
} from "@/lib/kalshiLive/kalshiLiveCompose";
import { projectKalshiLiveSeriesRows } from "@/lib/kalshiLive/normalizeSeriesRow";
import { buildKalshiLiveSeriesListApiParams } from "@/lib/kalshiLive/seriesListFilterRules";

/**
 * Fetch series list, apply client where/sort, apply row limit, project to sheet columns.
 *
 * @param {{
 *   whereFilters?: import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveWhereFilter[];
 *   sortClauses?: import("@/lib/kalshiLive/kalshiLiveCompose").KalshiLiveSortClause[];
 *   limit?: number;
 *   selectedColumns?: string[];
 *   signal?: AbortSignal;
 * }} opts
 */
export async function fetchKalshiLiveSeriesListPull(opts) {
  const whereFilters = Array.isArray(opts.whereFilters) ? opts.whereFilters : [];
  const sortClauses = Array.isArray(opts.sortClauses) ? opts.sortClauses : [];
  const { seriesListApiFilters, clientWhere } = partitionKalshiLiveCompose("seriesList", whereFilters);

  const apiParams = buildKalshiLiveSeriesListApiParams(seriesListApiFilters, {
    includeProductMetadata:
      Array.isArray(opts.selectedColumns) && opts.selectedColumns.includes("product_metadata"),
  });

  if (opts.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }

  const res = await fetch(
    `/api/integrations/kalshi-live/series/list?${new URLSearchParams(
      Object.fromEntries(
        Object.entries(apiParams).map(([k, v]) => [
          k,
          typeof v === "boolean" ? (v ? "true" : "false") : String(v),
        ]),
      ),
    ).toString()}`,
    {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
      signal: opts.signal,
    },
  );
  const body = await res.json().catch(() => ({}));
  if (opts.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
  if (!res.ok) {
    throw new Error(
      typeof body?.error === "string" ? body.error : res.statusText || "Series list request failed",
    );
  }

  const raw = Array.isArray(body?.series) ? body.series : [];
  if (opts.signal?.aborted) {
    throw new DOMException("Aborted", "AbortError");
  }
  const filtered = applyKalshiLiveClientWhere(raw, clientWhere);
  const sorted = applyKalshiLiveClientSort(filtered, sortClauses, "seriesList");
  const maxTotal = Math.max(1, Math.min(1000, Math.floor(Number(opts.limit) || 100)));
  const sliced = sorted.slice(0, maxTotal);
  const rows = projectKalshiLiveSeriesRows(sliced, opts.selectedColumns);
  return { raw: sliced, rows };
}
