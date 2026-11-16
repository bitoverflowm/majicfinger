/**
 * lychee_news X pipeline: news pulse item → formatted thread → dry-run payload.
 * Never posts unless deliver is explicitly asked AND live gates pass
 * (kill-switch off, X_NEWS_LIVE=1, warmup unlock for @lychee_news).
 *
 * Live candidates always respect the enablement watermark — no historical dump.
 */
import { getNewsPulseFeed, NEWS_PULSE_DEMO_ITEMS } from "@/lib/newsPulse";
import { formatNewsThread, formatNewsThreads } from "./format.js";
import { filterLivePostCandidates, resolveLiveWatermark } from "./watermark.js";
import { xNewsEnvStatus, xNewsLiveGate } from "./xClient.js";

/**
 * Build X thread payloads from the current pulse feed (or provided items).
 * Always dry-run — this function never creates tweets.
 *
 * @param {{
 *   items?: Array<Record<string, unknown>>,
 *   limit?: number,
 *   force?: boolean,
 *   live?: boolean,
 *   cursor?: { live_since_ms?: number, last_posted_item_t?: number, last_posted_id?: string } | null,
 * }} [opts]
 */
export async function buildLycheeNewsXPreview({
  items,
  limit = 8,
  force = false,
  live = false,
  cursor = null,
} = {}) {
  const env = xNewsEnvStatus();
  const gate = xNewsLiveGate();

  let feedItems = items;
  let demo = false;
  let as_of = new Date().toISOString();
  if (!feedItems) {
    const feed = await getNewsPulseFeed({ force });
    feedItems = feed.items || [];
    demo = Boolean(feed.demo);
    as_of = feed.as_of || as_of;
  }

  // Dry-run drafts: full pulse slice (formatting preview) — not a post queue.
  const drafts = formatNewsThreads(feedItems, { limit });
  // Live eligibility: watermarked subset only (empty until LN-7 stamps live_since).
  const liveSlice = filterLivePostCandidates(feedItems, cursor);
  const live_drafts = formatNewsThreads(liveSlice.eligible, { limit });
  const wantLive = live === true;

  return {
    as_of,
    demo,
    account: env.username,
    dry_run: true,
    live_requested: wantLive,
    live_allowed: gate.allowed,
    gate_reasons: gate.reasons,
    watermark: {
      live_since_ms: resolveLiveWatermark(cursor),
      floor_ms: liveSlice.floor_ms ?? null,
      skipped_history: liveSlice.skipped_history,
      reason: liveSlice.reason,
      note: liveSlice.note,
    },
    env: {
      kill_switch: env.kill_switch,
      live_flag: env.live_flag,
      allow_lychee_news: env.allow_lychee_news,
      can_post: env.can_post,
      oauth_ready: Boolean(env.app_key && env.app_secret && env.access_token && env.access_secret),
    },
    count: drafts.length,
    drafts,
    live_candidate_count: live_drafts.length,
    live_drafts,
    note: wantLive
      ? "Live requested but preview never posts. After warmup (LN-7): stamp live_since watermark, then only post items newer than enablement — no backlog dump."
      : "Dry-run preview. No create-tweet. Live path will use watermark so /news history is never queued to X.",
  };
}

/** Format a single pulse item into a dry-run draft (sync, no feed fetch). */
export function dryRunOnePulseItem(item) {
  const env = xNewsEnvStatus();
  const thread = formatNewsThread(item);
  return {
    account: env.username,
    dry_run: true,
    id: item?.id || null,
    headline: item?.headline || null,
    thread,
    tweets: thread.main ? [thread.main, ...thread.replies] : [],
    gate_reasons: xNewsLiveGate().reasons,
    note: "Dry-run only — create-tweet is not called.",
  };
}

/** Fixture helper for scripts/tests without network. */
export function dryRunDemoItems({ limit = 4 } = {}) {
  return formatNewsThreads(NEWS_PULSE_DEMO_ITEMS, { limit });
}
