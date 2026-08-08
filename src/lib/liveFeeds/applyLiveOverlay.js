/**
 * Client-safe live overlay for public chart embeds (any chart type).
 * Keep free of server-only Kalshi cache / incremental fetch imports.
 */

import { applyLiveCandleOverlay } from "@/lib/liveFeeds/applyLiveCandleOverlay";
import {
  sheetDataLooksLikeTrades,
  upsertTradeRowsByTradeId,
} from "@/lib/liveFeeds/merge/kalshiTradesUpsert";

/**
 * @param {object | null | undefined} basePayload
 * @param {{
 *   overlayKind?: string;
 *   sheets?: Record<string, Record<string, unknown>[]>;
 *   params?: { periodInterval?: number };
 * } | null | undefined} tick
 */
export function applyLiveOverlay(basePayload, tick) {
  if (!tick || !tick.sheets || typeof tick.sheets !== "object") return basePayload ?? null;
  const kind = tick.overlayKind || "sheet_rows";
  const periodInterval = Math.floor(Number(tick.params?.periodInterval)) || 1;

  /** @type {Record<string, Record<string, unknown>[]>} */
  let tickSheets = { ...tick.sheets };
  // If publish stamped the wrong sheet id into the seed but live_publish is correct (or
  // vice versa), remap a single-sheet tick onto the chart's candlestick sheet.
  const rb =
    basePayload?.chart?.rechartsBuilder?.v === 1
      ? basePayload.chart.rechartsBuilder
      : Array.isArray(basePayload?.chart?.chart_properties) &&
          basePayload.chart.chart_properties[0]?.rechartsBuilder?.v === 1
        ? basePayload.chart.chart_properties[0].rechartsBuilder
        : null;
  const candleId = String(rb?.candlestickSheetId || "").trim();
  if (candleId && !Array.isArray(tickSheets[candleId])) {
    const keys = Object.keys(tickSheets);
    if (keys.length === 1) {
      tickSheets = { [candleId]: tickSheets[keys[0]] };
    }
  }

  if (kind === "candlestick_ohlc") {
    let next = basePayload;
    for (const [sheetId, rows] of Object.entries(tickSheets)) {
      if (!Array.isArray(rows) || !rows.length) continue;
      next = applyLiveCandleOverlay(next, {
        sheetId,
        rows,
        periodInterval,
      });
    }
    return next;
  }

  // sheet_rows: trades by trade_id, candles by end_period_ts, else replace sheet data.
  if (!basePayload || typeof basePayload !== "object") return basePayload ?? null;
  const prevSheets =
    basePayload.dataSheets && typeof basePayload.dataSheets === "object"
      ? { ...basePayload.dataSheets }
      : {};
  let primaryRows = Array.isArray(basePayload.rows) ? [...basePayload.rows] : [];

  for (const [sheetId, rows] of Object.entries(tickSheets)) {
    if (!Array.isArray(rows)) continue;
    const sid = String(sheetId || "").trim();
    if (!sid) continue;
    const existingSheet =
      prevSheets[sid] && typeof prevSheets[sid] === "object" ? prevSheets[sid] : { name: sid };
    const existingData = Array.isArray(existingSheet.data) ? existingSheet.data : [];

    if (sheetDataLooksLikeTrades(rows) || sheetDataLooksLikeTrades(existingData)) {
      const merged = upsertTradeRowsByTradeId(existingData, rows);
      prevSheets[sid] = {
        ...existingSheet,
        data: merged,
        rowCount: merged.length,
        fullRowCount: merged.length,
      };
      if (!primaryRows.length || primaryRows === existingData) {
        primaryRows = merged;
      } else if (Array.isArray(basePayload.rows) && basePayload.rows === existingData) {
        primaryRows = merged;
      }
      continue;
    }

    const looksLikeCandles = rows.some((r) => r && r.end_period_ts != null);
    if (looksLikeCandles) {
      const mergedPayload = applyLiveCandleOverlay(
        {
          chart: {
            rechartsBuilder: {
              v: 1,
              selChartType: "candlestick",
              candlestickSheetId: sid,
            },
          },
          rows: [],
          dataSheets: prevSheets,
        },
        { sheetId: sid, rows, periodInterval },
      );
      const mergedSheet = mergedPayload?.dataSheets?.[sid];
      if (mergedSheet) {
        prevSheets[sid] = {
          ...existingSheet,
          ...mergedSheet,
        };
        if (!primaryRows.length && Array.isArray(mergedSheet.data)) {
          primaryRows = mergedSheet.data;
        }
      }
    } else {
      prevSheets[sid] = {
        ...existingSheet,
        data: rows,
        rowCount: rows.length,
        fullRowCount: rows.length,
      };
      if (!primaryRows.length) primaryRows = rows;
    }
  }

  return {
    ...basePayload,
    rows: primaryRows,
    dataSheets: prevSheets,
  };
}
