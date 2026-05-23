import mongoose from "mongoose";
import { getLoginSession } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import Chart from "@/models/Charts";
import ChartDashboard from "@/models/ChartDashboards";
import DataSet from "@/models/DataSets";
import User from "@/models/Users";
import { getRunYourselfAnalysisById } from "@/config/runYourselfAnalyses";
import { getAthenaAccessForUserId } from "@/lib/athenaAccess";
import { buildProjectRevision } from "@/lib/projectPersistence";
import { collectSheetClosureForCharts, pickSheetsSubset } from "@/lib/runYourself/collectSheetClosure";
import { patchAllSheetProvenance } from "@/lib/runYourself/patchProvenanceParameter";
import { replayForkedProjectSheets } from "@/lib/runYourself/replayForkedProjectSheets";
import { resolvePublicRunSource } from "@/lib/runYourself/resolvePublicSource";
import { dbUserHasPaidAccess } from "@/lib/runYourself/serverPaidAccess";

function cloneJson(doc) {
  return JSON.parse(JSON.stringify(doc ?? null));
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  let session;
  try {
    session = await getLoginSession(req);
  } catch {
    return res.status(401).json({ success: false, message: "Login required" });
  }
  if (!session?.userId || !mongoose.Types.ObjectId.isValid(String(session.userId))) {
    return res.status(401).json({ success: false, message: "Login required" });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const source = body.source || {};
  const analysisId = String(body.analysisId || "").trim();
  const parameter = body.parameter || {};
  const replicateDashboard = !!body.replicateDashboard;

  const analysis = getRunYourselfAnalysisById(analysisId);
  if (!analysis) {
    return res.status(400).json({ success: false, message: "Unknown analysis" });
  }

  const paramValue = String(parameter.value || "").trim();
  if (!paramValue) {
    return res.status(400).json({ success: false, message: "Missing market or trade parameter" });
  }

  try {
    await dbConnect();
    const newUserId = new mongoose.Types.ObjectId(String(session.userId));
    const dbUser = await User.findById(newUserId);
    if (!dbUser) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    const paid = dbUserHasPaidAccess(dbUser);
    if (!paid && dbUser.run_yourself_used_at) {
      return res.status(403).json({
        success: false,
        code: "RUN_YOURSELF_QUOTA_EXCEEDED",
        message: "You have already used your free analysis run. Upgrade to Pro for unlimited runs.",
        dataSetId: dbUser.run_yourself_fork_data_set_id
          ? String(dbUser.run_yourself_fork_data_set_id)
          : null,
      });
    }

    const resolved = await resolvePublicRunSource(source.ownerHandle, {
      chartSlug: source.chartSlug,
      dashboardSlug: source.dashboardSlug,
      replicateDashboard,
    });

    const sourceDataSet = resolved.dataSet;
    const sourceCharts = resolved.charts;
    const primarySourceChart = resolved.primaryChart;

    const sheetOrder = collectSheetClosureForCharts(
      sourceDataSet.data_sheets || {},
      sourceCharts,
    );
    const subsetSheets = pickSheetsSubset(sourceDataSet.data_sheets || {}, sheetOrder);

    let patchedSheets = patchAllSheetProvenance(
      subsetSheets,
      paramValue,
      analysis.tickerFilterColumns || [],
    );

    const access = await getAthenaAccessForUserId(newUserId);
    patchedSheets = await replayForkedProjectSheets({
      dataSheets: patchedSheets,
      sheetOrder,
      access,
    });

    const firstSheetId = sheetOrder[0] || Object.keys(patchedSheets)[0] || "sheet-1";
    const legacyRows = Array.isArray(patchedSheets[firstSheetId]?.data)
      ? patchedSheets[firstSheetId].data
      : [];

    const projectName = `${analysis.label} — ${paramValue}`.slice(0, 100);

    const newDataSet = await DataSet.create({
      data_set_name: projectName,
      data: legacyRows,
      data_sheets: patchedSheets,
      created_date: new Date(),
      last_saved_date: new Date(),
      labels: ["project", "run-yourself"],
      source: "project",
      user_id: newUserId,
      forked_from_user_id: resolved.owner._id,
      forked_from_data_set_id: sourceDataSet._id,
      forked_from_chart_id: primarySourceChart?._id || null,
      forked_at: new Date(),
      run_yourself_analysis_id: analysisId,
      save_revision: buildProjectRevision({
        data_set_name: projectName,
        data_sheets: patchedSheets,
        labels: ["project", "run-yourself"],
        source: "project",
      }),
      save_meta: { saveMode: "full", savedAt: new Date().toISOString() },
    });

    /** @type {Map<string, string>} */
    const chartIdMap = new Map();
    const newChartIds = [];

    for (const srcChart of sourceCharts) {
      const cp = cloneJson(
        Array.isArray(srcChart.chart_properties) ? srcChart.chart_properties : [],
      );
      const created = await Chart.create({
        chart_name: srcChart.chart_name || analysis.label,
        chart_properties: cp,
        data_set_id: newDataSet._id,
        user_id: newUserId,
        is_public: false,
        labels: Array.isArray(srcChart.labels) ? srcChart.labels : [],
      });
      chartIdMap.set(String(srcChart._id), String(created._id));
      newChartIds.push(String(created._id));
    }

    let newDashboardId = null;
    if (replicateDashboard && resolved.dashboard) {
      const layout = cloneJson(resolved.dashboard.layout);
      const rows = Array.isArray(layout?.rows) ? layout.rows : [];
      for (const row of rows) {
        if (row?.type !== "cards" || !Array.isArray(row.columns)) continue;
        for (const col of row.columns) {
          if (col?.chart_id) {
            const mapped = chartIdMap.get(String(col.chart_id));
            if (mapped) col.chart_id = mapped;
          }
        }
      }
      const dash = await ChartDashboard.create({
        dashboard_name: resolved.dashboard.dashboard_name || projectName,
        page_heading: resolved.dashboard.page_heading || "",
        page_subheading: resolved.dashboard.page_subheading || "",
        layout,
        theme: cloneJson(resolved.dashboard.theme),
        user_id: newUserId,
        data_set_id: newDataSet._id,
        is_public: false,
        tags: Array.isArray(resolved.dashboard.tags) ? resolved.dashboard.tags : [],
      });
      newDashboardId = String(dash._id);
    }

    const primarySourceId = primarySourceChart?._id ? String(primarySourceChart._id) : null;
    const primaryChartId = primarySourceId
      ? chartIdMap.get(primarySourceId) || newChartIds[0]
      : newChartIds[0];

    if (!paid) {
      dbUser.run_yourself_used_at = new Date();
      dbUser.run_yourself_fork_data_set_id = newDataSet._id;
      await dbUser.save();
    }

    return res.status(200).json({
      success: true,
      data: {
        dataSetId: String(newDataSet._id),
        chartIds: newChartIds,
        primaryChartId,
        dashboardId: newDashboardId,
        runYourselfLocked: !paid,
      },
    });
  } catch (e) {
    const status = e.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: e.message || "Fork failed",
    });
  }
}
