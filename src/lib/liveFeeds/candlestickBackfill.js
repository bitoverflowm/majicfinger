/**
 * Restart / gap backfill helpers for Kalshi event-candlestick live feeds.
 * Cutoff = max end_period_ts already on the feed's market sheets.
 */

import { normalizeLiveEndPeriodTs } from "@/lib/liveFeeds/merge/kalshiCandlestickUpsert";
import { periodIntervalSec } from "@/lib/liveFeeds/registry";

/**
 * Max end_period_ts (unix seconds) across rows on a single sheet.
 * @param {Record<string, unknown>[] | null | undefined} rows
 * @returns {number | null}
 */
export function maxEndPeriodTsInRows(rows) {
  let max = null;
  for (const row of Array.isArray(rows) ? rows : []) {
    const ts = normalizeLiveEndPeriodTs(row?.end_period_ts);
    if (ts == null) continue;
    if (max == null || ts > max) max = ts;
  }
  return max;
}

/**
 * Max end_period_ts across all market candlestick sheets mapped by the feed.
 * @param {Record<string, object> | null | undefined} dataSheets
 * @param {{ sheets?: { marketSheetIdsByTicker?: Record<string, string> } } | null | undefined} feed
 * @returns {number | null}
 */
export function maxEndPeriodTsForFeedSheets(dataSheets, feed) {
  const byTicker = feed?.sheets?.marketSheetIdsByTicker || {};
  const sheetIds = [...new Set(Object.values(byTicker).map((id) => String(id || "").trim()).filter(Boolean))];
  let max = null;
  for (const sheetId of sheetIds) {
    const sheet = dataSheets?.[sheetId];
    const sheetMax = maxEndPeriodTsInRows(sheet?.data);
    if (sheetMax == null) continue;
    if (max == null || sheetMax > max) max = sheetMax;
  }
  return max;
}

/**
 * Resolve start_ts for a gap backfill after stop / project exit / long pause.
 * Returns null when there is no sheet history — caller should use short lookback.
 *
 * Window is clamped to softRowCap periods so we never fetch more bars than the
 * working window can keep (oldest will be dropped on upsert).
 *
 * @param {{
 *   dataSheets?: Record<string, object> | null;
 *   feed: { params?: { periodInterval?: number }; periodInterval?: number; sheets?: object };
 *   endTs?: number;
 *   softRowCap?: number;
 *   overlapPeriods?: number;
 * }} opts
 * @returns {number | null} unix seconds start_ts, or null
 */
export function resolveCandlestickBackfillStartTs(opts) {
  const endTs =
    Number.isFinite(Number(opts.endTs)) && Number(opts.endTs) > 0
      ? Math.floor(Number(opts.endTs))
      : Math.floor(Date.now() / 1000);
  const softRowCap = Math.max(1, Math.floor(Number(opts.softRowCap)) || 50_000);
  const overlapPeriods = Math.max(0, Math.floor(Number(opts.overlapPeriods ?? 1)));
  const periodMinutes =
    Math.floor(Number(opts.feed?.params?.periodInterval ?? opts.feed?.periodInterval)) || 1;
  const periodSec = periodIntervalSec(periodMinutes);

  const cutoff = maxEndPeriodTsForFeedSheets(opts.dataSheets, opts.feed);
  if (cutoff == null) return null;

  let startTs = cutoff - overlapPeriods * periodSec;
  // Do not fetch further back than the working window can retain.
  const earliestKeepable = endTs - softRowCap * periodSec;
  startTs = Math.max(startTs, earliestKeepable);

  if (startTs >= endTs) return null;
  return startTs;
}
