import dbConnect from "@/lib/dbConnect";
import Chart from "@/models/Charts";
import DataSet from "@/models/DataSets";
import User from "@/models/Users";
import { buildPublicChartBundle } from "@/lib/chartBundle";
import { hydrateDataSetForPublicChartViewer } from "@/lib/server/hydratePublicChartDataset";
import { publicPayloadFromPublishedBundle } from "@/lib/server/materializeChartBundle";

/**
 * Load public chart payload server-side (same shape as GET /api/public/charts/[username]/[slug]).
 * @param {string} username
 * @param {string} slug
 * @returns {Promise<{ chart: object; rows: unknown[]; dataSheets: object; owner_handle: string; owner_name: string | null; owner_profile_pic: string | null } | null>}
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

    const cached = publicPayloadFromPublishedBundle(chart);
    if (cached) {
      return {
        chart: cached.chart,
        rows: cached.rows,
        dataSheets: cached.dataSheets,
        owner_handle: user.user_name ? String(user.user_name) : u,
        owner_name: user.name ? String(user.name) : null,
        owner_profile_pic: user.profile_pic ? String(user.profile_pic) : null,
      };
    }

    const dataSetRaw = await DataSet.findById(chart.data_set_id).lean();
    if (!dataSetRaw) return null;

    const dataSet = await hydrateDataSetForPublicChartViewer(chart, dataSetRaw);
    const { chart: publicChart, rows, dataSheets } = buildPublicChartBundle(chart, dataSet);

    return {
      chart: publicChart,
      rows,
      dataSheets,
      owner_handle: user.user_name ? String(user.user_name) : u,
      owner_name: user.name ? String(user.name) : null,
      owner_profile_pic: user.profile_pic ? String(user.profile_pic) : null,
    };
  } catch (err) {
    console.error("[fetchPublicChartPayload]", u, s, err);
    return null;
  }
}
