/**
 * Polymarket Live — Get markets by event(s).
 * Same event discovery as Get Event/Events, but extracts nested markets into sheets.
 */

import { MARKETS_RESPONSE_FIELDS } from "@/components/integrationsView/integrationPlayground/integrations/polymarket/config";
import {
  emptyPolymarketEventsComposeState,
  normalizePolymarketEventsComposeState,
} from "@/lib/polymarketLive/eventsCompose";

/** @typedef {import("@/lib/polymarketLive/eventsCompose").PolymarketEventsComposeState} PolymarketEventsComposeState */

/**
 * @typedef {"one_sheet" | "one_sheet_with_event_meta" | "sheet_per_event"} PolymarketMarketsByEventsSheetLayout
 */

/**
 * @typedef {PolymarketEventsComposeState & {
 *   sheetLayout: PolymarketMarketsByEventsSheetLayout;
 * }} PolymarketMarketsByEventsComposeState
 */

export const POLYMARKET_MARKETS_BY_EVENTS_ENDPOINT_ID = "getMarketsByEvents";

export const POLYMARKET_MARKETS_BY_EVENTS_SHEET_LAYOUT_ONE_SHEET =
  /** @type {PolymarketMarketsByEventsSheetLayout} */ ("one_sheet");
export const POLYMARKET_MARKETS_BY_EVENTS_SHEET_LAYOUT_WITH_EVENT_META =
  /** @type {PolymarketMarketsByEventsSheetLayout} */ ("one_sheet_with_event_meta");
export const POLYMARKET_MARKETS_BY_EVENTS_SHEET_LAYOUT_PER_EVENT =
  /** @type {PolymarketMarketsByEventsSheetLayout} */ ("sheet_per_event");

export const POLYMARKET_MARKETS_BY_EVENTS_SHEET_LAYOUT_OPTIONS = [
  {
    value: POLYMARKET_MARKETS_BY_EVENTS_SHEET_LAYOUT_ONE_SHEET,
    label: "All markets in one sheet",
    description: "Combine every market from every matched event into a single sheet.",
  },
  {
    value: POLYMARKET_MARKETS_BY_EVENTS_SHEET_LAYOUT_WITH_EVENT_META,
    label: "One sheet, include event details",
    description:
      "Same as above, and add event fields (title, id, slug, volume, …) on each market row.",
  },
  {
    value: POLYMARKET_MARKETS_BY_EVENTS_SHEET_LAYOUT_PER_EVENT,
    label: "Separate sheet per event",
    description: "Put each event’s markets on its own sheet (named after the event).",
  },
];

/** Event fields copied onto market rows when layout includes event details. */
export const POLYMARKET_MARKETS_BY_EVENTS_EVENT_META_COLUMNS = [
  { name: "event_id", type: "string", description: "Parent event ID" },
  { name: "event_ticker", type: "string", description: "Parent event ticker" },
  { name: "event_slug", type: "string", description: "Parent event slug" },
  { name: "event_title", type: "string", description: "Parent event title" },
  { name: "event_subtitle", type: "string", description: "Parent event subtitle" },
  { name: "event_active", type: "boolean", description: "Parent event active" },
  { name: "event_closed", type: "boolean", description: "Parent event closed" },
  { name: "event_live", type: "boolean", description: "Parent event live" },
  { name: "event_volume", type: "number", description: "Parent event volume" },
  { name: "event_volume24hr", type: "number", description: "Parent event volume 24h" },
  { name: "event_liquidity", type: "number", description: "Parent event liquidity" },
  { name: "event_openInterest", type: "number", description: "Parent event open interest" },
  { name: "event_startDate", type: "string", description: "Parent event start date" },
  { name: "event_endDate", type: "string", description: "Parent event end date" },
  { name: "event_category", type: "string", description: "Parent event category" },
];

export const POLYMARKET_MARKETS_BY_EVENTS_COMPOSE_COLUMNS = [
  ...MARKETS_RESPONSE_FIELDS.filter(
    (name) => !["marketId", "eventId", "outcome", "price", "winner"].includes(name),
  ).map((name) => ({
    name,
    type: "string",
    description: String(name || "")
      .replace(/([A-Z])/g, " $1")
      .trim(),
  })),
  ...POLYMARKET_MARKETS_BY_EVENTS_EVENT_META_COLUMNS,
];

export const POLYMARKET_MARKETS_BY_EVENTS_DEFAULT_COLUMNS = [
  "id",
  "question",
  "conditionId",
  "slug",
  "active",
  "closed",
  "volume",
  "volume24hr",
  "liquidity",
  "bestBid",
  "bestAsk",
  "outcomes",
  "outcomePrices",
  "clobTokenIds",
  "event_id",
  "event_slug",
  "event_title",
];

/**
 * @param {unknown} raw
 * @returns {PolymarketMarketsByEventsSheetLayout}
 */
export function normalizePolymarketMarketsByEventsSheetLayout(raw) {
  if (raw === POLYMARKET_MARKETS_BY_EVENTS_SHEET_LAYOUT_ONE_SHEET) {
    return POLYMARKET_MARKETS_BY_EVENTS_SHEET_LAYOUT_ONE_SHEET;
  }
  if (raw === POLYMARKET_MARKETS_BY_EVENTS_SHEET_LAYOUT_PER_EVENT) {
    return POLYMARKET_MARKETS_BY_EVENTS_SHEET_LAYOUT_PER_EVENT;
  }
  return POLYMARKET_MARKETS_BY_EVENTS_SHEET_LAYOUT_WITH_EVENT_META;
}

/**
 * @returns {PolymarketMarketsByEventsComposeState}
 */
export function emptyPolymarketMarketsByEventsComposeState() {
  return {
    ...emptyPolymarketEventsComposeState(),
    sheetLayout: POLYMARKET_MARKETS_BY_EVENTS_SHEET_LAYOUT_WITH_EVENT_META,
  };
}

/**
 * @param {unknown} raw
 * @returns {PolymarketMarketsByEventsComposeState}
 */
export function normalizePolymarketMarketsByEventsComposeState(raw) {
  const events = normalizePolymarketEventsComposeState(raw);
  const o = raw && typeof raw === "object" ? /** @type {Record<string, unknown>} */ (raw) : {};
  return {
    ...events,
    sheetLayout: normalizePolymarketMarketsByEventsSheetLayout(o.sheetLayout),
  };
}

/**
 * @param {unknown} value
 */
function cellValue(value) {
  if (value == null) return "";
  if (Array.isArray(value)) {
    if (value.length === 0) return "";
    if (value.every((v) => v == null || ["string", "number", "boolean"].includes(typeof v))) {
      return value.map((v) => (v == null ? "" : String(v))).join(", ");
    }
    return JSON.stringify(value);
  }
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

/**
 * @param {Record<string, unknown>} market
 * @returns {Record<string, unknown>}
 */
function flattenMarketRow(market) {
  /** @type {Record<string, unknown>} */
  const out = {};
  if (!market || typeof market !== "object") return out;
  for (const [key, value] of Object.entries(market)) {
    if (key === "events" || key === "imageOptimized" || key === "iconOptimized") continue;
    out[key] = cellValue(value);
  }
  return out;
}

/**
 * @param {Record<string, unknown>} event
 * @returns {Record<string, unknown>}
 */
function eventMetaFromEvent(event) {
  return {
    event_id: event?.id ?? "",
    event_ticker: event?.ticker ?? "",
    event_slug: event?.slug ?? "",
    event_title: event?.title ?? "",
    event_subtitle: event?.subtitle ?? "",
    event_active: event?.active ?? "",
    event_closed: event?.closed ?? "",
    event_live: event?.live ?? "",
    event_volume: event?.volume ?? "",
    event_volume24hr: event?.volume24hr ?? "",
    event_liquidity: event?.liquidity ?? "",
    event_openInterest: event?.openInterest ?? "",
    event_startDate: event?.startDate ?? "",
    event_endDate: event?.endDate ?? "",
    event_category: event?.category ?? "",
  };
}

/**
 * @param {unknown} eventsPayload
 * @param {{
 *   sheetLayout?: PolymarketMarketsByEventsSheetLayout;
 *   selectedColumns?: string[];
 * }} [opts]
 * @returns {{
 *   sheetLayout: PolymarketMarketsByEventsSheetLayout;
 *   allRows: Record<string, unknown>[];
 *   byEvent: Array<{
 *     eventId: string;
 *     sheetName: string;
 *     rows: Record<string, unknown>[];
 *   }>;
 * }}
 */
export function extractMarketsFromEventsPayload(eventsPayload, opts = {}) {
  const sheetLayout = normalizePolymarketMarketsByEventsSheetLayout(opts.sheetLayout);
  const includeEventMeta =
    sheetLayout === POLYMARKET_MARKETS_BY_EVENTS_SHEET_LAYOUT_WITH_EVENT_META;
  const selected = Array.isArray(opts.selectedColumns)
    ? opts.selectedColumns.map((c) => String(c || "").trim()).filter(Boolean)
    : [];
  const selectedSet = selected.length ? new Set(selected) : null;

  /** @param {Record<string, unknown>} row */
  const project = (row) => {
    if (!selectedSet) return row;
    /** @type {Record<string, unknown>} */
    const out = {};
    for (const key of selectedSet) {
      if (Object.prototype.hasOwnProperty.call(row, key)) out[key] = row[key];
      else out[key] = "";
    }
    return out;
  };

  const events = Array.isArray(eventsPayload)
    ? eventsPayload
    : eventsPayload != null
      ? [eventsPayload]
      : [];

  /** @type {Array<{ eventId: string; sheetName: string; rows: Record<string, unknown>[] }>} */
  const byEvent = [];
  /** @type {Record<string, unknown>[]} */
  const allRows = [];

  for (const event of events) {
    if (!event || typeof event !== "object") continue;
    const ev = /** @type {Record<string, unknown>} */ (event);
    let markets = ev.markets;
    if (typeof markets === "string") {
      try {
        markets = JSON.parse(markets);
      } catch {
        markets = [];
      }
    }
    if (!Array.isArray(markets)) markets = [];
    const meta = includeEventMeta ? eventMetaFromEvent(ev) : {};
    const eventId = String(ev.id ?? ev.slug ?? "").trim() || `event-${byEvent.length + 1}`;
    const sheetName = String(ev.title || ev.slug || ev.ticker || eventId)
      .trim()
      .slice(0, 80);

    /** @type {Record<string, unknown>[]} */
    const rows = [];
    for (const market of markets) {
      if (!market || typeof market !== "object") continue;
      const row = project({
        ...flattenMarketRow(/** @type {Record<string, unknown>} */ (market)),
        ...meta,
      });
      rows.push(row);
      allRows.push(row);
    }
    byEvent.push({ eventId, sheetName, rows });
  }

  return { sheetLayout, allRows, byEvent };
}
