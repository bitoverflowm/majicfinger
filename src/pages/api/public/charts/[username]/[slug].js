import dbConnect from "@/lib/dbConnect";
import Chart from "@/models/Charts";
import DataSet from "@/models/DataSets";
import User from "@/models/Users";
import { buildPublicChartBundle } from "@/lib/chartBundle";
import { hydrateDataSetForPublicChartViewer } from "@/lib/server/hydratePublicChartDataset";

export default async function handler(req, res) {
  const { username, slug } = req.query;

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    await dbConnect();
    const user = await User.findOne({ user_name: String(username || "").trim() })
      .select("user_name name profile_pic")
      .lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const chart = await Chart.findOne({
      user_id: user._id,
      public_slug: String(slug || "").trim(),
      is_public: true,
    }).lean();

    if (!chart) {
      return res.status(404).json({ success: false, message: "Chart not found" });
    }

    const dataSetRaw = await DataSet.findById(chart.data_set_id).lean();
    if (!dataSetRaw) {
      return res.status(404).json({ success: false, message: "Dataset not found" });
    }

    const dataSet = await hydrateDataSetForPublicChartViewer(chart, dataSetRaw);
    const { chart: publicChart, rows, dataSheets } = buildPublicChartBundle(chart, dataSet);

    return res.status(200).json({
      success: true,
      data: {
        chart: publicChart,
        rows,
        dataSheets,
        owner_handle: user.user_name ? String(user.user_name) : String(username || "").trim(),
        owner_name: user.name ? String(user.name) : null,
        owner_profile_pic: user.profile_pic ? String(user.profile_pic) : null,
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
}
