import ChartDashboard from "@/models/ChartDashboards";
import User from "@/models/Users";
import dbConnect from "@/lib/dbConnect";
import {
  getRunYourselfAnalysisById,
  resolveDashboardForkSource,
} from "@/config/runYourselfAnalyses";
import {
  defaultChartParameterValues,
  resolveDashboardChartSlot,
} from "@/config/runYourselfDashboardCharts";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const analysisId = String(req.query.analysisId || "").trim();
  const ownerHandle = String(req.query.ownerHandle || "").trim();
  const dashboardSlug = String(req.query.dashboardSlug || "").trim();

  const analysis = getRunYourselfAnalysisById(analysisId);
  if (!analysis) {
    return res.status(400).json({ success: false, message: "Unknown analysis" });
  }

  const forkSource = resolveDashboardForkSource(analysis, { ownerHandle, dashboardSlug });
  if (!forkSource.ownerHandle || !forkSource.dashboardSlug) {
    return res.status(400).json({ success: false, message: "Missing dashboard source" });
  }

  try {
    await dbConnect();
    const owner = await User.findOne({ user_name: forkSource.ownerHandle }).lean();
    if (!owner) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const dashboard = await ChartDashboard.findOne({
      user_id: owner._id,
      public_slug: forkSource.dashboardSlug,
      is_public: true,
    }).lean();

    if (!dashboard) {
      return res.status(404).json({ success: false, message: "Dashboard not found" });
    }

    /** @type {object[]} */
    const charts = [];
    const rows = Array.isArray(dashboard.layout?.rows) ? dashboard.layout.rows : [];
    for (const row of rows) {
      if (row?.type !== "cards" || !Array.isArray(row.columns)) continue;
      for (const col of row.columns) {
        if (!col?.chart_id) continue;
        const slot = resolveDashboardChartSlot(analysisId, col);
        const parameterMode = slot?.parameterMode || "none";
        charts.push({
          key: slot?.key || col.id,
          layoutColumnId: col.id,
          chartId: String(col.chart_id),
          title: col.h2 || col.caption || "Chart",
          caption: col.caption || "",
          parameterMode,
          hint: slot?.hint || "",
          defaults: defaultChartParameterValues(parameterMode),
        });
      }
    }

    return res.status(200).json({
      success: true,
      data: {
        analysisId,
        dashboardSlug: forkSource.dashboardSlug,
        ownerHandle: forkSource.ownerHandle,
        dashboardName: dashboard.dashboard_name || analysis.label,
        charts,
      },
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e?.message || "Failed to load dashboard manifest",
    });
  }
}
