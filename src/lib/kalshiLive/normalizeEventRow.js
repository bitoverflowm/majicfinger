import { KALSHI_LIVE_EVENT_MARKET_ROLLUPS, KALSHI_LIVE_EVENTS_COLUMNS } from "@/lib/kalshiLive/eventsColumns";
import {
  KALSHI_LIVE_EVENTS_ROW_MODE_PER_MARKET,
  normalizeKalshiLiveEventsRowMode,
} from "@/lib/kalshiLive/eventCompose";
import { parseKalshiFixedPointCount } from "@/lib/kalshiLive/kalshiFixedPoint";
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

function marketList(value) {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string" || !value.trim().startsWith("[")) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function sumOf(markets, ...keys) {
  let total = null;
  for (const market of markets) {
    const value = keys.map((key) => parseKalshiFixedPointCount(market?.[key])).find((n) => n != null);
    if (value != null) total = (total ?? 0) + value;
  }
  return total;
}

function edgeTime(markets, key, pick) {
  const times = markets.map((market) => Date.parse(String(market?.[key] || ""))).filter(Number.isFinite);
  return times.length ? new Date(pick(...times)).toISOString() : "";
}

/** Kalshi has no event status, so it follows the markets: any trading is open, all paid out is settled. */
function eventStatus(markets) {
  const words = markets.map((market) => String(market?.status || "").trim().toLowerCase()).filter(Boolean);
  if (!words.length) return "";
  if (words.some((word) => word === "active" || word === "open")) return "open";
  if (words.every((word) => word === "initialized" || word === "unopened")) return "unopened";
  if (words.every((word) => word === "finalized" || word === "settled")) return "settled";
  return "closed";
}

/**
 * Volume, open interest, status, and life of an event, from its markets.
 * Empty when the markets were not requested.
 * @param {unknown} markets
 */
export function kalshiLiveEventMarketRollups(markets) {
  const list = marketList(markets).filter((market) => market && typeof market === "object");
  if (!list.length) {
    return Object.fromEntries(KALSHI_LIVE_EVENT_MARKET_ROLLUPS.map((name) => [name, name === "event_status" || name.endsWith("_time") ? "" : null]));
  }
  return {
    event_status: eventStatus(list),
    market_count: list.length,
    volume_fp: sumOf(list, "volume_fp", "volume"),
    volume_24h_fp: sumOf(list, "volume_24h_fp", "volume_24h"),
    open_interest_fp: sumOf(list, "open_interest_fp", "open_interest"),
    open_time: edgeTime(list, "open_time", Math.min),
    close_time: edgeTime(list, "close_time", Math.max),
  };
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
    ...kalshiLiveEventMarketRollups(nestedMarkets),
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
  (n) => n !== "markets" && n !== "milestones" && !KALSHI_LIVE_EVENT_MARKET_ROLLUPS.includes(n),
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
  void selectedColumns;
  const includeMarkets = !!opts.includeMarkets;
  const rowMode = normalizeKalshiLiveEventsRowMode(opts.rowMode);

  /** @type {Record<string, unknown>[]} */
  const out = [];

  for (const payload of Array.isArray(payloads) ? payloads : []) {
    const event = payload?.event && typeof payload.event === "object" ? payload.event : {};
    const markets = resolveKalshiLiveEventMarkets(event, payload?.markets);
    const milestones = payload?.milestones;

    if (includeMarkets && rowMode === KALSHI_LIVE_EVENTS_ROW_MODE_PER_MARKET) {
      out.push(
        ...expandKalshiLiveEventToMarketRows(event, markets, [], {
          milestones,
        }),
      );
      continue;
    }

    out.push(
      normalizeKalshiLiveEventRow(event, {
        markets: includeMarkets ? markets : [],
        milestones,
      }),
    );
  }

  return out;
}
