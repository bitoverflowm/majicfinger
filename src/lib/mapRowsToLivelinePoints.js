/**
 * Map sheet rows → Liveline `{ time: unixSec, value }` points.
 * Resolves sheet-scoped keys (`sheet-1::created_time`) the same way line charts do.
 */

import { temporalToMs } from "@/lib/temporalParse";

function parseScopedColumnKey(value, fallbackSheetId) {
  const raw = String(value || "");
  const splitIdx = raw.indexOf("::");
  if (splitIdx > 0) {
    return {
      raw,
      sheetId: raw.slice(0, splitIdx),
      column: raw.slice(splitIdx + 2),
      isScoped: true,
    };
  }
  return {
    raw,
    sheetId: fallbackSheetId || null,
    column: raw,
    isScoped: false,
  };
}

/**
 * Drops points without a real temporal X (never fall back to row index — that lands in 1970
 * and empties Liveline's wall-clock window).
 *
 * @param {unknown[]} rows
 * @param {string | null | undefined} xKey
 * @param {string | null | undefined} yKey
 * @param {string | null | undefined} [activeSheetId]
 * @returns {{ time: number, value: number }[]}
 */
export function mapRowsToLivelinePoints(rows, xKey, yKey, activeSheetId = null) {
  if (!Array.isArray(rows) || !rows.length || !xKey || !yKey) return [];
  const xParsed = parseScopedColumnKey(xKey, activeSheetId);
  const yParsed = parseScopedColumnKey(yKey, activeSheetId);
  /** @type {{ time: number, value: number }[]} */
  const points = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const rawT = row[xKey] ?? row[xParsed.column];
    const rawV = row[yKey] ?? row[yParsed.column];
    const ms = temporalToMs(rawT);
    if (!Number.isFinite(ms)) continue;
    const vNum = Number(rawV);
    if (!Number.isFinite(vNum)) continue;
    points.push({ time: ms / 1000, value: vNum });
  }
  points.sort((a, b) => a.time - b.time);
  return points;
}
