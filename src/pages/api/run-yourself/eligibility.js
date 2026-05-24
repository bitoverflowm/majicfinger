import { getLoginSession } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/Users";
import { dbUserHasPaidAccess } from "@/lib/runYourself/serverPaidAccess";
import { resolvePublicRunSource } from "@/lib/runYourself/resolvePublicSource";
import {
  inferRunConfigForChart,
  inferRunConfigForDashboard,
  mergeRunConfig,
} from "@/lib/runYourself/inferRunYourselfConfig";
import { findAnalysisForSourceChart, findAnalysisForSourceDashboard } from "@/config/runYourselfAnalyses";

async function checkRunnable(ownerHandle, chartSlug, dashboardSlug, chartId) {
  try {
    if (chartId && dashboardSlug) {
      const resolved = await resolvePublicRunSource(ownerHandle, { dashboardSlug, chartId });
      const inferred = inferRunConfigForChart(
        resolved.dataSet.data_sheets || {},
        resolved.primaryChart,
      );
      return inferred.runnable;
    }
    if (dashboardSlug) {
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
      return mergeRunConfig(curated, inferred).runnable;
    }
    if (chartSlug) {
      const resolved = await resolvePublicRunSource(ownerHandle, { chartSlug });
      const curated = findAnalysisForSourceChart(ownerHandle, chartSlug);
      const inferred = inferRunConfigForChart(
        resolved.dataSet.data_sheets || {},
        resolved.primaryChart,
      );
      return mergeRunConfig(curated, inferred).runnable;
    }
    return false;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { ownerHandle, chartSlug, dashboardSlug, chartId } = req.query;
  const handle = String(ownerHandle || "").trim();
  const chart = String(chartSlug || "").trim();
  const dash = String(dashboardSlug || "").trim();
  const cId = String(chartId || "").trim();

  let runnable = false;
  if (handle && (chart || dash || cId)) {
    try {
      await dbConnect();
      runnable = await checkRunnable(handle, chart, dash, cId);
    } catch {
      runnable = false;
    }
  }

  let session = null;
  try {
    session = await getLoginSession(req);
  } catch {
    session = null;
  }

  if (!session?.userId) {
    return res.status(200).json({
      success: true,
      runnable,
      loggedIn: false,
      canFork: runnable,
      quotaExceeded: false,
      hasPaidAccess: false,
    });
  }

  try {
    await dbConnect();
    const user = await User.findById(session.userId).lean();
    const paid = dbUserHasPaidAccess(user);
    const quotaExceeded = !paid && !!user?.run_yourself_used_at;
    return res.status(200).json({
      success: true,
      runnable,
      loggedIn: true,
      canFork: runnable && !quotaExceeded,
      quotaExceeded,
      hasPaidAccess: paid,
      existingForkDataSetId: user?.run_yourself_fork_data_set_id
        ? String(user.run_yourself_fork_data_set_id)
        : null,
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
}
