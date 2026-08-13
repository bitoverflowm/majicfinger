/**
 * Apply Get markets by event(s) rows to Connect home sheet(s).
 */

import { flushSync } from "react-dom";

import {
  applyConnectHomePullData,
  prepareConnectHomePullSheet,
} from "@/lib/connectHomePullDestination";
import {
  extractMarketsFromEventsPayload,
  normalizePolymarketMarketsByEventsSheetLayout,
  POLYMARKET_MARKETS_BY_EVENTS_SHEET_LAYOUT_PER_EVENT,
} from "@/lib/polymarketLive/marketsByEventsCompose";
import {
  flattenPolymarketPublicSearchSuggestionsToRows,
  flattenPolymarketPublicSearchToRows,
} from "@/lib/polymarketLive/polymarketPublicSearch";

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
 * @param {Record<string, unknown>} ctx
 * @param {ReturnType<typeof extractMarketsFromEventsPayload>} extracted
 * @returns {number} total market rows written
 */
export function applyPolymarketMarketsByEventsExtracted(ctx, extracted) {
  const sheetLayout = normalizePolymarketMarketsByEventsSheetLayout(extracted?.sheetLayout);
  const byEvent = Array.isArray(extracted?.byEvent) ? extracted.byEvent : [];
  const allRows = Array.isArray(extracted?.allRows) ? extracted.allRows : [];

  if (
    sheetLayout === POLYMARKET_MARKETS_BY_EVENTS_SHEET_LAYOUT_PER_EVENT &&
    byEvent.length > 1 &&
    ctx?.setDataSheets
  ) {
    prepareConnectHomePullSheet(ctx);
    let firstSheetId = ctx?.activeSheetId || null;
    flushSync(() => {
      ctx.setDataSheets((prev) => {
        let next = { ...(prev || {}) };
        /** @type {string[]} */
        const writtenIds = [];
        for (let i = 0; i < byEvent.length; i++) {
          const group = byEvent[i];
          const rows = Array.isArray(group.rows) ? group.rows : [];
          let targetSheetId;
          if (i === 0 && firstSheetId && next[firstSheetId]) {
            targetSheetId = firstSheetId;
          } else {
            targetSheetId = allocateNextSheetId(next);
          }
          writtenIds.push(targetSheetId);
          const existing = next[targetSheetId] || { name: `Sheet`, data: [] };
          next = {
            ...next,
            [targetSheetId]: {
              ...existing,
              name: String(group.sheetName || existing.name || `Event ${i + 1}`).slice(0, 80),
              data: rows,
            },
          };
        }
        firstSheetId = writtenIds[0] || firstSheetId;
        return next;
      });
      if (firstSheetId && ctx?.setActiveSheetId) {
        ctx.setActiveSheetId(firstSheetId);
      }
      ctx?.setConnectHomeAnalyzeActive?.(true);
    });
    ctx?.requestConnectAnalyzeScroll?.();
    return byEvent.reduce((sum, g) => sum + (Array.isArray(g.rows) ? g.rows.length : 0), 0);
  }

  if (!allRows.length) return 0;
  prepareConnectHomePullSheet(ctx);
  flushSync(() => {
    applyConnectHomePullData(ctx, allRows);
    ctx?.setConnectHomeAnalyzeActive?.(true);
  });
  ctx?.requestConnectAnalyzeScroll?.();
  return allRows.length;
}

/**
 * @param {Record<string, unknown>} ctx
 * @param {unknown} eventsPayload
 * @param {{
 *   sheetLayout?: string;
 *   selectedColumns?: string[];
 * }} opts
 */
export function applyPolymarketMarketsByEventsFromEventsPayload(ctx, eventsPayload, opts = {}) {
  const extracted = extractMarketsFromEventsPayload(eventsPayload, opts);
  return applyPolymarketMarketsByEventsExtracted(ctx, extracted);
}

/**
 * Search hit → markets rows (public-search already expands event markets).
 * For sheet-per-event with multiple suggestions, group by parent event.
 *
 * @param {Record<string, unknown>} ctx
 * @param {import("@/lib/polymarketLive/polymarketPublicSearch").PolymarketPublicSearchSuggestion} suggestion
 * @param {{ sheetLayout?: string; selectedColumns?: string[] }} [opts]
 */
export function applyPolymarketMarketsByEventsSearchSelection(ctx, suggestion, opts = {}) {
  if (!suggestion) return;
  // Prefer nested markets from raw event when available.
  if (suggestion.entity === "event" && suggestion.raw && typeof suggestion.raw === "object") {
    applyPolymarketMarketsByEventsFromEventsPayload(ctx, [suggestion.raw], opts);
    return;
  }
  const rows = flattenPolymarketPublicSearchToRows(suggestion).filter(
    (r) => String(r?.entity || "") === "market" || r?.conditionId || r?.question,
  );
  if (!rows.length) return;
  prepareConnectHomePullSheet(ctx);
  flushSync(() => {
    applyConnectHomePullData(ctx, rows);
    ctx?.setConnectHomeAnalyzeActive?.(true);
  });
  ctx?.requestConnectAnalyzeScroll?.();
}

/**
 * @param {Record<string, unknown>} ctx
 * @param {import("@/lib/polymarketLive/polymarketPublicSearch").PolymarketPublicSearchSuggestion[]} suggestions
 * @param {{ sheetLayout?: string; selectedColumns?: string[] }} [opts]
 */
export function applyPolymarketMarketsByEventsSearchAll(ctx, suggestions, opts = {}) {
  const list = Array.isArray(suggestions) ? suggestions : [];
  const eventRaws = list
    .filter((s) => s?.entity === "event" && s.raw && typeof s.raw === "object")
    .map((s) => s.raw);
  if (eventRaws.length) {
    applyPolymarketMarketsByEventsFromEventsPayload(ctx, eventRaws, opts);
    return;
  }
  const rows = flattenPolymarketPublicSearchSuggestionsToRows(list).filter(
    (r) => String(r?.entity || "") === "market" || r?.conditionId || r?.question,
  );
  if (!rows.length) return;
  prepareConnectHomePullSheet(ctx);
  flushSync(() => {
    applyConnectHomePullData(ctx, rows);
    ctx?.setConnectHomeAnalyzeActive?.(true);
  });
  ctx?.requestConnectAnalyzeScroll?.();
}
