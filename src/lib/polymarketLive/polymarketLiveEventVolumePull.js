import { flushSync } from "react-dom";

import {
  applyConnectHomeSheetNameToSheet,
  resolveConnectHomeSheetDestination,
} from "@/lib/connectHomePullDestination";
import { buildPolymarketEventsListQueryValues } from "@/lib/polymarketLive/eventsCompose";
import {
  eventRefFromPublicSearchSuggestion,
  expandLiveVolumeToMarketRows,
  liveEventVolumeLayoutIncludesMetadata,
  liveEventVolumeLayoutIsPerEvent,
  normalizePolymarketLiveEventVolumeComposeState,
  normalizePolymarketLiveEventVolumeSheetLayout,
  projectEventMetadataRow,
  splitLiveEventVolumeSelectedColumns,
} from "@/lib/polymarketLive/liveEventVolumeCompose";

/**
 * @param {Record<string, unknown>} dataSheets
 * @returns {string}
 */
function allocateNextSheetId(dataSheets) {
  const keys = Object.keys(dataSheets || {});
  const nextNum =
    keys.reduce((max, k) => {
      const n = parseInt(String(k).replace(/\D/g, ""), 10) || 0;
      return Math.max(max, n);
    }, 0) + 1;
  return `sheet-${nextNum}`;
}

/**
 * @param {{ title?: string; slug?: string; id?: string }} meta
 * @param {number} index
 */
function sheetNameForEvent(meta, index) {
  const title = String(meta?.title || "").trim();
  if (title) return title.slice(0, 80);
  const slug = String(meta?.slug || "").trim();
  if (slug) return slug.slice(0, 80);
  const id = String(meta?.id || "").trim();
  if (id) return `Event ${id}`.slice(0, 80);
  return `Event ${index + 1}`;
}

/**
 * @param {unknown} payload
 * @returns {Record<string, unknown>[]}
 */
function asObjectList(payload) {
  const arr = Array.isArray(payload) ? payload : payload != null ? [payload] : [];
  return arr.filter((item) => item && typeof item === "object");
}

/**
 * @param {import("@/lib/polymarketLive/eventsCompose").PolymarketEventRef[]} refs
 * @returns {Promise<Record<string, unknown>[]>}
 */
export async function resolveLiveVolumeEventsFromRefs(refs) {
  const list = Array.isArray(refs) ? refs : [];
  if (!list.length) return [];

  const ids = [...new Set(list.map((r) => String(r.id || "").trim()).filter((id) => /^\d+$/.test(id)))];
  const slugs = [...new Set(list.map((r) => String(r.slug || "").trim()).filter(Boolean))];

  const params = new URLSearchParams({ query: "listEvents", skipFlatten: "1", limit: "100" });
  if (ids.length) params.set("id", ids.join(","));
  else if (slugs.length) params.set("slug", slugs.join(","));
  else return list.map((r) => ({ id: r.id, slug: r.slug, title: r.title }));

  try {
    const res = await fetch(`/api/integrations/polymarket?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    });
    const data = await res.json().catch(() => []);
    if (!res.ok) {
      return list.map((r) => ({ id: r.id, slug: r.slug, title: r.title }));
    }
    const events = asObjectList(data);
    if (!events.length) return list.map((r) => ({ id: r.id, slug: r.slug, title: r.title }));

    /** @type {Map<string, Record<string, unknown>>} */
    const byId = new Map();
    /** @type {Map<string, Record<string, unknown>>} */
    const bySlug = new Map();
    for (const ev of events) {
      const id = String(ev.id || "").trim();
      const slug = String(ev.slug || "").trim();
      if (id) byId.set(id, ev);
      if (slug) bySlug.set(slug, ev);
    }

    return list.map((r) => {
      const hit = (r.id && byId.get(String(r.id))) || (r.slug && bySlug.get(String(r.slug))) || null;
      if (hit) return hit;
      return { id: r.id, slug: r.slug, title: r.title };
    });
  } catch {
    return list.map((r) => ({ id: r.id, slug: r.slug, title: r.title }));
  }
}

/**
 * @param {import("@/lib/polymarketLive/eventsCompose").PolymarketEventsComposeState} eventsFilters
 * @returns {Promise<Record<string, unknown>[]>}
 */
export async function discoverLiveVolumeEventsFromListFilters(eventsFilters) {
  const values = buildPolymarketEventsListQueryValues({
    ...eventsFilters,
    mode: "advanced",
  });
  const params = new URLSearchParams({ query: "listEvents", skipFlatten: "1" });
  for (const [k, v] of Object.entries(values)) {
    if (v === undefined || v === null || v === "") continue;
    params.set(k, String(v));
  }
  const res = await fetch(`/api/integrations/polymarket?${params.toString()}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "same-origin",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(typeof data?.message === "string" ? data.message : "Failed to list events");
  }
  return asObjectList(data);
}

/**
 * @param {unknown} payload
 * @returns {unknown}
 */
function firstLiveVolumeItem(payload) {
  const arr = Array.isArray(payload) ? payload : payload != null ? [payload] : [];
  return arr.find((item) => item && typeof item === "object") || payload;
}

/**
 * Fetch live volume for compose state and stream batches as each event completes.
 *
 * @param {import("@/lib/polymarketLive/liveEventVolumeCompose").PolymarketLiveEventVolumeComposeState} compose
 * @param {{
 *   selectedColumns?: string[];
 *   eventRefsOverride?: import("@/lib/polymarketLive/eventsCompose").PolymarketEventRef[];
 *   onEventRows?: (batch: {
 *     eventId: string;
 *     sheetName: string;
 *     metadataRow: Record<string, unknown>;
 *     marketRows: Record<string, unknown>[];
 *     index: number;
 *     total: number;
 *   }) => void | Promise<void>;
 * }} [opts]
 */
export async function fetchPolymarketLiveEventVolumeRows(compose, opts = {}) {
  const normalized = normalizePolymarketLiveEventVolumeComposeState(compose);
  const sheetLayout = normalizePolymarketLiveEventVolumeSheetLayout(normalized.sheetLayout);
  const selected = Array.isArray(opts.selectedColumns) ? opts.selectedColumns : [];
  const { eventColumns } = splitLiveEventVolumeSelectedColumns(selected);

  let events = [];
  if (Array.isArray(opts.eventRefsOverride) && opts.eventRefsOverride.length) {
    events = await resolveLiveVolumeEventsFromRefs(opts.eventRefsOverride);
  } else if (normalized.mode === "advanced") {
    events = await discoverLiveVolumeEventsFromListFilters(normalized);
    if (!events.length) {
      throw new Error("No events matched your filters.");
    }
  } else {
    events = await resolveLiveVolumeEventsFromRefs(normalized.eventRefs);
  }

  const unique = [];
  const seen = new Set();
  for (const ev of events) {
    const id = String(ev?.id || "").trim();
    const slug = String(ev?.slug || "").trim();
    const key = id || slug;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(ev);
  }
  if (!unique.length) {
    throw new Error("Select at least one event with an id.");
  }

  /** @type {Record<string, unknown>[]} */
  const allMarketRows = [];
  /** @type {Record<string, unknown>[]} */
  const metadataRows = [];
  /** @type {Array<{ eventId: string; sheetName: string; metadataRow: Record<string, unknown>; marketRows: Record<string, unknown>[] }>} */
  const byEvent = [];
  /** @type {string[]} */
  const failures = [];

  for (let i = 0; i < unique.length; i++) {
    const ev = unique[i];
    const eventId = String(ev.id || "").trim();
    if (!eventId) {
      failures.push(String(ev.slug || `event ${i + 1}`));
      continue;
    }
    const sheetName = sheetNameForEvent(ev, i);
    const metadataRow = projectEventMetadataRow(ev, eventColumns);

    try {
      const params = new URLSearchParams({
        query: "getLiveVolume",
        id: eventId,
        skipFlatten: "1",
      });
      const res = await fetch(`/api/integrations/polymarket?${params.toString()}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "same-origin",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data?.message === "string" ? data.message : "Request failed");
      }
      const marketRows = expandLiveVolumeToMarketRows(firstLiveVolumeItem(data), ev, {
        selectedColumns: selected,
      });
      metadataRows.push(metadataRow);
      allMarketRows.push(...marketRows);
      byEvent.push({ eventId, sheetName, metadataRow, marketRows });
      await opts.onEventRows?.({
        eventId,
        sheetName,
        metadataRow,
        marketRows,
        index: i,
        total: unique.length,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Request failed";
      failures.push(`${eventId}: ${msg}`);
      // Still emit metadata so partial progress is visible.
      metadataRows.push(metadataRow);
      const marketRows = expandLiveVolumeToMarketRows({ total: "", markets: [] }, ev, {
        selectedColumns: selected,
      });
      allMarketRows.push(...marketRows);
      byEvent.push({ eventId, sheetName, metadataRow, marketRows });
      await opts.onEventRows?.({
        eventId,
        sheetName,
        metadataRow,
        marketRows,
        index: i,
        total: unique.length,
      });
    }
  }

  if (!byEvent.length) {
    throw new Error(failures[0] || "No live volume found for the selected events.");
  }

  return {
    rows: allMarketRows,
    metadataRows,
    byEvent,
    sheetLayout,
    eventsDiscovered: unique.length,
    failures,
  };
}

/**
 * Incremental sheet writer for live-volume pulls.
 *
 * @param {Record<string, unknown>} ctx
 * @param {{ sheetLayout?: string }} [opts]
 */
export function createPolymarketLiveEventVolumeWaterfallWriter(ctx, opts = {}) {
  const sheetLayout = normalizePolymarketLiveEventVolumeSheetLayout(opts.sheetLayout);
  const includeMeta = liveEventVolumeLayoutIncludesMetadata(sheetLayout);
  const perEvent = liveEventVolumeLayoutIsPerEvent(sheetLayout);
  let prepared = false;
  let metadataSheetId = null;
  let combinedMarketsSheetId = null;
  let firstEventSheetId = null;
  let writtenEvents = 0;

  const renameSheet = (sheetId, name) => {
    if (!sheetId || !ctx?.setDataSheets) return;
    ctx.setDataSheets((prev) => {
      const existing = prev?.[sheetId];
      if (!existing) return prev;
      return {
        ...(prev || {}),
        [sheetId]: { ...existing, name: String(name || existing.name || "Sheet").slice(0, 80) },
      };
    });
  };

  const appendRows = (sheetId, rows) => {
    if (!sheetId || !rows.length) return;
    if (ctx?.setSheetData) {
      ctx.setSheetData(sheetId, (prev) => [...(Array.isArray(prev) ? prev : []), ...rows]);
      return;
    }
    ctx?.setDataSheets?.((prev) => {
      const existing = prev?.[sheetId] || { name: "Sheet", data: [] };
      return {
        ...(prev || {}),
        [sheetId]: {
          ...existing,
          data: [...(Array.isArray(existing.data) ? existing.data : []), ...rows],
        },
      };
    });
  };

  const createSheet = (name, rows) => {
    let createdId = null;
    ctx?.setDataSheets?.((prev) => {
      const next = { ...(prev || {}) };
      createdId = allocateNextSheetId(next);
      next[createdId] = {
        name: String(name || `Sheet`).slice(0, 80),
        data: Array.isArray(rows) ? rows : [],
      };
      return next;
    });
    return createdId;
  };

  const prepareSheets = () => {
    if (prepared) return;
    prepared = true;
    const destination = resolveConnectHomeSheetDestination(ctx);

    if (destination.action === "new_sheet" && ctx?.addNewSheetAndActivate) {
      flushSync(() => {
        ctx.addNewSheetAndActivate(
          (newId) => {
            if (includeMeta) metadataSheetId = newId;
            else if (perEvent) firstEventSheetId = newId;
            else combinedMarketsSheetId = newId;
            ctx.setSheetData?.(newId, []);
            if (!perEvent && !includeMeta) applyConnectHomeSheetNameToSheet(ctx, newId);
          },
          { syncActivate: true },
        );
      });
    } else {
      const activeId = ctx?.activeSheetId || null;
      flushSync(() => {
        if (activeId) ctx?.setSheetData?.(activeId, []);
        else ctx?.replaceCurrentSheetData?.([]);
        if (includeMeta) metadataSheetId = activeId;
        else if (perEvent) firstEventSheetId = activeId;
        else combinedMarketsSheetId = activeId;
        if (!perEvent && !includeMeta && activeId) applyConnectHomeSheetNameToSheet(ctx, activeId);
      });
    }

    flushSync(() => {
      if (includeMeta && metadataSheetId) renameSheet(metadataSheetId, "Event metadata");
      if (includeMeta && !perEvent) {
        combinedMarketsSheetId = createSheet("Live volume", []);
      }
    });

    ctx?.setConnectHomeAnalyzeActive?.(true);
    ctx?.requestConnectAnalyzeScroll?.();
  };

  return {
    /**
     * @param {{
     *   sheetName?: string;
     *   metadataRow?: Record<string, unknown>;
     *   marketRows?: Record<string, unknown>[];
     * }} batch
     */
    write(batch) {
      const marketRows = Array.isArray(batch?.marketRows) ? batch.marketRows : [];
      const metadataRow = batch?.metadataRow && typeof batch.metadataRow === "object" ? batch.metadataRow : null;
      if (!marketRows.length && !metadataRow) return 0;
      prepareSheets();

      flushSync(() => {
        if (includeMeta && metadataSheetId && metadataRow) {
          appendRows(metadataSheetId, [metadataRow]);
        }

        if (perEvent) {
          if (writtenEvents === 0 && firstEventSheetId) {
            ctx?.setDataSheets?.((prev) => {
              const existing = prev?.[firstEventSheetId] || { name: "Sheet", data: [] };
              return {
                ...(prev || {}),
                [firstEventSheetId]: {
                  ...existing,
                  name: String(batch.sheetName || existing.name || "Event 1").slice(0, 80),
                  data: marketRows,
                },
              };
            });
          } else {
            createSheet(batch.sheetName || `Event ${writtenEvents + 1}`, marketRows);
          }
        } else {
          if (!combinedMarketsSheetId && firstEventSheetId) combinedMarketsSheetId = firstEventSheetId;
          if (combinedMarketsSheetId) {
            if (writtenEvents === 0 && !includeMeta) {
              ctx?.setDataSheets?.((prev) => {
                const existing = prev?.[combinedMarketsSheetId] || { name: "Sheet", data: [] };
                return {
                  ...(prev || {}),
                  [combinedMarketsSheetId]: {
                    ...existing,
                    data: marketRows,
                  },
                };
              });
            } else {
              appendRows(combinedMarketsSheetId, marketRows);
            }
          }
        }
      });

      writtenEvents += 1;
      return marketRows.length;
    },
  };
}

/**
 * Search-mode Go: resolve selected events, poll live volume, waterfall into sheets.
 *
 * @param {Record<string, unknown>} ctx
 * @param {import("@/lib/polymarketLive/polymarketPublicSearch").PolymarketPublicSearchSuggestion[]} suggestions
 * @param {{
 *   compose: import("@/lib/polymarketLive/liveEventVolumeCompose").PolymarketLiveEventVolumeComposeState;
 *   selectedColumns?: string[];
 * }} opts
 */
export async function applyPolymarketLiveEventVolumeSearchAll(ctx, suggestions, opts) {
  const refs = (suggestions || []).map((s) => eventRefFromPublicSearchSuggestion(s)).filter(Boolean);
  if (!refs.length) {
    throw new Error("Select at least one event.");
  }
  const compose = normalizePolymarketLiveEventVolumeComposeState({
    ...(opts.compose || {}),
    mode: "search",
    eventRefs: refs,
  });
  const waterfall = createPolymarketLiveEventVolumeWaterfallWriter(ctx, {
    sheetLayout: compose.sheetLayout,
  });
  const fetched = await fetchPolymarketLiveEventVolumeRows(compose, {
    selectedColumns: opts.selectedColumns,
    eventRefsOverride: refs,
    onEventRows: (batch) => {
      waterfall.write(batch);
      const completed = batch.index + 1;
      ctx?.setConnectDataLakePullState?.((prev) => ({
        ...prev,
        loading: true,
        error: null,
        label: `Pulled live volume for ${completed} of ${batch.total} events…`,
        progress: Math.max(
          Number(prev?.progress) || 0,
          Math.round(10 + (completed / Math.max(batch.total, 1)) * 85),
        ),
      }));
    },
  });
  if (!fetched.rows.length && !fetched.metadataRows.length) {
    throw new Error("No live volume found for the selected events.");
  }
  return fetched.rows.length;
}
