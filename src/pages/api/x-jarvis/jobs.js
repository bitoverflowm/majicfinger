import dbConnect from "@/lib/dbConnect";
import XJarvisJob from "@/models/XJarvisJobs";
import XJarvisCursor from "@/models/XJarvisCursor";
import { xJarvisEnvStatus } from "@/lib/mcp/xJarvis/xClient";

/**
 * Inspect recent Jarvis mention jobs (drafts + posts).
 * Auth: Bearer ${X_JARVIS_CRON_SECRET} or ${CRON_SECRET}
 */
export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ success: false, message: "GET only" });

  const secret =
    String(process.env.X_JARVIS_CRON_SECRET || "").trim() ||
    String(process.env.CRON_SECRET || "").trim();
  const auth = String(req.headers.authorization || "");
  if (!secret || auth !== `Bearer ${secret}`) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  await dbConnect();
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const jobs = await XJarvisJob.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  const username = String(process.env.X_JARVIS_USERNAME || "lychee_data").trim().replace(/^@/, "");
  const cursor = await XJarvisCursor.findOne({ bot_username: username.toLowerCase() }).lean();

  return res.status(200).json({
    success: true,
    data: {
      env: xJarvisEnvStatus(),
      cursor: cursor
        ? {
            since_id: cursor.since_id,
            last_tick_at: cursor.last_tick_at,
            last_tick_summary: cursor.last_tick_summary,
          }
        : null,
      jobs: jobs.map((j) => ({
        id: String(j._id),
        tweet_id: j.tweet_id,
        author_handle: j.author_handle,
        text: j.text,
        status: j.status,
        intent_mode: j.intent?.mode || null,
        draft_reply: j.draft_reply,
        reply_tweet_id: j.reply_tweet_id || null,
        reply_url: j.reply_tweet_id ? `https://x.com/i/status/${j.reply_tweet_id}` : null,
        dry_run: j.dry_run,
        error: j.error || null,
        createdAt: j.createdAt,
      })),
    },
  });
}
