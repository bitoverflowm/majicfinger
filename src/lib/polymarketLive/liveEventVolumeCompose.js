/**
 * Polymarket Live — Get live volume for event(s) (Data API GET /live-volume).
 * Discovers events with the same filters as Get Event/Events, then polls live volume per event.
 */

import {
  emptyPolymarketEventsComposeState,
  normalizePolymarketEventsComposeState,
  POLYMARKET_EVENTS_COMPOSE_COLUMNS,
} from "@/lib/polymarketLive/eventsCompose";

/** @typedef {import("@/lib/polymarketLive/eventsCompose").PolymarketEventsComposeState} PolymarketEventsComposeState */

/**
 * @typedef {"one_sheet" | "sheet_per_event" | "meta_plus_one_sheet" | "meta_plus_per_event"} PolymarketLiveEventVolumeSheetLayout
 */

/**
 * @typedef {PolymarketEventsComposeState & {
 *   sheetLayout: PolymarketLiveEventVolumeSheetLayout;
 * }} PolymarketLiveEventVolumeComposeState
 */

export const POLYMARKET_LIVE_EVENT_VOLUME_ENDPOINT_ID = "getLiveVolumeForEvent";

export const POLYMARKET_LIVE_EVENT_VOLUME_SHEET_LAYOUT_ONE_SHEET =
  /** @type {PolymarketLiveEventVolumeSheetLayout} */ ("one_sheet");
export const POLYMARKET_LIVE_EVENT_VOLUME_SHEET_LAYOUT_PER_EVENT =
  /** @type {PolymarketLiveEventVolumeSheetLayout} */ ("sheet_per_event");
export const POLYMARKET_LIVE_EVENT_VOLUME_SHEET_LAYOUT_META_PLUS_ONE_SHEET =
  /** @type {PolymarketLiveEventVolumeSheetLayout} */ ("meta_plus_one_sheet");
export const POLYMARKET_LIVE_EVENT_VOLUME_SHEET_LAYOUT_META_PLUS_PER_EVENT =
  /** @type {PolymarketLiveEventVolumeSheetLayout} */ ("meta_plus_per_event");

export const POLYMARKET_LIVE_EVENT_VOLUME_LIVE_FIELDS = [
  { name: "live_total", type: "number", description: "Event live volume total from GET /live-volume" },
  { name: "market", type: "string", description: "Market condition id (0x… hash)" },
  { name: "market_value", type: "number", description: "Live volume for this market" },
];

export const POLYMARKET_LIVE_EVENT_VOLUME_LIVE_FIELD_NAMES = POLYMARKET_LIVE_EVENT_VOLUME_LIVE_FIELDS.map(
  (c) => c.name,
);

export const POLYMARKET_LIVE_EVENT_VOLUME_SHEET_LAYOUT_OPTIONS = [
  {
    value: POLYMARKET_LIVE_EVENT_VOLUME_SHEET_LAYOUT_ONE_SHEET,
    label: "All live volume in one sheet",
    description:
      "Normalize every event’s markets into one sheet. Each row has event details, live_total, and one market’s volume.",
  },
  {
    value: POLYMARKET_LIVE_EVENT_VOLUME_SHEET_LAYOUT_PER_EVENT,
    label: "Separate sheet per event",
    description: "Put each event’s market volumes on its own sheet (named after the event).",
  },
  {
    value: POLYMARKET_LIVE_EVENT_VOLUME_SHEET_LAYOUT_META_PLUS_ONE_SHEET,
    label: "Event metadata + all markets",
    description:
      "Sheet 1: all matching events. Sheet 2: every event’s markets extracted into one sheet.",
  },
  {
    value: POLYMARKET_LIVE_EVENT_VOLUME_SHEET_LAYOUT_META_PLUS_PER_EVENT,
    label: "Event metadata + sheet per event",
    description: "Sheet 1: all matching events. Then one market-volume sheet per event.",
  },
];

export const POLYMARKET_LIVE_EVENT_VOLUME_COMPOSE_COLUMNS = [
  ...POLYMARKET_EVENTS_COMPOSE_COLUMNS,
  ...POLYMARKET_LIVE_EVENT_VOLUME_LIVE_FIELDS,
];

export const POLYMARKET_LIVE_EVENT_VOLUME_DEFAULT_COLUMNS = [
  "id",
  "ticker",
  "slug",
  "title",
  "active",
  "closed",
  "live",
  "volume",
  "startDate",
  "endDate",
  "live_total",
  "market",
  "market_value",
];

/**
 * @param {unknown} raw
 * @returns {PolymarketLiveEventVolumeSheetLayout}
 */
export function normalizePolymarketLiveEventVolumeSheetLayout(raw) {
  if (raw === POLYMARKET_LIVE_EVENT_VOLUME_SHEET_LAYOUT_PER_EVENT) {
    return POLYMARKET_LIVE_EVENT_VOLUME_SHEET_LAYOUT_PER_EVENT;
  }
  if (raw === POLYMARKET_LIVE_EVENT_VOLUME_SHEET_LAYOUT_META_PLUS_ONE_SHEET) {
    return POLYMARKET_LIVE_EVENT_VOLUME_SHEET_LAYOUT_META_PLUS_ONE_SHEET;
  }
  if (raw === POLYMARKET_LIVE_EVENT_VOLUME_SHEET_LAYOUT_META_PLUS_PER_EVENT) {
    return POLYMARKET_LIVE_EVENT_VOLUME_SHEET_LAYOUT_META_PLUS_PER_EVENT;
  }
  return POLYMARKET_LIVE_EVENT_VOLUME_SHEET_LAYOUT_ONE_SHEET;
}

/**
 * @param {PolymarketLiveEventVolumeSheetLayout | string} layout
 */
export function liveEventVolumeLayoutIncludesMetadata(layout) {
  const n = normalizePolymarketLiveEventVolumeSheetLayout(layout);
  return (
    n === POLYMARKET_LIVE_EVENT_VOLUME_SHEET_LAYOUT_META_PLUS_ONE_SHEET ||
    n === POLYMARKET_LIVE_EVENT_VOLUME_SHEET_LAYOUT_META_PLUS_PER_EVENT
  );
}

/**
 * @param {PolymarketLiveEventVolumeSheetLayout | string} layout
 */
export function liveEventVolumeLayoutIsPerEvent(layout) {
  const n = normalizePolymarketLiveEventVolumeSheetLayout(layout);
  return (
    n === POLYMARKET_LIVE_EVENT_VOLUME_SHEET_LAYOUT_PER_EVENT ||
    n === POLYMARKET_LIVE_EVENT_VOLUME_SHEET_LAYOUT_META_PLUS_PER_EVENT
  );
}

/**
 * @returns {PolymarketLiveEventVolumeComposeState}
 */
export function emptyPolymarketLiveEventVolumeComposeState() {
  return {
    ...emptyPolymarketEventsComposeState(),
    sheetLayout: POLYMARKET_LIVE_EVENT_VOLUME_SHEET_LAYOUT_ONE_SHEET,
  };
}

/**
 * @param {unknown} raw
 * @returns {PolymarketLiveEventVolumeComposeState}
 */
export function normalizePolymarketLiveEventVolumeComposeState(raw) {
  const events = normalizePolymarketEventsComposeState(raw);
  const o = raw && typeof raw === "object" ? /** @type {Record<string, unknown>} */ (raw) : {};
  return {
    ...events,
    sheetLayout: normalizePolymarketLiveEventVolumeSheetLayout(o.sheetLayout),
  };
}

/**
 * @param {unknown} value
 */
export function liveEventVolumeCellValue(value) {
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
 * @param {string[]} selectedColumns
 * @returns {{ eventColumns: string[]; liveColumns: string[] }}
 */
export function splitLiveEventVolumeSelectedColumns(selectedColumns) {
  const selected = Array.isArray(selectedColumns)
    ? selectedColumns.map((c) => String(c || "").trim()).filter(Boolean)
    : [];
  const liveSet = new Set(POLYMARKET_LIVE_EVENT_VOLUME_LIVE_FIELD_NAMES);
  const eventColumns = selected.filter((c) => !liveSet.has(c));
  const liveColumns = selected.filter((c) => liveSet.has(c));
  return {
    eventColumns: eventColumns.length ? eventColumns : [],
    liveColumns: liveColumns.length ? liveColumns : [...POLYMARKET_LIVE_EVENT_VOLUME_LIVE_FIELD_NAMES],
  };
}

/**
 * Event metadata sheet row — original event field names.
 *
 * @param {Record<string, unknown> | null | undefined} event
 * @param {string[]} eventColumns
 * @returns {Record<string, unknown>}
 */
export function projectEventMetadataRow(event, eventColumns) {
  const ev = event && typeof event === "object" ? event : {};
  const cols = Array.isArray(eventColumns) && eventColumns.length ? eventColumns : ["id", "title", "slug"];
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const key of cols) {
    out[key] = liveEventVolumeCellValue(ev[key]);
  }
  if (!("id" in out)) out.id = liveEventVolumeCellValue(ev.id);
  return out;
}

/**
 * Prefixed event fields for normalized market rows (`id` → `event_id`).
 *
 * @param {Record<string, unknown> | null | undefined} event
 * @param {string[]} eventColumns
 * @returns {Record<string, unknown>}
 */
export function projectEventPrefixForMarketRow(event, eventColumns) {
  const ev = event && typeof event === "object" ? event : {};
  const cols = Array.isArray(eventColumns) && eventColumns.length ? eventColumns : ["id", "title", "slug"];
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const key of cols) {
    out[`event_${key}`] = liveEventVolumeCellValue(ev[key]);
  }
  if (!("event_id" in out)) out.event_id = liveEventVolumeCellValue(ev.id);
  return out;
}

/**
 * Expand GET /live-volume payload into one row per market.
 *
 * @param {unknown} payload
 * @param {Record<string, unknown> | null | undefined} event
 * @param {{ selectedColumns?: string[] }} [opts]
 * @returns {Record<string, unknown>[]}
 */
export function expandLiveVolumeToMarketRows(payload, event, opts = {}) {
  const { eventColumns, liveColumns } = splitLiveEventVolumeSelectedColumns(opts.selectedColumns || []);
  const liveSet = new Set(liveColumns.length ? liveColumns : POLYMARKET_LIVE_EVENT_VOLUME_LIVE_FIELD_NAMES);
  const prefix = projectEventPrefixForMarketRow(event, eventColumns);

  const arr = Array.isArray(payload) ? payload : payload != null ? [payload] : [];
  const first = arr.find((item) => item && typeof item === "object") || {};
  const total = first.total ?? "";
  let markets = first.markets;
  if (typeof markets === "string") {
    try {
      markets = JSON.parse(markets);
    } catch {
      markets = [];
    }
  }
  if (!Array.isArray(markets)) markets = [];

  /** @param {string} market @param {unknown} value */
  const rowFor = (market, value) => {
    /** @type {Record<string, unknown>} */
    const row = { ...prefix };
    if (liveSet.has("live_total")) row.live_total = total;
    if (liveSet.has("market")) row.market = market;
    if (liveSet.has("market_value")) row.market_value = value ?? "";
    return row;
  };

  if (!markets.length) {
    return [rowFor("", "")];
  }

  /** @type {Record<string, unknown>[]} */
  const rows = [];
  for (const item of markets) {
    if (!item || typeof item !== "object") continue;
    const m = /** @type {Record<string, unknown>} */ (item);
    rows.push(rowFor(String(m.market ?? m.conditionId ?? "").trim(), m.value ?? m.volume ?? ""));
  }
  return rows.length ? rows : [rowFor("", "")];
}

/**
 * @param {import("@/lib/polymarketLive/polymarketPublicSearch").PolymarketPublicSearchSuggestion | null | undefined} suggestion
 * @returns {import("@/lib/polymarketLive/eventsCompose").PolymarketEventRef | null}
 */
export function eventRefFromPublicSearchSuggestion(suggestion) {
  if (!suggestion) return null;
  const raw =
    suggestion.raw && typeof suggestion.raw === "object"
      ? /** @type {Record<string, unknown>} */ (suggestion.raw)
      : {};
  const id = String(suggestion.id || raw.id || "").trim();
  const slug = String(suggestion.slug || raw.slug || "").trim();
  const title = String(suggestion.title || raw.title || "").trim();
  if (!id && !slug) return null;
  return {
    id: id || slug,
    slug: slug || undefined,
    title: title || undefined,
  };
}
