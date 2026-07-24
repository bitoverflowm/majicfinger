import { KALSHI_LIVE_EVENTS_COLUMNS } from "@/lib/kalshiLive/eventsColumns";
import {
  KALSHI_LIVE_EVENTS_ROW_MODE_PER_MARKET,
  normalizeKalshiLiveEventsRowMode,
} from "@/lib/kalshiLive/eventCompose";
import { normalizeKalshiLiveMarketRow } from "@/lib/kalshiLive/normalizeMarketRow";

function jsonCell(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

/**
 * Coerce a Kalshi Live /events item into a flat sheet row (event-level).
 * Omits deprecated `category`.
 * @param {Record<string, unknown>} raw
 * @param {{ markets?: unknown[]; milestones?: unknown }} [opts]
 * @returns {Record<string, unknown>}
 */
export function normalizeKalshiLiveEventRow(raw, opts = {}) {
  if (!raw || typeof raw !== "object") return {};
  const e = /** @type {Record<string, unknown>} */ (raw);

  const str = (k) => {
    const v = e[k];
    if (v == null) return "";
    return String(v);
  };
  const bool = (k) => {
    const v = e[k];
    if (v == null || v === "") return null;
    return Boolean(v);
  };
  const int = (k) => {
    const v = e[k];
    if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
    const n = Number(v);
    return Number.isFinite(n) ? Math.trunc(n) : null;
  };
  const num = (k) => {
    const v = e[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const nestedMarkets = Array.isArray(e.markets)
    ? e.markets
    : Array.isArray(opts.markets)
      ? opts.markets
      : [];
  const milestones =
    opts.milestones !== undefined
      ? opts.milestones
      : e.milestones != null
        ? e.milestones
        : "";

  return {
    event_ticker: str("event_ticker"),
    series_ticker: str("series_ticker"),
    sub_title: str("sub_title"),
    title: str("title"),
    collateral_return_type: str("collateral_return_type"),
    mutually_exclusive: bool("mutually_exclusive"),
    available_on_brokers: bool("available_on_brokers"),
    settlement_sources: jsonCell(e.settlement_sources),
    strike_date: str("strike_date"),
    strike_period: str("strike_period"),
    markets: jsonCell(nestedMarkets),
    product_metadata: jsonCell(e.product_metadata),
    last_updated_ts: str("last_updated_ts"),
    fee_type_override: str("fee_type_override"),
    fee_multiplier_override: num("fee_multiplier_override"),
    exchange_index: int("exchange_index"),
    milestones: jsonCell(milestones),
  };
}

/**
 * Resolve markets list for an event payload (nested preferred, else top-level).
 * @param {Record<string, unknown>} event
 * @param {unknown[]} [topLevelMarkets]
 */
export function resolveKalshiLiveEventMarkets(event, topLevelMarkets) {
  if (event && Array.isArray(event.markets) && event.markets.length) {
    return event.markets;
  }
  return Array.isArray(topLevelMarkets) ? topLevelMarkets : [];
}

const EVENT_FIELD_NAMES = KALSHI_LIVE_EVENTS_COLUMNS.map((c) => c.name).filter(
  (n) => n !== "markets" && n !== "milestones",
);

/**
 * Expand one event into one sheet row per market, replicating event fields.
 * @param {Record<string, unknown>} event
 * @param {unknown[]} markets
 * @param {string[]} selectedMarketColumns
 * @param {{ milestones?: unknown }} [opts]
 */
export function expandKalshiLiveEventToMarketRows(
  event,
  markets,
  selectedMarketColumns,
  opts = {},
) {
  const eventRow = normalizeKalshiLiveEventRow(event, {
    markets: [],
    milestones: opts.milestones,
  });
  const marketCols =
    Array.isArray(selectedMarketColumns) && selectedMarketColumns.length
      ? selectedMarketColumns
      : null;
  const list = Array.isArray(markets) ? markets : [];
  if (!list.length) {
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const c of EVENT_FIELD_NAMES) out[c] = eventRow[c];
    if (opts.milestones !== undefined) out.milestones = eventRow.milestones;
    return [out];
  }

  return list.map((rawMarket) => {
    const market = normalizeKalshiLiveMarketRow(
      /** @type {Record<string, unknown>} */ (rawMarket || {}),
    );
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const c of EVENT_FIELD_NAMES) out[c] = eventRow[c];
    if (opts.milestones !== undefined) out.milestones = eventRow.milestones;
    if (!marketCols) {
      Object.assign(out, market);
    } else {
      for (const c of marketCols) {
        if (Object.prototype.hasOwnProperty.call(market, c)) out[c] = market[c];
      }
    }
    return out;
  });
}

/**
 * @param {Array<{
 *   event: Record<string, unknown>;
 *   markets?: unknown[];
 *   milestones?: unknown;
 * }>} payloads
 * @param {string[]} selectedColumns
 * @param {{
 *   includeMarkets?: boolean;
 *   rowMode?: import("@/lib/kalshiLive/eventCompose").KalshiLiveEventsRowMode;
 * }} [opts]
 */
export function projectKalshiLiveEventPayloads(payloads, selectedColumns, opts = {}) {
  const includeMarkets = !!opts.includeMarkets;
  const rowMode = normalizeKalshiLiveEventsRowMode(opts.rowMode);
  const cols =
    Array.isArray(selectedColumns) && selectedColumns.length ? selectedColumns : null;

  /** @type {Record<string, unknown>[]} */
  const out = [];

  for (const payload of Array.isArray(payloads) ? payloads : []) {
    const event = payload?.event && typeof payload.event === "object" ? payload.event : {};
    const markets = resolveKalshiLiveEventMarkets(event, payload?.markets);
    const milestones = payload?.milestones;

    if (includeMarkets && rowMode === KALSHI_LIVE_EVENTS_ROW_MODE_PER_MARKET) {
      out.push(
        ...expandKalshiLiveEventToMarketRows(event, markets, selectedColumns || [], {
          milestones,
        }),
      );
      continue;
    }

    const row = normalizeKalshiLiveEventRow(event, {
      markets: includeMarkets ? markets : [],
      milestones,
    });
    if (!cols) {
      out.push(row);
      continue;
    }
    /** @type {Record<string, unknown>} */
    const projected = {};
    for (const c of cols) {
      if (Object.prototype.hasOwnProperty.call(row, c)) projected[c] = row[c];
    }
    out.push(projected);
  }

  return out;
}
