import dbConnect from "@/lib/dbConnect";
import ChartDashboard from "@/models/ChartDashboards";
import { getLoginSession } from "@/lib/auth";
import mongoose from "mongoose";
import {
  collectChartIdsFromLayout,
  persistPublishedCardGridSnapshots,
  persistPublishedChartBundle,
} from "@/lib/server/rebuildDashboardPublishCache";

export const config = {
  maxDuration: 60,
};

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  if (!id || !mongoose.Types.ObjectId.isValid(String(id))) {
    return res.status(400).json({ success: false, message: "Invalid id" });
  }

  try {
    let session;
    try {
      session = await getLoginSession(req);
    } catch {
      session = null;
    }
    if (!session?.userId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    await dbConnect();
    const dash = await ChartDashboard.findById(id);
    if (!dash) {
      return res.status(404).json({ success: false, message: "Dashboard not found" });
    }
    if (String(dash.user_id) !== String(session.userId)) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    if (!dash.is_public) {
      return res.status(400).json({ success: false, message: "Dashboard is not public" });
    }

    const step = String(req.body?.step || "").trim();
    const chartId = req.body?.chartId ? String(req.body.chartId) : "";

    if (step === "card_grids") {
      const snapshots = await persistPublishedCardGridSnapshots(dash);
      dash.card_grid_snapshots = snapshots;
      await dash.save();
      return res.status(200).json({
        success: true,
        step,
        message: "Card grid previews saved",
      });
    }

    if (step === "chart") {
      const bundle = await persistPublishedChartBundle(dash, chartId);
      const key = String(chartId);
      const existing =
        dash.published_chart_bundles && typeof dash.published_chart_bundles === "object"
          ? { ...dash.published_chart_bundles }
          : {};
      existing[key] = bundle;
      dash.published_chart_bundles = existing;
      await dash.save();
      return res.status(200).json({
        success: true,
        step,
        chartId: key,
        message: "Chart preview saved",
      });
    }

    if (step === "complete") {
      dash.published_payload_built_at = new Date();
      await dash.save();
      const chartIds = [...collectChartIdsFromLayout(dash.layout)];
      return res.status(200).json({
        success: true,
        step,
        chartCount: chartIds.length,
        message: "Public dashboard cache ready",
      });
    }

    if (step === "plan") {
      const chartIds = [...collectChartIdsFromLayout(dash.layout)];
      return res.status(200).json({
        success: true,
        step,
        chartIds,
        chartCount: chartIds.length,
      });
    }

    return res.status(400).json({ success: false, message: "Unknown step" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
}
