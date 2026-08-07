/**
 * Client-safe live overlay for public chart embeds (any chart type).
 * Keep free of server-only Kalshi cache / incremental fetch imports.
 */

import { applyLiveCandleOverlay } from "@/lib/liveFeeds/applyLiveCandleOverlay";

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

  if (kind === "candlestick_ohlc") {
    let next = basePayload;
    for (const [sheetId, rows] of Object.entries(tick.sheets)) {
      if (!Array.isArray(rows) || !rows.length) continue;
      next = applyLiveCandleOverlay(next, {
        sheetId,
        rows,
        periodInterval,
      });
    }
    return next;
  }

  // sheet_rows: upsert candle-shaped rows by end_period_ts, else replace sheet data.
  if (!basePayload || typeof basePayload !== "object") return basePayload ?? null;
  const prevSheets =
    basePayload.dataSheets && typeof basePayload.dataSheets === "object"
      ? { ...basePayload.dataSheets }
      : {};
  let primaryRows = Array.isArray(basePayload.rows) ? [...basePayload.rows] : [];

  for (const [sheetId, rows] of Object.entries(tick.sheets)) {
    if (!Array.isArray(rows)) continue;
    const sid = String(sheetId || "").trim();
    if (!sid) continue;
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
          ...(prevSheets[sid] && typeof prevSheets[sid] === "object"
            ? prevSheets[sid]
            : { name: sid }),
          ...mergedSheet,
        };
        if (!primaryRows.length && Array.isArray(mergedSheet.data)) {
          primaryRows = mergedSheet.data;
        }
      }
    } else {
      prevSheets[sid] = {
        ...(prevSheets[sid] && typeof prevSheets[sid] === "object"
          ? prevSheets[sid]
          : { name: sid }),
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
