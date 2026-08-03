import dbConnect from "@/lib/dbConnect";
import LiveFeed from "@/models/LiveFeeds";
import DataSet from "@/models/DataSets";
import { requireLoginSession } from "@/lib/resourceOwnership";
import { serializeLiveFeedDoc } from "@/lib/liveFeeds/managePersistedFeed";
import { liveFeedSheetIds } from "@/lib/liveFeeds/feedConfig";
import { createLiveFeedConfig } from "@/lib/liveFeeds/feedConfig";

/**
 * GET /api/live-feeds — list persisted (cron) live feeds for the signed-in user.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  try {
    const session = await requireLoginSession(req, res);
    if (!session) return;

    await dbConnect();

    const docs = await LiveFeed.find({ user_id: session.userId })
      .sort({ updated_at: -1 })
      .limit(100)
      .lean();

    const dataSetIds = [
      ...new Set(docs.map((d) => String(d.data_set_id || "")).filter(Boolean)),
    ];
    /** @type {Map<string, { name: string; sheetRowCounts: Record<string, number> }>} */
    const projectById = new Map();
    if (dataSetIds.length) {
      const sets = await DataSet.find({ _id: { $in: dataSetIds }, user_id: session.userId })
        .select("_id data_set_name data_sheets")
        .lean();
      for (const ds of sets) {
        const sheets = ds.data_sheets && typeof ds.data_sheets === "object" ? ds.data_sheets : {};
        /** @type {Record<string, number>} */
        const sheetRowCounts = {};
        for (const [sid, sheet] of Object.entries(sheets)) {
          const n = Array.isArray(sheet?.data)
            ? sheet.data.length
            : Math.floor(Number(sheet?.rowCount ?? sheet?.fullRowCount)) || 0;
          sheetRowCounts[sid] = n;
        }
        projectById.set(String(ds._id), {
          name: String(ds.data_set_name || "").trim() || "Untitled project",
          sheetRowCounts,
        });
      }
    }

    const feeds = docs.map((doc) => {
      const base = serializeLiveFeedDoc(doc);
      const project = projectById.get(String(doc.data_set_id));
      const cfg = createLiveFeedConfig({
        ...(doc.config && typeof doc.config === "object" ? doc.config : {}),
        id: doc.feed_id,
        integration: doc.integration,
        endpoint: doc.endpoint,
        status: "persisted",
        pollIntervalMs: doc.poll_interval_ms,
      });
      let sheetRows = 0;
      if (cfg && project?.sheetRowCounts) {
        for (const sid of liveFeedSheetIds(cfg)) {
          sheetRows += project.sheetRowCounts[sid] || 0;
        }
      }
      return {
        ...base,
        projectName: project?.name || null,
        sheetRowCount: sheetRows,
      };
    });

    const now = Date.now();
    const liveFeeds = feeds.filter((f) => f.status === "persisted");
    /** @type {number | null} */
    let newestSuccessMs = null;
    /** @type {number | null} */
    let newestPollMs = null;
    for (const f of liveFeeds) {
      const okMs = f.lastSuccessAt ? new Date(f.lastSuccessAt).getTime() : NaN;
      const pollMs = f.lastPolledAt ? new Date(f.lastPolledAt).getTime() : NaN;
      if (Number.isFinite(okMs) && (newestSuccessMs == null || okMs > newestSuccessMs)) {
        newestSuccessMs = okMs;
      }
      if (Number.isFinite(pollMs) && (newestPollMs == null || pollMs > newestPollMs)) {
        newestPollMs = pollMs;
      }
    }

    const dueSoon = liveFeeds.some((f) => {
      const interval = Math.floor(Number(f.pollIntervalMs)) || 60_000;
      const last = f.lastPolledAt ? new Date(f.lastPolledAt).getTime() : 0;
      if (!last) return true;
      return now - last >= interval - 5_000;
    });

    const recentlyActive =
      newestSuccessMs != null && now - newestSuccessMs < 3 * 60_000;

    const cron = {
      backendEnabled: true,
      schedule: "* * * * *",
      liveFeedCount: liveFeeds.length,
      status:
        liveFeeds.length === 0
          ? "idle"
          : recentlyActive
            ? "running"
            : dueSoon
              ? "due"
              : "waiting",
      lastSuccessAt:
        newestSuccessMs != null ? new Date(newestSuccessMs).toISOString() : null,
      lastPolledAt: newestPollMs != null ? new Date(newestPollMs).toISOString() : null,
      note:
        liveFeeds.length === 0
          ? "No active cron feeds. Save a live session to register one."
          : recentlyActive
            ? "Cron is polling your live feeds on the backend."
            : dueSoon
              ? "A feed is due — next Vercel cron minute should tick it."
              : "Feeds registered; waiting for the next poll window.",
    };

    return res.status(200).json({
      success: true,
      feeds,
      cron,
      counts: {
        total: feeds.length,
        live: feeds.filter((f) => f.status === "persisted").length,
        paused: feeds.filter((f) => f.status === "paused").length,
        ended: feeds.filter((f) => f.status === "ended").length,
      },
    });
  } catch (e) {
    console.error("[live-feeds] list failed:", e);
    return res.status(500).json({
      success: false,
      code: "connection_error",
      message: "Issue connecting to your data. Check your internet connection and try again.",
    });
  }
}
