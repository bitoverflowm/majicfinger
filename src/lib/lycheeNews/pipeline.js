/**
 * lychee_news X pipeline: news pulse item → formatted thread → dry-run payload.
 * Never posts unless deliver is explicitly asked AND live gates pass
 * (kill-switch off, X_NEWS_LIVE=1, warmup unlock for @lychee_news).
 */
import { getNewsPulseFeed, NEWS_PULSE_DEMO_ITEMS } from "@/lib/newsPulse";
import { formatNewsThread, formatNewsThreads } from "./format.js";
import { xNewsEnvStatus, xNewsLiveGate } from "./xClient.js";

/**
 * Build X thread payloads from the current pulse feed (or provided items).
 * Always dry-run unless opts.live === true AND gates allow — and even then
 * callers must invoke deliver separately; this function never creates tweets.
 *
 * @param {{
 *   items?: Array<Record<string, unknown>>,
 *   limit?: number,
 *   force?: boolean,
 *   live?: boolean,
 * }} [opts]
 */
export async function buildLycheeNewsXPreview({ items, limit = 8, force = false, live = false } = {}) {
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

  const drafts = formatNewsThreads(feedItems, { limit });
  const wantLive = live === true;
  // Hard rule: this module never flips to live posting. deliver.js is the only path,
  // and it re-checks gates. Preview always reports dry_run.
  const dry_run = true;

  return {
    as_of,
    demo,
    account: env.username,
    dry_run,
    live_requested: wantLive,
    live_allowed: gate.allowed,
    gate_reasons: gate.reasons,
    env: {
      kill_switch: env.kill_switch,
      live_flag: env.live_flag,
      allow_lychee_news: env.allow_lychee_news,
      can_post: env.can_post,
      oauth_ready: Boolean(env.app_key && env.app_secret && env.access_token && env.access_secret),
    },
    count: drafts.length,
    drafts,
    note: wantLive
      ? "Live requested but preview never posts. Use deliver only after warmup (LN-7): X_NEWS_KILL_SWITCH=0, X_NEWS_LIVE=1, X_NEWS_ALLOW_LYCHEE_NEWS=1."
      : "Dry-run preview. No create-tweet. @lychee_news live posting is gated until warmup ends (LN-7).",
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
