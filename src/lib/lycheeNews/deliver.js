/**
 * Live create-tweet path for @lychee_news threads.
 *
 * HARD RULES (LN-2 / warmup):
 * - Default path is dry-run; this module is the only place that may call the X API to post.
 * - Refuse unless kill-switch is OFF, X_NEWS_LIVE=1, OAuth present, and
 *   X_NEWS_ALLOW_LYCHEE_NEWS=1 when posting as @lychee_news.
 * - Until LN-7, callers should not invoke this; dry-run APIs never import post side-effects
 *   into the happy path beyond this gate.
 */
import { formatNewsThread } from "./format.js";
import { getNewsUserClient, xNewsEnvStatus, xNewsLiveGate } from "./xClient.js";

/**
 * @param {{ main: string, replies?: string[] }} thread
 * @returns {Promise<{ dry_run: true, posted: false, tweets: string[], reason: string } | { dry_run: false, posted: true, root_tweet_id: string, reply_ids: string[], urls: string[] }>}
 */
export async function postNewsThread(thread, { forceLive = false } = {}) {
  const main = String(thread?.main || "").trim();
  const replies = (thread?.replies || []).map((t) => String(t || "").trim()).filter(Boolean);
  if (!main) {
    const err = new Error("thread.main required");
    err.code = "X_NEWS_EMPTY";
    throw err;
  }

  const tweets = [main, ...replies];
  const gate = xNewsLiveGate();
  const env = xNewsEnvStatus();

  // Always refuse unless every live gate passes — no silent fallback to posting.
  if (!forceLive || !gate.allowed) {
    return {
      dry_run: true,
      posted: false,
      account: env.username,
      tweets,
      gate_reasons: gate.reasons,
      reason: gate.reasons[0] || "dry_run",
      note: "create-tweet not called. Live @lychee_news requires kill-switch off + X_NEWS_LIVE=1 + X_NEWS_ALLOW_LYCHEE_NEWS=1 after warmup.",
    };
  }

  const userClient = await getNewsUserClient();
  const client = userClient.readWrite;
  const root = await client.v2.tweet(main);
  const rootId = root?.data?.id ? String(root.data.id) : "";
  if (!rootId) throw new Error("X create-tweet returned no id for root");

  const reply_ids = [];
  let parent = rootId;
  for (const text of replies) {
    const res = await client.v2.reply(text, parent);
    const id = res?.data?.id ? String(res.data.id) : "";
    if (!id) throw new Error("X reply returned no id in news thread");
    reply_ids.push(id);
    parent = id;
  }

  return {
    dry_run: false,
    posted: true,
    account: env.username,
    root_tweet_id: rootId,
    reply_ids,
    urls: [rootId, ...reply_ids].map((id) => `https://x.com/i/status/${id}`),
  };
}

/** Convenience: format a pulse item then run the gated deliver path (still dry-run until LN-7). */
export async function deliverPulseItem(item, { forceLive = false } = {}) {
  const thread = formatNewsThread(item);
  if (thread.skipped && !thread.main) {
    return { dry_run: true, posted: false, skipped: true, reason: thread.reason, tweets: [] };
  }
  return postNewsThread(thread, { forceLive });
}
