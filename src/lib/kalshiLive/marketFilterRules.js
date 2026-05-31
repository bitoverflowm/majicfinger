import { KALSHI_LIVE_MARKET_STATUS_OPTIONS } from "@/lib/kalshiLive/marketsColumns";

/** @typedef {{ id: string; kind: "status" | "timestamp"; field: string; value: string | number }} KalshiLiveApiFilter */

const CREATED_TS = new Set(["min_created_ts", "max_created_ts"]);
const CLOSE_TS = new Set(["min_close_ts", "max_close_ts"]);
const SETTLED_TS = new Set(["min_settled_ts", "max_settled_ts"]);

const STATUS_FOR_CREATED = new Set(["unopened", "open", ""]);
const STATUS_FOR_CLOSE = new Set(["closed", ""]);
const STATUS_FOR_SETTLED = new Set(["settled", ""]);

/**
 * @param {KalshiLiveApiFilter[]} filters
 * @returns {string | null}
 */
export function validateKalshiLiveMarketFilters(filters) {
  const list = Array.isArray(filters) ? filters : [];
  const statusFilters = list.filter((f) => f.kind === "status" && String(f.value || "").trim());
  if (statusFilters.length > 1) {
    return "Only one status filter may be supplied at a time.";
  }

  const tsFilters = list.filter((f) => f.kind === "timestamp" && Number.isFinite(Number(f.value)));
  const tsFields = new Set(tsFilters.map((f) => f.field));

  for (const field of tsFields) {
    const sameGroup = tsFilters.filter((f) => f.field === field);
    if (sameGroup.length > 1) {
      return `Only one ${field} filter allowed.`;
    }
  }

  const hasCreated = [...tsFields].some((f) => CREATED_TS.has(f));
  const hasClose = [...tsFields].some((f) => CLOSE_TS.has(f));
  const hasSettled = [...tsFields].some((f) => SETTLED_TS.has(f));
  const hasUpdated = tsFields.has("min_updated_ts");

  if (hasUpdated && (hasCreated || hasClose || hasSettled || statusFilters.length)) {
    return "min_updated_ts is incompatible with other filters (except mve_filter=exclude, not yet in UI).";
  }

  const statusVal = statusFilters[0] ? String(statusFilters[0].value).trim() : "";

  if (hasCreated && statusVal && !STATUS_FOR_CREATED.has(statusVal)) {
    return `Status "${statusVal}" is not compatible with created timestamp filters.`;
  }
  if (hasClose && statusVal && !STATUS_FOR_CLOSE.has(statusVal)) {
    return `Status "${statusVal}" is not compatible with close timestamp filters.`;
  }
  if (hasSettled && statusVal && !STATUS_FOR_SETTLED.has(statusVal)) {
    return `Status "${statusVal}" is not compatible with settled timestamp filters.`;
  }

  if (hasCreated && (hasClose || hasSettled)) {
    return "Created timestamp filters cannot combine with close or settled timestamp filters.";
  }
  if (hasClose && hasSettled) {
    return "Close and settled timestamp filters cannot be combined.";
  }

  for (const f of tsFilters) {
    const sec = Math.floor(Number(f.value));
    if (!Number.isFinite(sec) || sec < 0) {
      return "Timestamp filters must be valid Unix times.";
    }
  }

  if (statusVal && !KALSHI_LIVE_MARKET_STATUS_OPTIONS.includes(statusVal)) {
    return `Unknown status "${statusVal}".`;
  }

  return null;
}

/**
 * @param {KalshiLiveApiFilter[]} filters
 * @param {{ limit?: number; tickers?: string }} [opts] `limit` = Kalshi API page size for this request
 * @returns {Record<string, string>}
 */
export function buildKalshiLiveMarketsQueryParams(filters, opts = {}) {
  const err = validateKalshiLiveMarketFilters(filters);
  if (err) throw new Error(err);

  const params = {};
  const list = Array.isArray(filters) ? filters : [];
  const tickers = String(opts.tickers || "").trim();
  if (tickers) params.tickers = tickers;

  for (const f of list) {
    if (f.kind === "status") {
      const v = String(f.value || "").trim();
      if (v) params.status = v;
      continue;
    }
    if (f.kind === "timestamp" && Number.isFinite(Number(f.value))) {
      params[f.field] = String(Math.floor(Number(f.value)));
    }
  }

  const limit = Math.min(1000, Math.max(1, Math.floor(Number(opts.limit) || 100)));
  params.limit = String(limit);

  return params;
}

/**
 * Human-readable summary for request history.
 * @param {KalshiLiveApiFilter[]} filters
 * @param {{ limit?: number }} [opts]
 */
export function summarizeKalshiLiveMarketsRequest(filters, opts = {}) {
  const parts = ["GET /markets"];
  if (opts.tickers) parts.push(`tickers=${opts.tickers}`);
  const list = Array.isArray(filters) ? filters : [];
  for (const f of list) {
    if (f.kind === "status" && String(f.value || "").trim()) {
      parts.push(`status=${f.value}`);
    }
    if (f.kind === "timestamp" && Number.isFinite(Number(f.value))) {
      parts.push(`${f.field}=${Math.floor(Number(f.value))}`);
    }
  }
  if (opts.limit != null) parts.push(`limit=${opts.limit}`);
  return parts.join(" · ");
}
