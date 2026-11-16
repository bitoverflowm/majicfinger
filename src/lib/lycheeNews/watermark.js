/**
 * Live-post watermark: after enablement, only pulse items newer than the
 * watermark are eligible for X. /news keeps showing full history — this filter
 * is for the posting path only.
 *
 * Watermark sources (first wins):
 * 1. Explicit cursor.live_since_ms (persisted at go-live)
 * 2. Env X_NEWS_LIVE_SINCE (ISO-8601 or unix ms) — ops pin without DB
 * 3. Missing watermark → no live candidates (never dump backlog)
 */

/** Parse env / stored value into ms, or null. */
export function parseLiveSince(raw) {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return Math.floor(raw);
  const s = String(raw).trim();
  if (!s) return null;
  if (/^\d{10,13}$/.test(s)) {
    const n = Number(s);
    return n < 1e12 ? n * 1000 : n;
  }
  const parsed = Date.parse(s);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Effective watermark ms from cursor doc + env. */
export function resolveLiveWatermark(cursor = null) {
  const fromCursor = parseLiveSince(cursor?.live_since_ms ?? cursor?.live_since);
  if (fromCursor != null) return fromCursor;
  return parseLiveSince(process.env.X_NEWS_LIVE_SINCE);
}

/**
 * Items eligible for live X after enablement.
 * Requires a watermark; without one, returns [] (no historical dump).
 *
 * @param {Array<{ t?: number, id?: string }>} items
 * @param {{ live_since_ms?: number, last_posted_item_t?: number, last_posted_id?: string } | null} cursor
 */
export function filterLivePostCandidates(items, cursor = null) {
  const watermark = resolveLiveWatermark(cursor);
  if (watermark == null) {
    return {
      watermark_ms: null,
      eligible: [],
      skipped_history: (items || []).length,
      reason: "no_watermark",
      note: "No live_since watermark — refusing backlog dump. Set watermark at go-live (LN-7).",
    };
  }

  const lastT = parseLiveSince(cursor?.last_posted_item_t);
  const lastId = String(cursor?.last_posted_id || "").trim();
  const floor = lastT != null ? Math.max(watermark, lastT) : watermark;

  const eligible = [];
  let skipped_history = 0;
  for (const item of items || []) {
    const t = Number(item?.t);
    if (!Number.isFinite(t) || t <= floor) {
      skipped_history += 1;
      continue;
    }
    // Same-ms tie-break: skip the already-posted id if timestamps collide.
    if (lastT != null && t === lastT && lastId && String(item?.id || "") === lastId) {
      skipped_history += 1;
      continue;
    }
    eligible.push(item);
  }

  // Oldest-first for posting order (no surprise newest-first flood).
  eligible.sort((a, b) => Number(a.t) - Number(b.t));

  return {
    watermark_ms: watermark,
    floor_ms: floor,
    eligible,
    skipped_history,
    reason: null,
    note: "Only items with t > enablement watermark (and after last posted). /news history unchanged.",
  };
}

/** True if a single item may be live-posted under the watermark rules. */
export function isLivePostEligible(item, cursor = null) {
  const { eligible } = filterLivePostCandidates(item ? [item] : [], cursor);
  return eligible.length === 1;
}

/**
 * Snapshot to persist when live posting is first enabled.
 * Call once at LN-7 enablement — stamps "now" so existing /news rows are excluded.
 */
export function enablementWatermark(nowMs = Date.now()) {
  const live_since_ms = Math.floor(Number(nowMs));
  return {
    live_since_ms,
    live_since_iso: new Date(live_since_ms).toISOString(),
    last_posted_item_t: null,
    last_posted_id: null,
    note: "Stamped at go-live. Prior pulse items stay on /news only — not queued for X.",
  };
}
