import dbConnect from "@/lib/dbConnect";
import ChartDashboard from "@/models/ChartDashboards";
import Chart from "@/models/Charts";
import DataSet from "@/models/DataSets";
import User from "@/models/Users";
import mongoose from "mongoose";
import { buildPublicChartBundle } from "@/lib/chartBundle";

function hydrateLayout(layout, chartBundlesById) {
  if (!layout || typeof layout !== "object") return { version: 1, rows: [] };
  const rows = Array.isArray(layout.rows) ? layout.rows : [];
  const nextRows = rows.map((row) => {
    if (!row || row.type !== "cards" || !Array.isArray(row.columns)) {
      return row;
    }
    const columns = row.columns.map((col) => {
      if (!col || !col.chart_id) {
        return { ...col, chartPayload: null, chartLink: null };
      }
      const id = String(col.chart_id);
      const bundle = chartBundlesById.get(id);
      const meta = bundle?.meta;
      return {
        ...col,
        chartPayload: bundle
          ? { chart: bundle.chart, rows: bundle.rows, dataSheets: bundle.dataSheets }
          : null,
        chartLink:
          meta?.is_public && meta?.public_slug
            ? { mode: "chart_public", slug: meta.public_slug }
            : null,
      };
    });
    return { ...row, columns };
  });
  return { ...layout, rows: nextRows };
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

    const dash = await ChartDashboard.findOne({
      user_id: user._id,
      public_slug: String(slug || "").trim(),
      is_public: true,
    }).lean();

    if (!dash) {
      return res.status(404).json({ success: false, message: "Dashboard not found" });
    }

    const chartIds = new Set();
    const rows = Array.isArray(dash.layout?.rows) ? dash.layout.rows : [];
    for (const row of rows) {
      if (!row || row.type !== "cards" || !Array.isArray(row.columns)) continue;
      for (const col of row.columns) {
        if (col?.chart_id && mongoose.Types.ObjectId.isValid(String(col.chart_id))) {
          chartIds.add(String(col.chart_id));
        }
      }
    }

    const chartBundlesById = new Map();
    for (const cid of chartIds) {
      const chart = await Chart.findOne({
        _id: cid,
        user_id: user._id,
      }).lean();
      if (!chart) continue;
      const dataSet = await DataSet.findById(chart.data_set_id).lean();
      if (!dataSet) continue;
      const bundle = buildPublicChartBundle(chart, dataSet);
      chartBundlesById.set(cid, {
        ...bundle,
        meta: {
          public_slug: chart.public_slug,
          is_public: !!chart.is_public,
        },
      });
    }

    const layoutOut = hydrateLayout(dash.layout, chartBundlesById);

    return res.status(200).json({
      success: true,
      data: {
        page_heading: dash.page_heading || "",
        dashboard_name: dash.dashboard_name || "",
        theme: dash.theme || {},
        layout: layoutOut,
        owner_handle: user.user_name,
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
}
