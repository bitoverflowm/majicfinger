import { KALSHI_LIVE_MARKET_STATUS_OPTIONS } from "@/lib/kalshiLive/marketsColumns";
import { parseMarketTickerList } from "@/lib/kalshiLive/marketTickerSearch";

/** @typedef {"only" | "exclude"} KalshiLiveMveFilter */

/**
 * @typedef {{
 *   status?: string;
 *   mveFilter?: KalshiLiveMveFilter | "";
 *   eventTicker?: string;
 *   seriesTicker?: string;
 *   tickers?: string;
 *   minCreatedTs?: number | "";
 *   maxCreatedTs?: number | "";
 *   minUpdatedTs?: number | "";
 *   minCloseTs?: number | "";
 *   maxCloseTs?: number | "";
 *   minSettledTs?: number | "";
 *   maxSettledTs?: number | "";
 * }} KalshiLiveMarketsDiscoveryParams
 */

/**
 * @typedef {{
 *   updatedMode: boolean;
 *   disableStatus: boolean;
 *   disableMve: boolean;
 *   disableEventTicker: boolean;
 *   disableSeriesTicker: boolean;
 *   disableTickers: boolean;
 *   disableCreated: boolean;
 *   disableUpdated: boolean;
 *   disableClose: boolean;
 *   disableSettled: boolean;
 *   statusOptions: string[];
 *   note: string | null;
 * }} KalshiLiveMarketsDiscoveryFieldLocks
 */

export const KALSHI_LIVE_MVE_FILTER_EXCLUDE = /** @type {KalshiLiveMveFilter} */ ("exclude");
export const KALSHI_LIVE_MVE_FILTER_ONLY = /** @type {KalshiLiveMveFilter} */ ("only");

/** Safety cap while paginating all discovery pages (API max page size is 1000). */
export const KALSHI_LIVE_MARKETS_DISCOVERY_MAX_ROWS = 50_000;

const STATUS_FOR_CREATED = new Set(["unopened", "open", ""]);
const STATUS_FOR_CLOSE = new Set(["closed", ""]);
const STATUS_FOR_SETTLED = new Set(["settled", ""]);

/**
 * Docs: no Get Markets query params are required.
 * @returns {true}
 */
export function kalshiLiveMarketsDiscoveryParamsOptional() {
  return true;
}

/**
 * @param {unknown} raw
 * @returns {KalshiLiveMveFilter}
 */
export function normalizeKalshiLiveMveFilter(raw) {
  return raw === KALSHI_LIVE_MVE_FILTER_ONLY
    ? KALSHI_LIVE_MVE_FILTER_ONLY
    : KALSHI_LIVE_MVE_FILTER_EXCLUDE;
}

/**
 * @param {number | string | null | undefined} raw
 * @returns {number | null}
 */
function toUnix(raw) {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

/**
 * @param {KalshiLiveMarketsDiscoveryParams} params
 */
export function hasKalshiLiveMarketsDiscoveryCreatedRange(params) {
  return toUnix(params.minCreatedTs) != null || toUnix(params.maxCreatedTs) != null;
}

/**
 * @param {KalshiLiveMarketsDiscoveryParams} params
 */
export function hasKalshiLiveMarketsDiscoveryCloseRange(params) {
  return toUnix(params.minCloseTs) != null || toUnix(params.maxCloseTs) != null;
}

/**
 * @param {KalshiLiveMarketsDiscoveryParams} params
 */
export function hasKalshiLiveMarketsDiscoverySettledRange(params) {
  return toUnix(params.minSettledTs) != null || toUnix(params.maxSettledTs) != null;
}

/**
 * Compute which discovery fields should be disabled given current selections.
 * @param {KalshiLiveMarketsDiscoveryParams} params
 * @returns {KalshiLiveMarketsDiscoveryFieldLocks}
 */
export function getKalshiLiveMarketsDiscoveryFieldLocks(params) {
  const status = String(params.status || "").trim();
  const hasUpdated = toUnix(params.minUpdatedTs) != null;
  const hasCreated = hasKalshiLiveMarketsDiscoveryCreatedRange(params);
  const hasClose = hasKalshiLiveMarketsDiscoveryCloseRange(params);
  const hasSettled = hasKalshiLiveMarketsDiscoverySettledRange(params);

  if (hasUpdated) {
    return {
      updatedMode: true,
      disableStatus: true,
      disableMve: true,
      disableEventTicker: true,
      disableSeriesTicker: false,
      disableTickers: true,
      disableCreated: true,
      disableUpdated: false,
      disableClose: true,
      disableSettled: true,
      statusOptions: [],
      note:
        "Updated After is incompatible with other filters except Multivariate Events = Exclude. Series Ticker may also be set. Other filters are disabled while Updated After is selected.",
    };
  }

  /** @type {string[]} */
  let statusOptions = [...KALSHI_LIVE_MARKET_STATUS_OPTIONS];
  if (hasCreated) {
    statusOptions = statusOptions.filter((s) => STATUS_FOR_CREATED.has(s));
  } else if (hasClose) {
    statusOptions = statusOptions.filter((s) => STATUS_FOR_CLOSE.has(s));
  } else if (hasSettled) {
    statusOptions = statusOptions.filter((s) => STATUS_FOR_SETTLED.has(s));
  }

  const disableCreated =
    hasClose ||
    hasSettled ||
    status === "closed" ||
    status === "settled" ||
    status === "paused";
  const disableClose =
    hasCreated ||
    hasSettled ||
    status === "unopened" ||
    status === "open" ||
    status === "settled" ||
    status === "paused";
  const disableSettled =
    hasCreated ||
    hasClose ||
    status === "unopened" ||
    status === "open" ||
    status === "closed" ||
    status === "paused";

  /** @type {string | null} */
  let note = null;
  if (status === "paused" && (disableCreated || disableClose || disableSettled)) {
    note =
      "Status “paused” cannot be combined with Created, Close, or Settled date filters — those date fields are disabled.";
  } else if (hasCreated || hasClose || hasSettled) {
    note =
      "Created, Close, and Settled date filters cannot be combined. Status options are limited to values compatible with the active date filter.";
  } else if (status === "closed" || status === "settled" || status === "unopened" || status === "open") {
    note =
      "Some date filters are disabled because they are incompatible with the selected Status.";
  }

  return {
    updatedMode: false,
    disableStatus: false,
    disableMve: false,
    disableEventTicker: false,
    disableSeriesTicker: false,
    disableTickers: false,
    disableCreated,
    disableUpdated: false,
    disableClose,
    disableSettled,
    statusOptions,
    note,
  };
}

/**
 * When enabling Updated After, clear incompatible fields and force mve=exclude.
 * @param {KalshiLiveMarketsDiscoveryParams} params
 * @returns {KalshiLiveMarketsDiscoveryParams}
 */
export function applyKalshiLiveMarketsDiscoveryUpdatedAfter(params) {
  return {
    ...params,
    status: "",
    mveFilter: KALSHI_LIVE_MVE_FILTER_EXCLUDE,
    eventTicker: "",
    tickers: "",
    minCreatedTs: "",
    maxCreatedTs: "",
    minCloseTs: "",
    maxCloseTs: "",
    minSettledTs: "",
    maxSettledTs: "",
  };
}

/**
 * @param {KalshiLiveMarketsDiscoveryParams} params
 * @returns {string | null}
 */
export function validateKalshiLiveMarketsDiscoveryPull(params) {
  const status = String(params.status || "").trim();
  if (status && !KALSHI_LIVE_MARKET_STATUS_OPTIONS.includes(status)) {
    return `Unknown status "${status}".`;
  }

  const eventTicker = String(params.eventTicker || "").trim();
  if (eventTicker.includes(",") || eventTicker.includes(" ")) {
    return "Event Ticker accepts only a single ticker.";
  }

  const seriesTickers = parseMarketTickerList(params.seriesTicker);
  if (seriesTickers.length > 1) {
    return "Series Ticker accepts only a single series ticker.";
  }

  const marketTickers = parseMarketTickerList(params.tickers);
  if (marketTickers.length > 100) {
    return "Maximum 100 market tickers in the Tickers filter.";
  }

  const hasUpdated = toUnix(params.minUpdatedTs) != null;
  const hasCreated = hasKalshiLiveMarketsDiscoveryCreatedRange(params);
  const hasClose = hasKalshiLiveMarketsDiscoveryCloseRange(params);
  const hasSettled = hasKalshiLiveMarketsDiscoverySettledRange(params);
  const mve = normalizeKalshiLiveMveFilter(params.mveFilter);

  if (hasUpdated) {
    if (mve !== KALSHI_LIVE_MVE_FILTER_EXCLUDE) {
      return "Updated After requires Multivariate Events = Exclude.";
    }
    if (
      status ||
      eventTicker ||
      marketTickers.length ||
      hasCreated ||
      hasClose ||
      hasSettled
    ) {
      return "Updated After is incompatible with other filters except Series Ticker (with Multivariate Events = Exclude).";
    }
  }

  if (hasCreated && status && !STATUS_FOR_CREATED.has(status)) {
    return `Status "${status}" is not compatible with Created Date.`;
  }
  if (hasClose && status && !STATUS_FOR_CLOSE.has(status)) {
    return `Status "${status}" is not compatible with Close Date.`;
  }
  if (hasSettled && status && !STATUS_FOR_SETTLED.has(status)) {
    return `Status "${status}" is not compatible with Settled Date.`;
  }

  if (hasCreated && (hasClose || hasSettled)) {
    return "Created Date cannot combine with Close Date or Settled Date.";
  }
  if (hasClose && hasSettled) {
    return "Close Date and Settled Date cannot be combined.";
  }

  const minCreated = toUnix(params.minCreatedTs);
  const maxCreated = toUnix(params.maxCreatedTs);
  if (minCreated != null && maxCreated != null && minCreated > maxCreated) {
    return "Created Date range is invalid (start is after end).";
  }
  const minClose = toUnix(params.minCloseTs);
  const maxClose = toUnix(params.maxCloseTs);
  if (minClose != null && maxClose != null && minClose > maxClose) {
    return "Close Date range is invalid (start is after end).";
  }
  const minSettled = toUnix(params.minSettledTs);
  const maxSettled = toUnix(params.maxSettledTs);
  if (minSettled != null && maxSettled != null && minSettled > maxSettled) {
    return "Settled Date range is invalid (start is after end).";
  }

  return null;
}

/**
 * Build Kalshi GET /markets query params for discovery (without cursor).
 * @param {KalshiLiveMarketsDiscoveryParams} params
 * @param {{ limit?: number }} [opts]
 * @returns {Record<string, string>}
 */
export function buildKalshiLiveMarketsDiscoveryQueryParams(params, opts = {}) {
  const err = validateKalshiLiveMarketsDiscoveryPull(params);
  if (err) throw new Error(err);

  /** @type {Record<string, string>} */
  const out = {};
  const status = String(params.status || "").trim();
  if (status) out.status = status;

  const mve = normalizeKalshiLiveMveFilter(params.mveFilter);
  // Always send mve_filter so Updated After + series_ticker stay valid; default exclude.
  out.mve_filter = mve;

  const eventTicker = String(params.eventTicker || "").trim().toUpperCase();
  if (eventTicker) out.event_ticker = eventTicker;

  const seriesTickers = parseMarketTickerList(params.seriesTicker);
  if (seriesTickers[0]) out.series_ticker = seriesTickers[0];

  const marketTickers = parseMarketTickerList(params.tickers);
  if (marketTickers.length) out.tickers = marketTickers.join(",");

  const pairs = [
    ["min_created_ts", params.minCreatedTs],
    ["max_created_ts", params.maxCreatedTs],
    ["min_updated_ts", params.minUpdatedTs],
    ["min_close_ts", params.minCloseTs],
    ["max_close_ts", params.maxCloseTs],
    ["min_settled_ts", params.minSettledTs],
    ["max_settled_ts", params.maxSettledTs],
  ];
  for (const [key, raw] of pairs) {
    const sec = toUnix(raw);
    if (sec != null) out[key] = String(sec);
  }

  const limit = Math.min(1000, Math.max(1, Math.floor(Number(opts.limit) || 1000)));
  out.limit = String(limit);
  return out;
}

/**
 * @param {KalshiLiveMarketsDiscoveryParams} params
 * @param {{ loadedRowCount?: number }} [opts]
 */
export function summarizeKalshiLiveMarketsDiscoveryRequest(params, opts = {}) {
  const parts = ["GET /markets", "discovery", "sheets=combined"];
  try {
    const qs = buildKalshiLiveMarketsDiscoveryQueryParams(params, { limit: 1000 });
    for (const [k, v] of Object.entries(qs)) {
      if (k === "limit") continue;
      parts.push(`${k}=${v}`);
    }
  } catch {
    // Validation failed — still produce a short summary.
  }
  if (opts.loadedRowCount != null) parts.push(`rows=${opts.loadedRowCount}`);
  return parts.join(" · ");
}

/**
 * Empty defaults for discovery form state.
 * @returns {KalshiLiveMarketsDiscoveryParams}
 */
export function emptyKalshiLiveMarketsDiscoveryParams() {
  return {
    status: "",
    mveFilter: KALSHI_LIVE_MVE_FILTER_EXCLUDE,
    eventTicker: "",
    seriesTicker: "",
    tickers: "",
    minCreatedTs: "",
    maxCreatedTs: "",
    minUpdatedTs: "",
    minCloseTs: "",
    maxCloseTs: "",
    minSettledTs: "",
    maxSettledTs: "",
  };
}
