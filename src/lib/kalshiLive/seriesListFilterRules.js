/** @typedef {{ id: string; kind: "category" | "tags" | "min_updated_ts"; field: string; value: string | number }} KalshiLiveSeriesListFilter */

export const KALSHI_LIVE_SERIES_LIST_SORT_OPTIONS = [
  { id: "", label: "Default (API order)" },
  { id: "volume_desc", label: "Volume (high → low)" },
  { id: "volume_asc", label: "Volume (low → high)" },
  { id: "title_asc", label: "Title (A → Z)" },
  { id: "title_desc", label: "Title (Z → A)" },
  { id: "last_updated_desc", label: "Last updated (newest)" },
];

/**
 * @param {KalshiLiveSeriesListFilter[]} filters
 * @returns {string | null}
 */
export function validateKalshiLiveSeriesListFilters(filters) {
  const list = Array.isArray(filters) ? filters : [];
  const categories = list.filter((f) => f.kind === "category" && String(f.value ?? "").trim());
  const tags = list.filter((f) => f.kind === "tags" && String(f.value ?? "").trim());
  if (categories.length > 1) return "Only one category filter at a time.";
  if (tags.length > 1) return "Only one tags filter at a time.";
  const tsFilters = list.filter(
    (f) => f.kind === "min_updated_ts" && Number.isFinite(Number(f.value)),
  );
  if (tsFilters.length > 1) return "Only one “updated after” filter at a time.";
  for (const f of tsFilters) {
    const sec = Math.floor(Number(f.value));
    if (!Number.isFinite(sec) || sec < 0) {
      return "“Updated after” must be a valid Unix timestamp.";
    }
  }
  return null;
}

/**
 * Kalshi GET /series query params. Volume is always requested on the API.
 *
 * @param {KalshiLiveSeriesListFilter[]} filters
 * @param {{ includeProductMetadata?: boolean }} [opts]
 */
export function buildKalshiLiveSeriesListApiParams(filters, opts = {}) {
  const err = validateKalshiLiveSeriesListFilters(filters);
  if (err) throw new Error(err);

  /** @type {Record<string, string | boolean>} */
  const params = { include_volume: true };
  if (opts.includeProductMetadata) params.include_product_metadata = true;

  for (const f of Array.isArray(filters) ? filters : []) {
    if (f.kind === "category") {
      const v = String(f.value ?? "").trim();
      if (v) params.category = v;
    }
    if (f.kind === "tags") {
      const v = String(f.value ?? "").trim();
      if (v) params.tags = v;
    }
    if (f.kind === "min_updated_ts" && Number.isFinite(Number(f.value))) {
      params.min_updated_ts = String(Math.floor(Number(f.value)));
    }
  }
  return params;
}

function parseVolumeFp(value) {
  const n = parseFloat(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function parseTimeMs(value) {
  if (value == null || value === "") return 0;
  const n = Number(value);
  if (Number.isFinite(n) && n > 1e11) return n;
  const d = new Date(String(value));
  const ms = d.getTime();
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * Client-side sort (e.g. volume is not an API sort parameter).
 *
 * @param {Record<string, unknown>[]} series
 * @param {string} sortId
 */
export function sortKalshiLiveSeriesList(series, sortId) {
  const id = String(sortId || "").trim();
  const list = [...(Array.isArray(series) ? series : [])];
  if (!id) return list;

  if (id === "volume_desc") {
    return list.sort((a, b) => parseVolumeFp(b.volume_fp) - parseVolumeFp(a.volume_fp));
  }
  if (id === "volume_asc") {
    return list.sort((a, b) => parseVolumeFp(a.volume_fp) - parseVolumeFp(b.volume_fp));
  }
  if (id === "title_asc") {
    return list.sort((a, b) =>
      String(a.title || a.ticker || "").localeCompare(String(b.title || b.ticker || "")),
    );
  }
  if (id === "title_desc") {
    return list.sort((a, b) =>
      String(b.title || b.ticker || "").localeCompare(String(a.title || a.ticker || "")),
    );
  }
  if (id === "last_updated_desc") {
    return list.sort((a, b) => parseTimeMs(b.last_updated_ts) - parseTimeMs(a.last_updated_ts));
  }
  return list;
}

/**
 * @param {KalshiLiveSeriesListFilter[]} filters
 * @param {{ sort?: string; limit?: number }} [opts]
 */
export function summarizeKalshiLiveSeriesListRequest(filters, opts = {}) {
  const parts = ["GET /series"];
  const list = Array.isArray(filters) ? filters : [];
  for (const f of list) {
    if (f.kind === "category" && String(f.value ?? "").trim()) {
      parts.push(`category=${f.value}`);
    }
    if (f.kind === "tags" && String(f.value ?? "").trim()) {
      parts.push(`tags=${f.value}`);
    }
    if (f.kind === "min_updated_ts" && Number.isFinite(Number(f.value))) {
      parts.push(`min_updated_ts=${Math.floor(Number(f.value))}`);
    }
  }
  parts.push("include_volume=true");
  const sortOpt = KALSHI_LIVE_SERIES_LIST_SORT_OPTIONS.find((s) => s.id === (opts.sort || ""));
  if (sortOpt?.id) parts.push(`sort=${sortOpt.label}`);
  if (opts.limit != null) parts.push(`limit=${opts.limit}`);
  return parts.join(" · ");
}
