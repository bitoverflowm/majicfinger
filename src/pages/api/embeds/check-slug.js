import dbConnect from "@/lib/dbConnect";
import Chart from "@/models/Charts";
import ChartDashboard from "@/models/ChartDashboards";
import mongoose from "mongoose";
import { requireLoginSession } from "@/lib/resourceOwnership";
import { isValidChartEmbedSlug, normalizeChartEmbedSlug } from "@/lib/chartEmbedSlug";

/**
 * GET /api/embeds/check-slug?kind=chart|dashboard&slug=...&excludeId=optional
 * Returns whether the signed-in user already has another chart/dashboard with this public_slug.
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const session = await requireLoginSession(req, res);
  if (!session) return;

  const kindRaw = Array.isArray(req.query.kind) ? req.query.kind[0] : req.query.kind;
  const slugRaw = Array.isArray(req.query.slug) ? req.query.slug[0] : req.query.slug;
  const excludeRaw = Array.isArray(req.query.excludeId) ? req.query.excludeId[0] : req.query.excludeId;

  const kind = String(kindRaw || "").trim().toLowerCase();
  if (kind !== "chart" && kind !== "dashboard") {
    return res.status(400).json({
      success: false,
      message: "kind must be chart or dashboard",
    });
  }

  const slug = normalizeChartEmbedSlug(String(slugRaw || ""));
  if (!slug) {
    return res.status(200).json({
      success: true,
      available: false,
      reason: "empty",
      slug: "",
    });
  }
  if (!isValidChartEmbedSlug(slug)) {
    return res.status(200).json({
      success: true,
      available: false,
      reason: "invalid",
      slug,
    });
  }

  try {
    await dbConnect();
    const filter = {
      user_id: session.userId,
      public_slug: slug,
    };
    const excludeId = String(excludeRaw || "").trim();
    if (excludeId && mongoose.Types.ObjectId.isValid(excludeId)) {
      filter._id = { $ne: new mongoose.Types.ObjectId(excludeId) };
    }

    const Model = kind === "chart" ? Chart : ChartDashboard;
    const dup = await Model.findOne(filter).select("_id").lean();
    return res.status(200).json({
      success: true,
      available: !dup,
      reason: dup ? "taken" : "ok",
      slug,
    });
  } catch {
    return res.status(400).json({ success: false, message: "Could not check slug" });
  }
}
