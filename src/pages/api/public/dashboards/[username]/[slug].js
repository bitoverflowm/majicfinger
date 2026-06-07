import dbConnect from "@/lib/dbConnect";
import ChartDashboard from "@/models/ChartDashboards";
import Chart from "@/models/Charts";
import DataSet from "@/models/DataSets";
import User from "@/models/Users";
import mongoose from "mongoose";
import { buildPublicChartBundle } from "@/lib/chartBundle";
import { hydrateDataSetForPublicChartViewer } from "@/lib/server/hydratePublicChartDataset";
import {
  attachCardGridSheetRows,
  hydrateCardGridSheetsForPublicDashboard,
} from "@/lib/server/hydrateDashboardCardGridSheets";
import { applyCardGridSnapshotsToSheets } from "@/lib/server/dashboardCardGridSnapshots";

function hydrateLayout(layout, chartBundlesById, dataSheets = {}) {
  if (!layout || typeof layout !== "object") return { version: 1, rows: [] };
  const withCardRows = attachCardGridSheetRows(layout, dataSheets);
  const rows = Array.isArray(withCardRows.rows) ? withCardRows.rows : [];
  const nextRows = rows.map((row) => {
    if (row?.type === "cardGrid") {
      return row;
    }
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
  return { ...withCardRows, rows: nextRows };
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

    let dataSheets = {};
    if (dash.data_set_id) {
      const dataSetRaw = await DataSet.findById(dash.data_set_id).lean();
      if (dataSetRaw) {
        const dataSet = await hydrateDataSetForPublicChartViewer(null, dataSetRaw);
        dataSheets =
          dataSet?.data_sheets && typeof dataSet.data_sheets === "object" ? dataSet.data_sheets : {};
        applyCardGridSnapshotsToSheets(dataSheets, dash.layout, dash.card_grid_snapshots);
        await hydrateCardGridSheetsForPublicDashboard(dataSheets, dash.layout, user._id);
      }
    }

    const chartBundlesById = new Map();
    for (const cid of chartIds) {
      const chart = await Chart.findOne({
        _id: cid,
        user_id: user._id,
      }).lean();
      if (!chart) continue;
      const dataSetRaw = await DataSet.findById(chart.data_set_id).lean();
      if (!dataSetRaw) continue;
      const dataSet = await hydrateDataSetForPublicChartViewer(chart, dataSetRaw);
      const bundle = buildPublicChartBundle(chart, dataSet);
      chartBundlesById.set(cid, {
        ...bundle,
        meta: {
          public_slug: chart.public_slug,
          is_public: !!chart.is_public,
        },
      });
    }

    const layoutOut = hydrateLayout(dash.layout, chartBundlesById, dataSheets);

    return res.status(200).json({
      success: true,
      data: {
        page_heading: dash.page_heading || "",
        page_subheading: dash.page_subheading || "",
        dashboard_name: dash.dashboard_name || "",
        theme: dash.theme || {},
        layout: layoutOut,
        owner_handle: user.user_name,
        owner_profile_pic: user.profile_pic ? String(user.profile_pic) : null,
        tags: Array.isArray(dash.tags)
          ? dash.tags.map((t) => String(t || "").trim()).filter(Boolean)
          : [],
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
}
