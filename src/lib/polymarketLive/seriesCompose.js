/**
 * Polymarket Live - Series compose (lookup by id + list series discovery).
 */

import { MARKETS_RESPONSE_FIELDS } from "@/components/integrationsView/integrationPlayground/integrations/polymarket/config";
import {
  POLYMARKET_EVENTS_COMPOSE_COLUMNS,
  POLYMARKET_EVENTS_RECURRENCE_OPTIONS,
} from "@/lib/polymarketLive/eventsCompose";

/** @typedef {"lookup" | "list"} PolymarketSeriesComposeMode */
/** @typedef {"series_only" | "series_and_events" | "series_events_and_markets"} PolymarketSeriesSheetLayout */

/**
 * @typedef {{
 *   mode: PolymarketSeriesComposeMode;
 *   seriesId: string;
 *   limit: number;
 *   offset: number;
 *   orderFields: string[];
 *   ascending: boolean;
 *   slugs: string[];
 *   categoryIds: string[];
 *   categoryLabels: string[];
 *   recurrence: string;
 *   includeChat: boolean | null;
 *   closed: boolean | null;
 *   excludeEvents: boolean | null;
 *   sheetLayout: PolymarketSeriesSheetLayout;
 * }} PolymarketSeriesComposeState
 */

export const POLYMARKET_SERIES_COMPOSE_ENDPOINT_ID = "series";

export const POLYMARKET_SERIES_SORT_OPTIONS = [
  { value: "id", label: "ID" },
  { value: "volume", label: "Volume" },
  { value: "volume24hr", label: "Volume (24h)" },
  { value: "liquidity", label: "Liquidity" },
  { value: "startDate", label: "Start date" },
  { value: "createdAt", label: "Created at" },
  { value: "updatedAt", label: "Updated at" },
  { value: "title", label: "Title" },
  { value: "slug", label: "Slug" },
];

export const POLYMARKET_SERIES_RECURRENCE_OPTIONS = POLYMARKET_EVENTS_RECURRENCE_OPTIONS;

export const POLYMARKET_SERIES_SHEET_LAYOUT_OPTIONS = [
  {
    value: "series_only",
    label: "Series metadata only",
    description: "Write the requested series fields into one sheet.",
  },
  {
    value: "series_and_events",
    label: "Series sheet + events sheet",
    description: "Write series metadata first, then list the events inside that series.",
  },
  {
    value: "series_events_and_markets",
    label: "Series, events, then markets by event",
    description:
      "Write series metadata first, events second, then one market sheet for each event in the series.",
  },
];

export const POLYMARKET_SERIES_COLUMNS = [
  { name: "series:id", type: "string", description: "Series ID" },
  { name: "series:ticker", type: "string", description: "Series ticker" },
  { name: "series:slug", type: "string", description: "Series slug" },
  { name: "series:title", type: "string", description: "Series title" },
  { name: "series:subtitle", type: "string", description: "Series subtitle" },
  { name: "series:seriesType", type: "string", description: "Series type" },
  { name: "series:recurrence", type: "string", description: "Recurrence" },
  { name: "series:description", type: "string", description: "Description" },
  { name: "series:image", type: "string", description: "Image URL" },
  { name: "series:icon", type: "string", description: "Icon URL" },
  { name: "series:layout", type: "string", description: "Layout" },
  { name: "series:active", type: "boolean", description: "Active" },
  { name: "series:closed", type: "boolean", description: "Closed" },
  { name: "series:archived", type: "boolean", description: "Archived" },
  { name: "series:new", type: "boolean", description: "New" },
  { name: "series:featured", type: "boolean", description: "Featured" },
  { name: "series:restricted", type: "boolean", description: "Restricted" },
  { name: "series:isTemplate", type: "boolean", description: "Is template" },
  { name: "series:templateVariables", type: "string", description: "Template variables" },
  { name: "series:publishedAt", type: "string", description: "Published at" },
  { name: "series:createdBy", type: "string", description: "Created by" },
  { name: "series:updatedBy", type: "string", description: "Updated by" },
  { name: "series:createdAt", type: "string", description: "Created at" },
  { name: "series:updatedAt", type: "string", description: "Updated at" },
  { name: "series:commentsEnabled", type: "boolean", description: "Comments enabled" },
  { name: "series:competitive", type: "string", description: "Competitive" },
  { name: "series:volume24hr", type: "number", description: "Volume 24h" },
  { name: "series:volume", type: "number", description: "Volume" },
  { name: "series:liquidity", type: "number", description: "Liquidity" },
  { name: "series:startDate", type: "string", description: "Start date" },
  { name: "series:pythTokenID", type: "string", description: "Pyth token ID" },
  { name: "series:cgAssetName", type: "string", description: "CoinGecko asset name" },
  { name: "series:score", type: "number", description: "Score" },
  { name: "series:commentCount", type: "number", description: "Comment count" },
  { name: "series:events", type: "string", description: "Nested events (JSON)" },
  { name: "series:collections", type: "string", description: "Collections (JSON)" },
  { name: "series:categories", type: "string", description: "Categories (JSON)" },
  { name: "series:tags", type: "string", description: "Tags (JSON)" },
  { name: "series:chats", type: "string", description: "Chats (JSON)" },
];

export const POLYMARKET_SERIES_EVENT_COLUMNS = POLYMARKET_EVENTS_COMPOSE_COLUMNS.map((col) => ({
  name: `event:${col.name}`,
  type: col.type,
  description: `Event - ${col.description}`,
}));

export const POLYMARKET_SERIES_MARKET_COLUMNS = [
  ...MARKETS_RESPONSE_FIELDS.filter(
    (name) => !["marketId", "eventId", "outcome", "price", "winner"].includes(name),
  ).map((name) => ({
    name: `market:${name}`,
    type: "string",
    description: `Market - ${String(name || "").replace(/([A-Z])/g, " $1").trim()}`,
  })),
  { name: "market:event_id", type: "string", description: "Market sheet - parent event ID" },
  { name: "market:event_title", type: "string", description: "Market sheet - parent event title" },
  { name: "market:series_id", type: "string", description: "Market sheet - parent series ID" },
  { name: "market:series_title", type: "string", description: "Market sheet - parent series title" },
];

export const POLYMARKET_SERIES_COMPOSE_COLUMNS = [
  ...POLYMARKET_SERIES_COLUMNS,
  ...POLYMARKET_SERIES_EVENT_COLUMNS,
  ...POLYMARKET_SERIES_MARKET_COLUMNS,
];

export const POLYMARKET_SERIES_DEFAULT_COLUMNS = [
  "series:id",
  "series:slug",
  "series:title",
  "series:seriesType",
  "series:recurrence",
  "series:active",
  "series:closed",
  "series:volume",
  "series:volume24hr",
  "series:liquidity",
  "series:startDate",
  "event:id",
  "event:title",
  "event:slug",
  "event:active",
  "event:closed",
  "event:volume",
  "event:startDate",
  "market:id",
  "market:question",
  "market:slug",
  "market:active",
  "market:closed",
  "market:volume",
  "market:liquidity",
  "market:bestBid",
  "market:bestAsk",
  "market:event_title",
];

export function normalizePolymarketSeriesSheetLayout(raw) {
  if (raw === "series_only" || raw === "series_and_events" || raw === "series_events_and_markets") {
    return raw;
  }
  return "series_events_and_markets";
}

export function emptyPolymarketSeriesComposeState() {
  return {
    mode: "lookup",
    seriesId: "",
    limit: 20,
    offset: 0,
    orderFields: ["volume"],
    ascending: false,
    slugs: [],
    categoryIds: [],
    categoryLabels: [],
    recurrence: "",
    includeChat: null,
    closed: null,
    excludeEvents: null,
    sheetLayout: "series_events_and_markets",
  };
}

export function normalizePolymarketSeriesComposeState(raw) {
  const base = emptyPolymarketSeriesComposeState();
  if (!raw || typeof raw !== "object") return base;
  const o = /** @type {Record<string, unknown>} */ (raw);
  const tri = (v) => (v === true ? true : v === false ? false : null);
  const list = (value) =>
    Array.isArray(value)
      ? value.map((item) => String(item || "").trim()).filter(Boolean)
      : typeof value === "string"
        ? value
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
        : [];
  const limitNum = Number(o.limit);
  const offsetNum = Number(o.offset);
  const orderFields = list(o.orderFields);
  return {
    mode: o.mode === "list" ? "list" : "lookup",
    seriesId: String(o.seriesId || "").trim(),
    limit: Number.isFinite(limitNum) && limitNum >= 0 ? Math.min(500, Math.floor(limitNum)) : 20,
    offset: Number.isFinite(offsetNum) && offsetNum >= 0 ? Math.floor(offsetNum) : 0,
    orderFields: orderFields.length ? orderFields : base.orderFields,
    ascending: o.ascending === true,
    slugs: list(o.slugs),
    categoryIds: list(o.categoryIds),
    categoryLabels: list(o.categoryLabels),
    recurrence: String(o.recurrence || "").trim(),
    includeChat: tri(o.includeChat),
    closed: tri(o.closed),
    excludeEvents: tri(o.excludeEvents),
    sheetLayout: normalizePolymarketSeriesSheetLayout(o.sheetLayout),
  };
}

export function buildPolymarketSeriesListQueryValues(state) {
  const s = normalizePolymarketSeriesComposeState(state);
  /** @type {Record<string, string>} */
  const values = {
    limit: String(s.limit),
    offset: String(s.offset),
  };
  if (s.orderFields.length) values.order = s.orderFields.join(",");
  values.ascending = s.ascending ? "true" : "false";
  if (s.slugs.length) values.slug = s.slugs.join(",");
  if (s.categoryIds.length) values.categories_ids = s.categoryIds.join(",");
  if (s.categoryLabels.length) values.categories_labels = s.categoryLabels.join(",");
  if (s.recurrence) values.recurrence = s.recurrence;
  if (s.includeChat === true) values.include_chat = "true";
  else if (s.includeChat === false) values.include_chat = "false";
  if (s.closed === true) values.closed = "true";
  else if (s.closed === false) values.closed = "false";
  if (s.excludeEvents === true) values.exclude_events = "true";
  else if (s.excludeEvents === false) values.exclude_events = "false";
  return values;
}

