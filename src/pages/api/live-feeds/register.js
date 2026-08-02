import dbConnect from "@/lib/dbConnect";
import DataSet from "@/models/DataSets";
import { requireLoginSession, assertDocumentOwner } from "@/lib/resourceOwnership";
import {
  upsertLiveFeedIndexDocs,
  markDashboardsLiveBacked,
} from "@/lib/liveFeeds/syncLiveFeedIndex";
import { createLiveFeedConfig } from "@/lib/liveFeeds/feedConfig";

/**
 * POST — register persisted live feeds for a DataSet after Save.
 * Body: { dataSetId, feeds: LiveFeedConfig[] }
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

    const dataSetId = String(req.body?.dataSetId || "").trim();
    if (!dataSetId) {
      return res.status(400).json({ success: false, message: "dataSetId is required" });
    }

    const dataSet = await DataSet.findById(dataSetId).select("_id user_id").lean();
    if (!assertDocumentOwner(dataSet, session, res)) return;

    const rawFeeds = Array.isArray(req.body?.feeds) ? req.body.feeds : [];
    /** @type {import("@/lib/liveFeeds/feedConfig").LiveFeedConfig[]} */
    const feeds = [];
    for (const raw of rawFeeds) {
      const cfg = createLiveFeedConfig({ ...raw, status: "persisted" });
      if (cfg) feeds.push(cfg);
    }

    const { upserted } = await upsertLiveFeedIndexDocs({
      userId: session.userId,
      dataSetId,
      feeds,
    });

    if (upserted > 0) {
      await markDashboardsLiveBacked({ dataSetId, liveBacked: true });
    }

    return res.status(200).json({ success: true, upserted, feedCount: feeds.length });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e instanceof Error ? e.message : "Failed to register live feeds",
    });
  }
}
