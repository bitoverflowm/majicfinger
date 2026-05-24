import dbConnect from "@/lib/dbConnect";
import {
  findAnalysisForSourceChart,
  findAnalysisForSourceDashboard,
} from "@/config/runYourselfAnalyses";
import {
  inferDashboardChartManifest,
  inferRunConfigForChart,
  inferRunConfigForDashboard,
  mergeRunConfig,
} from "@/lib/runYourself/inferRunYourselfConfig";
import { resolvePublicRunSource } from "@/lib/runYourself/resolvePublicSource";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const ownerHandle = String(req.query.ownerHandle || "").trim();
  const chartSlug = String(req.query.chartSlug || "").trim();
  const dashboardSlug = String(req.query.dashboardSlug || "").trim();
  const chartId = String(req.query.chartId || "").trim();
  const replicateDashboard =
    req.query.replicateDashboard === "1" || req.query.replicateDashboard === "true";

  if (!ownerHandle) {
    return res.status(400).json({ success: false, message: "Missing ownerHandle" });
  }

  try {
    await dbConnect();

    const curatedChart = chartSlug ? findAnalysisForSourceChart(ownerHandle, chartSlug) : null;
    const curatedDashboard = dashboardSlug ? findAnalysisForSourceDashboard(ownerHandle, dashboardSlug) : null;

    if (chartId && dashboardSlug && !replicateDashboard) {
      const resolved = await resolvePublicRunSource(ownerHandle, {
        dashboardSlug,
        chartId,
      });
      const inferred = inferRunConfigForChart(
        resolved.dataSet.data_sheets || {},
        resolved.primaryChart,
      );
      const config = mergeRunConfig(curatedDashboard || curatedChart, inferred);
      const manifest = inferDashboardChartManifest(
        resolved.dataSet.data_sheets || {},
        resolved.charts,
        resolved.dashboard?.layout,
      );
      const chartSlot = manifest.find((c) => c.chartId === chartId) || null;

      return res.status(200).json({
        success: true,
        data: {
          kind: "dashboard_chart",
          runnable: config.runnable,
          config,
          chartSlot,
          source: {
            ownerHandle,
            dashboardSlug,
            chartId,
            chartSlug: resolved.primaryChart?.public_slug || null,
          },
        },
      });
    }

    if (dashboardSlug) {
      const resolved = await resolvePublicRunSource(ownerHandle, {
        dashboardSlug,
        replicateDashboard: true,
      });
      const inferred = inferRunConfigForDashboard(
        resolved.dataSet.data_sheets || {},
        resolved.charts,
        resolved.dashboard,
      );
      const config = mergeRunConfig(curatedDashboard, inferred);
      const charts = inferDashboardChartManifest(
        resolved.dataSet.data_sheets || {},
        resolved.charts,
        resolved.dashboard?.layout,
      );

      return res.status(200).json({
        success: true,
        data: {
          kind: replicateDashboard ? "dashboard" : "dashboard",
          runnable: config.runnable,
          config,
          charts,
          source: { ownerHandle, dashboardSlug },
        },
      });
    }

    if (!chartSlug) {
      return res.status(400).json({ success: false, message: "Missing chartSlug or dashboardSlug" });
    }

    const resolved = await resolvePublicRunSource(ownerHandle, { chartSlug });
    const inferred = inferRunConfigForChart(
      resolved.dataSet.data_sheets || {},
      resolved.primaryChart,
    );
    const config = mergeRunConfig(curatedChart, inferred);

    return res.status(200).json({
      success: true,
      data: {
        kind: "chart",
        runnable: config.runnable,
        config,
        source: {
          ownerHandle,
          chartSlug,
          chartName: resolved.primaryChart?.chart_name || null,
        },
      },
    });
  } catch (e) {
    const status = e.statusCode || 500;
    return res.status(status).json({
      success: false,
      message: e?.message || "Failed to resolve run config",
      runnable: false,
    });
  }
}
