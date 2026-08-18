import { flushSync } from "react-dom";

import {
  applyConnectHomePullData,
  prepareConnectHomePullSheet,
} from "@/lib/connectHomePullDestination";
import {
  POLYMARKET_SERIES_DEFAULT_COLUMNS,
  normalizePolymarketSeriesSheetLayout,
} from "@/lib/polymarketLive/seriesCompose";

function allocateNextSheetId(dataSheets) {
  const keys = Object.keys(dataSheets || {});
  const nextNum =
    keys.reduce((max, key) => {
      const n = parseInt(String(key).replace(/\D/g, ""), 10) || 0;
      return Math.max(max, n);
    }, 0) + 1;
  return `sheet-${nextNum}`;
}

function cellValue(value) {
  if (value == null) return "";
  if (Array.isArray(value)) {
    if (!value.length) return "";
    if (value.every((item) => item == null || ["string", "number", "boolean"].includes(typeof item))) {
      return value.map((item) => (item == null ? "" : String(item))).join(", ");
    }
    return JSON.stringify(value);
  }
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

function flattenObject(source, excludeKeys = new Set()) {
  const out = {};
  if (!source || typeof source !== "object") return out;
  for (const [key, value] of Object.entries(source)) {
    if (excludeKeys.has(key)) continue;
    out[key] = cellValue(value);
  }
  return out;
}

function pickPrefixedColumns(selectedColumns, prefix, fallback) {
  const prefixed = (selectedColumns || [])
    .map((value) => String(value || "").trim())
    .filter((value) => value.startsWith(`${prefix}:`))
    .map((value) => value.slice(prefix.length + 1));
  return prefixed.length ? prefixed : fallback;
}

function filterRow(row, allowed) {
  if (!allowed?.length) return row;
  return Object.fromEntries(
    Object.entries(row).filter(([key]) => allowed.includes(key)),
  );
}

function sheetName(label, fallback) {
  const value = String(label || fallback || "Sheet").trim();
  return value.slice(0, 80);
}

export function flattenPolymarketSeriesRows(seriesPayload, selectedColumns = []) {
  const seriesList = Array.isArray(seriesPayload)
    ? seriesPayload
    : seriesPayload != null
      ? [seriesPayload]
      : [];
  const seriesCols = pickPrefixedColumns(selectedColumns, "series", POLYMARKET_SERIES_DEFAULT_COLUMNS
    .filter((name) => name.startsWith("series:"))
    .map((name) => name.slice(7)));
  return seriesList.map((series) => filterRow(flattenObject(series), seriesCols));
}

export function extractPolymarketSeriesPayload(seriesPayload, opts = {}) {
  const series = seriesPayload && typeof seriesPayload === "object" ? seriesPayload : {};
  const selectedColumns = Array.isArray(opts.selectedColumns) ? opts.selectedColumns : [];
  const layout = normalizePolymarketSeriesSheetLayout(opts.sheetLayout);
  const seriesCols = pickPrefixedColumns(
    selectedColumns,
    "series",
    POLYMARKET_SERIES_DEFAULT_COLUMNS.filter((name) => name.startsWith("series:")).map((name) =>
      name.slice(7),
    ),
  );
  const eventCols = pickPrefixedColumns(
    selectedColumns,
    "event",
    POLYMARKET_SERIES_DEFAULT_COLUMNS.filter((name) => name.startsWith("event:")).map((name) =>
      name.slice(6),
    ),
  );
  const marketCols = pickPrefixedColumns(
    selectedColumns,
    "market",
    POLYMARKET_SERIES_DEFAULT_COLUMNS.filter((name) => name.startsWith("market:")).map((name) =>
      name.slice(7),
    ),
  );

  const seriesRow = filterRow(
    flattenObject(series, new Set(["events"])),
    seriesCols,
  );
  const events = Array.isArray(series?.events) ? series.events : [];
  const eventRows = events.map((event) => filterRow(flattenObject(event, new Set(["markets"])), eventCols));
  const marketSheets = events.map((event) => {
    const markets = Array.isArray(event?.markets) ? event.markets : [];
    return {
      eventId: String(event?.id || ""),
      sheetName: sheetName(event?.title, event?.slug || event?.id || "Markets"),
      rows: markets.map((market) =>
        filterRow(
          {
            ...flattenObject(market),
            event_id: event?.id ?? "",
            event_title: event?.title ?? "",
            series_id: series?.id ?? "",
            series_title: series?.title ?? "",
          },
          marketCols,
        ),
      ),
    };
  });

  return {
    sheetLayout: layout,
    seriesRow,
    eventRows,
    marketSheets,
  };
}

export function applyPolymarketSeriesLookupPayload(ctx, payload, opts = {}) {
  const extracted = extractPolymarketSeriesPayload(payload, opts);
  prepareConnectHomePullSheet(ctx);
  let firstSheetId = ctx?.activeSheetId || null;
  flushSync(() => {
    ctx.setDataSheets?.((prev) => {
      let next = { ...(prev || {}) };
      const rootId = firstSheetId && next[firstSheetId] ? firstSheetId : allocateNextSheetId(next);
      const rootExisting = next[rootId] || { name: "Series", data: [] };
      next[rootId] = {
        ...rootExisting,
        name: sheetName(extracted.seriesRow.title, "Series"),
        data: extracted.seriesRow && Object.keys(extracted.seriesRow).length ? [extracted.seriesRow] : [],
      };
      firstSheetId = rootId;

      if (extracted.sheetLayout !== "series_only") {
        const eventsSheetId = allocateNextSheetId(next);
        next[eventsSheetId] = {
          ...(next[eventsSheetId] || { data: [] }),
          name: sheetName(`${extracted.seriesRow.title || extracted.seriesRow.slug || "Series"} events`, "Series events"),
          data: extracted.eventRows,
        };
        if (extracted.sheetLayout === "series_events_and_markets") {
          for (const group of extracted.marketSheets) {
            if (!group.rows.length) continue;
            const marketSheetId = allocateNextSheetId(next);
            next[marketSheetId] = {
              ...(next[marketSheetId] || { data: [] }),
              name: sheetName(group.sheetName, "Markets"),
              data: group.rows,
            };
          }
        }
      }
      return next;
    });
    if (firstSheetId && ctx?.setActiveSheetId) ctx.setActiveSheetId(firstSheetId);
    ctx?.setConnectHomeAnalyzeActive?.(true);
  });
  ctx?.requestConnectAnalyzeScroll?.();
  return (
    (extracted.seriesRow && Object.keys(extracted.seriesRow).length ? 1 : 0) +
    extracted.eventRows.length +
    extracted.marketSheets.reduce((sum, group) => sum + group.rows.length, 0)
  );
}

export function applyPolymarketSeriesListPayload(ctx, payload, opts = {}) {
  const rows = flattenPolymarketSeriesRows(payload, opts.selectedColumns);
  if (!rows.length) return 0;
  prepareConnectHomePullSheet(ctx);
  flushSync(() => {
    applyConnectHomePullData(ctx, rows);
    ctx?.setConnectHomeAnalyzeActive?.(true);
  });
  ctx?.requestConnectAnalyzeScroll?.();
  return rows.length;
}

