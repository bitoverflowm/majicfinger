import { projectKalshiLiveSeriesRows } from "@/lib/kalshiLive/normalizeSeriesRow";
import {
  summarizeKalshiLiveSeriesDiscoveryRequest,
  validateKalshiLiveSeriesDiscoveryPull,
} from "@/lib/kalshiLive/seriesCompose";
import { kalshiLiveSeriesWantsIncludeVolume } from "@/lib/kalshiLive/seriesColumns";

/**
 * Fetch series via GET /series (list / discovery filters).
 *
 * @param {{
 *   category?: string;
 *   tag?: string;
 *   includeProductMetadata?: boolean;
 *   minUpdatedTs?: number | string | null;
 *   selectedColumns?: string[];
 *   signal?: AbortSignal;
 * }} opts
 */
export async function fetchKalshiLiveSeriesDiscoveryPull(opts) {
  const category = String(opts.category || "").trim();
  const tag = String(opts.tag || "").trim();
  const includeProductMetadata = !!opts.includeProductMetadata;
  const includeVolume = kalshiLiveSeriesWantsIncludeVolume(opts.selectedColumns);
  const minUpdatedTs = Number(opts.minUpdatedTs);
  const minTs = Number.isFinite(minUpdatedTs) && minUpdatedTs > 0 ? Math.floor(minUpdatedTs) : null;

  const err = validateKalshiLiveSeriesDiscoveryPull({ category, tag });
  if (err) throw new Error(err);

  const qs = new URLSearchParams();
  if (category) qs.set("category", category);
  if (tag) qs.set("tags", tag);
  qs.set("include_volume", includeVolume ? "true" : "false");
  qs.set("include_product_metadata", includeProductMetadata ? "true" : "false");
  if (minTs != null) qs.set("min_updated_ts", String(minTs));

  const querySummary = summarizeKalshiLiveSeriesDiscoveryRequest({
    category,
    tag,
    includeVolume,
    includeProductMetadata,
    minUpdatedTs: minTs,
  });

  const res = await fetch(`/api/integrations/kalshi-live/series/list?${qs.toString()}`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
    signal: opts.signal,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof body?.message === "string"
        ? body.message
        : typeof body?.error === "string"
          ? body.error
          : res.statusText || "Series discovery request failed";
    throw new Error(msg);
  }

  const raw = Array.isArray(body?.series) ? body.series : [];
  const rows = projectKalshiLiveSeriesRows(raw, opts.selectedColumns);

  return {
    raw,
    rows,
    querySummary,
    includeVolume,
    includeProductMetadata,
  };
}
