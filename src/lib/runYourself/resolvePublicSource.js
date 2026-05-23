import Chart from "@/models/Charts";
import ChartDashboard from "@/models/ChartDashboards";
import DataSet from "@/models/DataSets";
import User from "@/models/Users";

/**
 * @param {string} ownerHandle
 * @param {{ chartSlug?: string; dashboardSlug?: string; replicateDashboard?: boolean }} source
 */
export async function resolvePublicRunSource(ownerHandle, source) {
  const handle = String(ownerHandle || "").trim();
  const owner = await User.findOne({ user_name: handle }).lean();
  if (!owner) {
    const err = new Error("User not found");
    err.statusCode = 404;
    throw err;
  }

  if (source.dashboardSlug && source.replicateDashboard) {
    const dashboard = await ChartDashboard.findOne({
      user_id: owner._id,
      public_slug: String(source.dashboardSlug).trim(),
      is_public: true,
    }).lean();
    if (!dashboard) {
      const err = new Error("Dashboard not found");
      err.statusCode = 404;
      throw err;
    }
    const chartIds = [];
    const rows = Array.isArray(dashboard.layout?.rows) ? dashboard.layout.rows : [];
    for (const row of rows) {
      if (row?.type !== "cards" || !Array.isArray(row.columns)) continue;
      for (const col of row.columns) {
        if (col?.chart_id) chartIds.push(String(col.chart_id));
      }
    }
    const charts = await Chart.find({
      _id: { $in: chartIds },
      user_id: owner._id,
    }).lean();
    if (!charts.length) {
      const err = new Error("No charts found for this dashboard");
      err.statusCode = 404;
      throw err;
    }
    const dataSetIds = [...new Set(charts.map((c) => String(c.data_set_id)).filter(Boolean))];
    if (dataSetIds.length !== 1) {
      const err = new Error("Dashboard charts must share one project");
      err.statusCode = 400;
      throw err;
    }
    const dataSet = await DataSet.findById(dataSetIds[0]).lean();
    return {
      owner,
      charts,
      primaryChart: charts[0] || null,
      dataSet,
      dashboard,
    };
  }

  const slug = String(source.chartSlug || "").trim();
  const chart = await Chart.findOne({
    user_id: owner._id,
    public_slug: slug,
    is_public: true,
  }).lean();
  if (!chart) {
    const err = new Error("Chart not found");
    err.statusCode = 404;
    throw err;
  }
  const dataSet = await DataSet.findById(chart.data_set_id).lean();
  if (!dataSet) {
    const err = new Error("Project not found");
    err.statusCode = 404;
    throw err;
  }
  return { owner, charts: [chart], primaryChart: chart, dataSet, dashboard: null };
}
