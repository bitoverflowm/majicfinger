import dbConnect from "@/lib/dbConnect";
import { requireLoginSession } from "@/lib/resourceOwnership";
import { managePersistedLiveFeed } from "@/lib/liveFeeds/managePersistedFeed";

const ACTIONS = new Set(["pause", "resume", "stop", "restart", "delete"]);

/**
 * POST /api/live-feeds/[feedId]
 * Body: { action: "pause" | "resume" | "stop" | "restart" | "delete" }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const session = await requireLoginSession(req, res);
    if (!session) return;

    await dbConnect();

    const feedId = String(req.query?.feedId || "").trim();
    const action = String(req.body?.action || "").trim().toLowerCase();
    if (!feedId) {
      return res.status(400).json({ success: false, message: "feedId is required" });
    }
    if (!ACTIONS.has(action)) {
      return res.status(400).json({
        success: false,
        message: `action must be one of: ${[...ACTIONS].join(", ")}`,
      });
    }

    const result = await managePersistedLiveFeed({
      feedId,
      userId: session.userId,
      action: /** @type {"pause"|"resume"|"stop"|"restart"|"delete"} */ (action),
    });

    if (!result.ok) {
      return res.status(result.status || 400).json({
        success: false,
        message: result.message || "Action failed",
      });
    }

    return res.status(200).json({
      success: true,
      action,
      feed: result.feed || null,
      deleted: !!result.deleted,
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e instanceof Error ? e.message : "Failed to manage live feed",
    });
  }
}
