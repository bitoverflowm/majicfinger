import dbConnect from "@/lib/dbConnect";
import XJarvisJob from "@/models/XJarvisJobs";
import { runXJarvisJob } from "@/lib/mcp/xJarvis/runJob";

/**
 * Cron/worker entry: process mention payloads.
 * Auth: Authorization: Bearer ${X_JARVIS_CRON_SECRET}
 *
 * Body: { mentions: [{ id, text, author_id, author_handle, parent_text? }], live?: false }
 * Default is dry-run (store drafts, do not post). Set live:true AND X_JARVIS_LIVE=1 to post later.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, message: "POST only" });

  const secret = String(process.env.X_JARVIS_CRON_SECRET || "").trim();
  const auth = String(req.headers.authorization || "");
  if (!secret || auth !== `Bearer ${secret}`) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const mentions = Array.isArray(req.body?.mentions) ? req.body.mentions : [];
  if (!mentions.length) {
    return res.status(400).json({ success: false, message: "mentions[] required" });
  }

  const wantLive = req.body?.live === true && process.env.X_JARVIS_LIVE === "1";
  await dbConnect();
  const results = [];

  for (const m of mentions.slice(0, 20)) {
    const tweetId = String(m.id || m.tweet_id || "").trim();
    if (!tweetId) continue;
    const existing = await XJarvisJob.findOne({ tweet_id: tweetId }).lean();
    if (existing) {
      results.push({ tweet_id: tweetId, status: "duplicate", job_id: String(existing._id) });
      continue;
    }

    try {
      const packed = await runXJarvisJob({
        text: m.text || "",
        parent_text: m.parent_text || "",
        author_handle: m.author_handle || "",
        deliver_default: m.deliver || "public_reply",
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
        deliver: packed.intent?.deliver || "public_reply",
        dry_run: !wantLive,
      });

      // Live posting intentionally not wired yet — requires @lychee_data app credentials + create_posts.
      results.push({
        tweet_id: tweetId,
        status: job.status,
        job_id: String(job._id),
        draft_reply: job.draft_reply,
        live_posted: false,
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

  return res.status(200).json({
    success: true,
    data: {
      processed: results.length,
      live_enabled: wantLive,
      results,
      next: wantLive
        ? "Wire X create_posts deliverer when ready"
        : "Review drafts; enable X_JARVIS_LIVE=1 + deliverer for public replies",
    },
  });
}
