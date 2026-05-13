import dbConnect from "@/lib/dbConnect";
import Chart from "@/models/Charts";
import DataSet from "@/models/DataSets";
import User from "@/models/Users";
import { inferDefaultBuilderSnapshot } from "@/lib/inferDefaultBuilderSnapshot";
import { normalizeBuilderSnapshot } from "@/lib/chartBundle";
import { hydrateDataSetForPublicChartViewer } from "@/lib/server/hydratePublicChartDataset";

function stripInternalFromRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    if (!row || typeof row !== "object") return row;
    const next = { ...row };
    return next;
  });
}

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

    const cp = Array.isArray(chart.chart_properties) ? chart.chart_properties[0] : chart.chart_properties;
    const dataSheets = dataSet?.data_sheets && typeof dataSet.data_sheets === "object"
      ? dataSet.data_sheets
      : {};
    const fallbackRowsFromSheets = Object.values(dataSheets || {}).find((s) => Array.isArray(s?.data) && s.data.length)?.data || [];
    const baseRows = Array.isArray(dataSet.data) ? dataSet.data : [];
    const rowsForFallback = baseRows.length ? baseRows : fallbackRowsFromSheets;
    const rechartsBuilderRaw =
      cp && typeof cp === "object" && cp.rechartsBuilder && cp.rechartsBuilder.v === 1
        ? cp.rechartsBuilder
        : inferDefaultBuilderSnapshot(rowsForFallback);
    const rechartsBuilder = normalizeBuilderSnapshot(rechartsBuilderRaw, rowsForFallback, dataSheets);

    const publicChart = {
      chart_name: chart.chart_name,
      chart_properties: cp && typeof cp === "object" ? [cp] : [],
      rechartsBuilder,
    };

    const rows = rowsForFallback;

    return res.status(200).json({
      success: true,
      data: {
        chart: publicChart,
        rows: stripInternalFromRows(rows),
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
