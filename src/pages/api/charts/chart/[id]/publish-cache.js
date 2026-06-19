/**
 * POST /api/charts/chart/[id]/publish-cache
 * Build and persist published_bundle for fast public embed loads.
 */
import dbConnect from "@/lib/dbConnect";
import Chart from "@/models/Charts";
import DataSet from "@/models/DataSets";
import { assertDocumentOwner, requireLoginSession } from "@/lib/resourceOwnership";
import { materializeChartBundle } from "@/lib/server/materializeChartBundle";
import { MATERIALIZATION_MODE_LIVE_LAKE } from "@/lib/publishedChartBundleConfig";
import mongoose from "mongoose";

export const config = {
  maxDuration: 120,
};

export default async function handler(req, res) {
  const { id } = req.query;

  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  if (!id || !mongoose.Types.ObjectId.isValid(String(id))) {
    return res.status(400).json({ success: false, message: "Invalid chart id" });
  }

  try {
    const session = await requireLoginSession(req, res);
    if (!session) return;

    await dbConnect();
    const chart = await Chart.findById(id);
    if (!assertDocumentOwner(chart, session, res)) return;

    const step = String(req.body?.step || "materialize").trim();

    if (step === "plan") {
      const dataSetRaw = chart.data_set_id ? await DataSet.findById(chart.data_set_id).lean() : null;
      return res.status(200).json({
        success: true,
        step,
        hasDataSet: !!dataSetRaw,
        isPublic: !!chart.is_public,
        hasExistingBundle: !!chart.published_bundle?.chart,
        existingMode: chart.published_bundle_meta?.materialization_mode || null,
      });
    }

    if (step === "materialize") {
      const dataSetRaw = chart.data_set_id ? await DataSet.findById(chart.data_set_id).lean() : null;
      if (!dataSetRaw) {
        return res.status(404).json({ success: false, message: "Dataset not found for this chart" });
      }

      const chartLean = chart.toObject ? chart.toObject() : chart;
      const workspaceDataSheets =
        req.body?.workspaceDataSheets && typeof req.body.workspaceDataSheets === "object"
          ? req.body.workspaceDataSheets
          : null;
      const result = await materializeChartBundle({
        chartLean,
        dataSetLean: dataSetRaw,
        userId: chart.user_id,
        workspaceDataSheets,
      });

      if (result.empty_snapshot) {
        return res.status(422).json({
          success: false,
          message:
            "Chart snapshot has no plottable rows. Check chart line filters and that lake data is available.",
          warnings: result.warnings,
        });
      }

      chart.published_bundle = result.bundle;
      chart.published_bundle_meta = result.meta;
      chart.published_bundle_built_at = new Date();
      await chart.save();

      return res.status(200).json({
        success: true,
        step,
        materialization_mode: result.materialization_mode,
        row_count: result.meta.row_count,
        byte_estimate: result.meta.byte_estimate,
        hydration_ms: result.meta.hydration_ms,
        warnings: result.warnings,
        live_lake: result.materialization_mode === MATERIALIZATION_MODE_LIVE_LAKE,
      });
    }

    if (step === "complete") {
      return res.status(200).json({
        success: true,
        step,
        built_at: chart.published_bundle_built_at,
        materialization_mode: chart.published_bundle_meta?.materialization_mode || null,
      });
    }

    return res.status(400).json({ success: false, message: "Unknown step" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e?.message || "Server error" });
  }
}
