/**
 * Map sheet rows → Liveline `{ time: unixSec, value }` points.
 * Resolves sheet-scoped keys (`sheet-1::created_time`) the same way line charts do.
 */

import { temporalToMs } from "@/lib/temporalParse";

/** Soft cap so Liveline never tries to animate tens of thousands of points. */
export const LIVELINE_MAX_POINTS = 2_500;

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
 * Keep points inside the visible wall-clock window (+ buffer) and hard-cap count.
 * Passing the full sheet into Liveline freezes the UI on busy/closed markets.
 *
 * @param {{ time: number, value: number }[]} points
 * @param {{
 *   windowSecs?: number;
 *   nowSec?: number;
 *   maxPoints?: number;
 *   bufferSecs?: number;
 * }} [opts]
 * @returns {{ time: number, value: number }[]}
 */
export function clipLivelinePointsToWindow(points, opts = {}) {
  if (!Array.isArray(points) || !points.length) return [];
  const windowSecs = Math.max(30, Math.floor(Number(opts.windowSecs)) || 900);
  const bufferSecs = Math.max(0, Math.floor(Number(opts.bufferSecs)) || 30);
  const maxPoints = Math.max(10, Math.floor(Number(opts.maxPoints)) || LIVELINE_MAX_POINTS);
  const nowSec =
    Number.isFinite(Number(opts.nowSec)) && Number(opts.nowSec) > 0
      ? Number(opts.nowSec)
      : Date.now() / 1000;
  const cutoff = nowSec - windowSecs - bufferSecs;
  let clipped = points.filter((p) => Number.isFinite(p?.time) && p.time >= cutoff);
  if (!clipped.length) {
    // Market over / idle: keep a short tail so the chart can pause instead of blanking.
    clipped = points.slice(-Math.min(120, points.length));
  }
  if (clipped.length > maxPoints) clipped = clipped.slice(clipped.length - maxPoints);
  return clipped;
}

/**
 * Drops points without a real temporal X (never fall back to row index — that lands in 1970
 * and empties Liveline's wall-clock window).
 *
 * @param {unknown[]} rows
 * @param {string | null | undefined} xKey
 * @param {string | null | undefined} yKey
 * @param {string | null | undefined} [activeSheetId]
 * @param {{
 *   windowSecs?: number;
 *   nowSec?: number;
 *   maxPoints?: number;
 *   clip?: boolean;
 * }} [opts]
 * @returns {{ time: number, value: number }[]}
 */
export function mapRowsToLivelinePoints(rows, xKey, yKey, activeSheetId = null, opts = {}) {
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
  if (opts.clip === false) return points;
  return clipLivelinePointsToWindow(points, opts);
}
