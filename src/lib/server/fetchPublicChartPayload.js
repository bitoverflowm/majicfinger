import dbConnect from "@/lib/dbConnect";
import Chart from "@/models/Charts";
import DataSet from "@/models/DataSets";
import User from "@/models/Users";
import { buildPublicChartBundle } from "@/lib/chartBundle";
import { hydrateDataSetForPublicChartViewer } from "@/lib/server/hydratePublicChartDataset";
import { publicPayloadFromPublishedBundle } from "@/lib/server/materializeChartBundle";
import {
  sanitizeChartLivePublish,
  seedPublicChartLivePayload,
} from "@/lib/liveFeeds/publicChartLivePublish";

/**
 * Load public chart payload server-side (same shape as GET /api/public/charts/[username]/[slug]).
 * @param {string} username
 * @param {string} slug
 */
export async function fetchPublicChartPayload(username, slug) {
  const u = String(username || "").trim();
  const s = String(slug || "").trim();
  if (!u || !s) return null;

  try {
    await dbConnect();
    const user = await User.findOne({ user_name: u })
      .select("user_name name profile_pic")
      .lean();
    if (!user) return null;

    const chart = await Chart.findOne({
      user_id: user._id,
      public_slug: s,
      is_public: true,
    }).lean();
    if (!chart) return null;

    const liveBacked = !!chart.live_backed;
    const livePublish = sanitizeChartLivePublish(chart.live_publish);
    const liveFlags = {
      live_backed: liveBacked,
      live_poll_interval_ms: liveBacked ? livePublish?.pollIntervalMs || null : null,
      live_overlay_kind: liveBacked ? livePublish?.overlayKind || null : null,
    };

    const cached = publicPayloadFromPublishedBundle(chart);
    if (cached) {
      const seeded = liveBacked ? seedPublicChartLivePayload(cached, chart.live_publish) : cached;
      return {
        chart: seeded.chart,
        rows: seeded.rows,
        dataSheets: seeded.dataSheets,
        owner_handle: user.user_name ? String(user.user_name) : u,
        owner_name: user.name ? String(user.name) : null,
        owner_profile_pic: user.profile_pic ? String(user.profile_pic) : null,
        ...liveFlags,
      };
    }

    const dataSetRaw = await DataSet.findById(chart.data_set_id).lean();
    if (!dataSetRaw) return null;

    const dataSet = await hydrateDataSetForPublicChartViewer(chart, dataSetRaw);
    const bundle = buildPublicChartBundle(chart, dataSet);
    const seeded = liveBacked ? seedPublicChartLivePayload(bundle, chart.live_publish) : bundle;

    return {
      chart: seeded.chart,
      rows: seeded.rows,
      dataSheets: seeded.dataSheets,
      owner_handle: user.user_name ? String(user.user_name) : u,
      owner_name: user.name ? String(user.name) : null,
      owner_profile_pic: user.profile_pic ? String(user.profile_pic) : null,
      ...liveFlags,
    };
  } catch (err) {
    console.error("[fetchPublicChartPayload]", u, s, err);
    return null;
  }
}
