import mongoose from "mongoose";
import { getLoginSession } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import Chart from "@/models/Charts";
import ChartDashboard from "@/models/ChartDashboards";
import DataSet from "@/models/DataSets";
import User from "@/models/Users";
import { findAnalysisForSourceDashboard, getRunYourselfAnalysisById } from "@/config/runYourselfAnalyses";
import {
  inferDashboardChartManifest,
  inferRunConfigForChart,
  inferRunConfigForDashboard,
  findDashboardLayoutColumn,
  mergeCuratedDashboardChartSlot,
  mergeRunConfig,
} from "@/lib/runYourself/inferRunYourselfConfig";
import { getAthenaAccessForUserId } from "@/lib/athenaAccess";
import { buildProjectRevision } from "@/lib/projectPersistence";
import { collectSheetClosureForCharts, pickSheetsSubset } from "@/lib/runYourself/collectSheetClosure";
import { patchAllSheetProvenance } from "@/lib/runYourself/patchProvenanceParameter";
import { patchDashboardSheetsByChartDynamic, patchSheetsForDashboardChart } from "@/lib/runYourself/patchDashboardChartSheets";
import { RUN_YOURSELF_ALL_CATEGORIES } from "@/config/runYourselfDashboardCharts";
import { replayForkedProjectSheets } from "@/lib/runYourself/replayForkedProjectSheets";
import { resolvePublicRunSource } from "@/lib/runYourself/resolvePublicSource";
import { dbUserHasPaidAccess } from "@/lib/runYourself/serverPaidAccess";

function cloneJson(doc) {
  return JSON.parse(JSON.stringify(doc ?? null));
}

/** Unique private slug so unpublished forks don't collide on user_id + public_slug index. */
function privateForkSlug(prefix) {
  return `${prefix}-${new mongoose.Types.ObjectId().toString()}`;
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
  const chartParameters = body.chartParameters && typeof body.chartParameters === "object" ? body.chartParameters : {};
  const replicateDashboard = !!body.replicateDashboard;

  const isDashboardChartFork =
    !replicateDashboard &&
    !!String(source.dashboardSlug || "").trim() &&
    !!String(source.chartId || "").trim();

  const paramValue = String(parameter.value || "").trim();
  const paramIsDashboardPlaceholder = paramValue === "dashboard";

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

    const dashboardAnalysis =
      source.dashboardSlug && source.ownerHandle
        ? findAnalysisForSourceDashboard(source.ownerHandle, source.dashboardSlug)
        : null;
    const curatedAnalysis = analysisId ? getRunYourselfAnalysisById(analysisId) : null;
    const shouldReplicateDashboard = replicateDashboard && !!source.dashboardSlug;

    const chartSlug =
      (!shouldReplicateDashboard && !isDashboardChartFork && source.chartSlug) || "";

    const resolved = await resolvePublicRunSource(source.ownerHandle, {
      chartSlug: shouldReplicateDashboard || isDashboardChartFork ? undefined : chartSlug,
      dashboardSlug:
        shouldReplicateDashboard || isDashboardChartFork ? source.dashboardSlug : undefined,
      chartId: isDashboardChartFork ? source.chartId : undefined,
      replicateDashboard: shouldReplicateDashboard,
    });

    const sourceDataSet = resolved.dataSet;
    const sourceCharts = resolved.charts;
    const primarySourceChart = resolved.primaryChart;

    const inferred = shouldReplicateDashboard
      ? inferRunConfigForDashboard(
          sourceDataSet.data_sheets || {},
          sourceCharts,
          resolved.dashboard,
          dashboardAnalysis?.id,
        )
      : (() => {
          const base = inferRunConfigForChart(sourceDataSet.data_sheets || {}, primarySourceChart);
          if (!isDashboardChartFork) return base;
          const layoutColumn = findDashboardLayoutColumn(resolved.dashboard?.layout, source.chartId);
          return mergeCuratedDashboardChartSlot(dashboardAnalysis, layoutColumn, base);
        })();
    const runConfig = mergeRunConfig(curatedAnalysis || dashboardAnalysis, inferred);

    if (!runConfig.runnable) {
      return res.status(400).json({
        success: false,
        message: runConfig.reason || "This chart cannot be run for yourself yet.",
      });
    }

    const isCategoryParam =
      parameter.mode === "category" ||
      runConfig.parameterMode === "category_optional" ||
      runConfig.parameterMode === "dual_category_optional";
    const patchKind = isCategoryParam ? "category" : "ticker";

    const needsParam =
      !shouldReplicateDashboard &&
      !isDashboardChartFork &&
      !paramIsDashboardPlaceholder &&
      runConfig.parameterMode !== "category_optional" &&
      runConfig.parameterMode !== "none";

    if (needsParam && !paramValue) {
      return res.status(400).json({ success: false, message: "Missing analysis parameter" });
    }

    const sheetOrder = collectSheetClosureForCharts(
      sourceDataSet.data_sheets || {},
      sourceCharts,
    );
    const subsetSheets = pickSheetsSubset(sourceDataSet.data_sheets || {}, sheetOrder);

    const dashboardManifest = inferDashboardChartManifest(
      sourceDataSet.data_sheets || {},
      sourceCharts,
      resolved.dashboard?.layout,
      dashboardAnalysis?.id || curatedAnalysis?.id,
    );

    let patchedSheets;
    if (shouldReplicateDashboard && resolved.dashboard) {
      patchedSheets = patchDashboardSheetsByChartDynamic(
        subsetSheets,
        sourceCharts,
        resolved.dashboard.layout,
        dashboardManifest,
        chartParameters,
      );
    } else if (isDashboardChartFork) {
      const layoutColumnKey = String(source.layoutColumnKey || "").trim();
      const slot =
        dashboardManifest.find(
          (c) => c.chartId === String(source.chartId) || c.key === layoutColumnKey,
        ) || dashboardManifest.find((c) => c.layoutColumnId === layoutColumnKey);
      const slotKey = slot?.key || layoutColumnKey;
      const params = chartParameters[slotKey] || chartParameters[layoutColumnKey] || {};
      const parameterMode = slot?.parameterMode || "category_optional";
      patchedSheets = patchSheetsForDashboardChart(
        subsetSheets,
        primarySourceChart,
        params,
        parameterMode,
      );
    } else if (
      runConfig.parameterMode === "category_optional" &&
      (paramValue === RUN_YOURSELF_ALL_CATEGORIES || !paramValue)
    ) {
      patchedSheets = subsetSheets;
    } else {
      patchedSheets = patchAllSheetProvenance(subsetSheets, paramValue, {
        patchKind,
        tickerColumns: runConfig.tickerFilterColumns || [],
        categoryColumns: runConfig.categoryFilterColumns || ["kalshi_taxonomy_category", "category"],
      });
    }

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

    const chartTitle = primarySourceChart?.chart_name || runConfig.label;
    const paramLabel =
      paramValue && paramValue !== RUN_YOURSELF_ALL_CATEGORIES ? paramValue : null;
    const projectName = shouldReplicateDashboard
      ? `${runConfig.label}`.slice(0, 100)
      : isDashboardChartFork
        ? `${chartTitle}`.slice(0, 100)
        : paramLabel
          ? `${runConfig.label} — ${paramLabel}`.slice(0, 100)
          : `${runConfig.label}`.slice(0, 100);

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
      forked_from_user_handle: resolved.owner.user_name || null,
      forked_from_data_set_id: sourceDataSet._id,
      forked_from_chart_id: primarySourceChart?._id || null,
      forked_at: new Date(),
      run_yourself_analysis_id: runConfig.id || analysisId || null,
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
        chart_name: srcChart.chart_name || runConfig.label,
        chart_properties: cp,
        data_set_id: newDataSet._id,
        user_id: newUserId,
        is_public: false,
        public_slug: privateForkSlug("fork-chart"),
        labels: Array.isArray(srcChart.labels) ? srcChart.labels : [],
      });
      chartIdMap.set(String(srcChart._id), String(created._id));
      newChartIds.push(String(created._id));
    }

    let newDashboardId = null;
    if (shouldReplicateDashboard && resolved.dashboard) {
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
        public_slug: privateForkSlug("fork-dash"),
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
