import dbConnect from "@/lib/dbConnect";
import Chart from "@/models/Charts";
import DataSet from "@/models/DataSets";
import User from "@/models/Users";
import { inferDefaultBuilderSnapshot } from "@/lib/inferDefaultBuilderSnapshot";

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
    const user = await User.findOne({ user_name: String(username || "").trim() }).lean();
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

    const dataSet = await DataSet.findById(chart.data_set_id).lean();
    if (!dataSet || !Array.isArray(dataSet.data)) {
      return res.status(404).json({ success: false, message: "Dataset not found" });
    }

    const cp = Array.isArray(chart.chart_properties) ? chart.chart_properties[0] : chart.chart_properties;
    const rechartsBuilder =
      cp && typeof cp === "object" && cp.rechartsBuilder && cp.rechartsBuilder.v === 1
        ? cp.rechartsBuilder
        : inferDefaultBuilderSnapshot(dataSet.data);

    const publicChart = {
      chart_name: chart.chart_name,
      chart_properties: cp && typeof cp === "object" ? [cp] : [],
      rechartsBuilder,
    };

    return res.status(200).json({
      success: true,
      data: {
        chart: publicChart,
        rows: stripInternalFromRows(dataSet.data),
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
}
