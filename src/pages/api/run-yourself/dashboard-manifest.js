import ChartDashboard from "@/models/ChartDashboards";
import User from "@/models/Users";
import dbConnect from "@/lib/dbConnect";
import { findAnalysisForSourceDashboard } from "@/config/runYourselfAnalyses";
import { defaultChartParameterValues } from "@/config/runYourselfDashboardCharts";
import {
  inferDashboardChartManifest,
  inferRunConfigForDashboard,
  mergeRunConfig,
} from "@/lib/runYourself/inferRunYourselfConfig";
import { resolvePublicRunSource } from "@/lib/runYourself/resolvePublicSource";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const analysisId = String(req.query.analysisId || "").trim();
  const ownerHandle = String(req.query.ownerHandle || "").trim();
  const dashboardSlug = String(req.query.dashboardSlug || "").trim();

  if (!ownerHandle || !dashboardSlug) {
    return res.status(400).json({ success: false, message: "Missing dashboard source" });
  }

  try {
    await dbConnect();
    const owner = await User.findOne({ user_name: ownerHandle }).lean();
    if (!owner) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const resolved = await resolvePublicRunSource(ownerHandle, {
      dashboardSlug,
      replicateDashboard: true,
    });

    const curated = findAnalysisForSourceDashboard(ownerHandle, dashboardSlug);
    const inferred = inferRunConfigForDashboard(
      resolved.dataSet.data_sheets || {},
      resolved.charts,
      resolved.dashboard,
    );
    const config = mergeRunConfig(curated, inferred);

    const charts = inferDashboardChartManifest(
      resolved.dataSet.data_sheets || {},
      resolved.charts,
      resolved.dashboard?.layout,
    ).map((c) => ({
      ...c,
      defaults: c.defaults || defaultChartParameterValues(c.parameterMode),
    }));

    return res.status(200).json({
      success: true,
      data: {
        analysisId: config.id || analysisId || inferred.id,
        dashboardSlug,
        ownerHandle,
        dashboardName: resolved.dashboard?.dashboard_name || config.label,
        runnable: config.runnable,
        config,
        charts,
      },
    });
  } catch (e) {
    return res.status(e.statusCode || 500).json({
      success: false,
      message: e?.message || "Failed to load dashboard manifest",
    });
  }
}
