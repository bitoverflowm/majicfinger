import dbConnect from "@/lib/dbConnect";
import XJarvisJob from "@/models/XJarvisJobs";
import XJarvisCursor from "@/models/XJarvisCursor";
import { fetchLycheeMentions } from "./fetchMentions.js";
import { runXJarvisJob } from "./runJob.js";
import { postPublicReply } from "./deliver.js";
import { xJarvisEnvStatus } from "./xClient.js";

function botKey() {
  return String(process.env.X_JARVIS_USERNAME || "lychee_data").trim().replace(/^@/, "").toLowerCase();
}

/**
 * End-to-end tick: fetch new mentions → Jarvis draft → optional live reply.
 * @param {{ live?: boolean, max?: number, force_since_id?: string }} [opts]
 */
export async function runXJarvisCronTick({ live = false, max = 10, force_since_id = "" } = {}) {
  await dbConnect();
  const env = xJarvisEnvStatus();
  const username = botKey();
  const wantLive = live === true && env.live_flag === true;

  let cursor = await XJarvisCursor.findOne({ bot_username: username });
  if (!cursor) {
    cursor = await XJarvisCursor.create({ bot_username: username, since_id: "" });
  }

  const since_id = String(force_since_id || cursor.since_id || "").trim();
  let fetched;
  try {
    fetched = await fetchLycheeMentions({
      since_id,
      max_results: Math.min(50, Math.max(5, max * 2)),
    });
  } catch (err) {
    return {
      ok: false,
      error: err?.message || String(err),
      env,
      since_id: since_id || null,
    };
  }

  const results = [];
  let newest = since_id;

  for (const m of (fetched.mentions || []).slice(0, max)) {
    const tweetId = String(m.id || "").trim();
    if (!tweetId) continue;
    if (newest && BigInt(tweetId) > BigInt(newest)) newest = tweetId;
    if (!newest) newest = tweetId;

    const existing = await XJarvisJob.findOne({ tweet_id: tweetId });
    if (existing) {
      results.push({
        tweet_id: tweetId,
        status: "duplicate",
        job_id: String(existing._id),
        reply_tweet_id: existing.reply_tweet_id || null,
      });
      continue;
    }

    try {
      const packed = await runXJarvisJob({
        text: m.text || "",
        parent_text: m.parent_text || "",
        author_handle: m.author_handle || "",
        deliver_default: "public_reply",
        live: wantLive,
      });

      const job = await XJarvisJob.create({
        tweet_id: tweetId,
        author_id: String(m.author_id || ""),
        author_handle: String(m.author_handle || ""),
        text: String(m.text || "").slice(0, 2000),
        parent_text: String(m.parent_text || "").slice(0, 2000),
        intent: packed.intent,
        status: packed.status === "needs_clarification" ? "needs_clarification" : "draft_ready",
        draft_reply: packed.draft_reply || "",
        research: packed.research,
        deliver: "public_reply",
        dry_run: !wantLive,
      });

      let posted = null;
      if (wantLive && packed.draft_reply && packed.status !== "needs_clarification") {
        try {
          posted = await postPublicReply({
            in_reply_to_tweet_id: tweetId,
            text: packed.draft_reply,
          });
          job.status = "posted";
          job.reply_tweet_id = posted.reply_tweet_id;
          job.dry_run = false;
          await job.save();
        } catch (postErr) {
          job.error = postErr?.message || String(postErr);
          job.status = "error";
          await job.save();
          results.push({
            tweet_id: tweetId,
            status: "post_error",
            job_id: String(job._id),
            draft_reply: job.draft_reply,
            error: job.error,
          });
          continue;
        }
      }

      results.push({
        tweet_id: tweetId,
        status: job.status,
        job_id: String(job._id),
        draft_reply: job.draft_reply,
        intent_mode: packed.intent?.mode || null,
        reply_tweet_id: posted?.reply_tweet_id || null,
        reply_url: posted?.url || null,
        live: wantLive,
      });
    } catch (err) {
      await XJarvisJob.create({
        tweet_id: tweetId,
        text: String(m.text || "").slice(0, 2000),
        status: "error",
        error: err?.message || String(err),
        dry_run: true,
      }).catch(() => null);
      results.push({ tweet_id: tweetId, status: "error", error: err?.message || String(err) });
    }
  }

  if (fetched.newest_id && (!cursor.since_id || BigInt(fetched.newest_id) >= BigInt(cursor.since_id || "0"))) {
    cursor.since_id = String(fetched.newest_id);
  } else if (newest && (!cursor.since_id || BigInt(newest) > BigInt(cursor.since_id || "0"))) {
    cursor.since_id = newest;
  }
  cursor.last_tick_at = new Date();
  cursor.last_tick_summary = {
    fetched: fetched.count,
    processed: results.length,
    live: wantLive,
    newest_id: cursor.since_id,
  };
  await cursor.save();

  return {
    ok: true,
    live: wantLive,
    env: {
      can_read_mentions: env.can_read_mentions,
      can_post_replies: env.can_post_replies,
      live_flag: env.live_flag,
      username: env.username,
      user_id: fetched.user_id,
    },
    since_id_before: since_id || null,
    since_id_after: cursor.since_id || null,
    fetched: fetched.count,
    results,
    note: wantLive
      ? "Live replies enabled (X_JARVIS_LIVE=1)."
      : "Dry-run: drafts stored in XJarvisJobs. Set X_JARVIS_LIVE=1 and JARVIS_TWITTER_* OAuth to post.",
  };
}
