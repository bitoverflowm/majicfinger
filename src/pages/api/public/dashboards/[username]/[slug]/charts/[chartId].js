import dbConnect from "@/lib/dbConnect";
import ChartDashboard from "@/models/ChartDashboards";
import User from "@/models/Users";
import {
  buildPublicDashboardChartBundle,
  publicDashboardCacheControl,
} from "@/lib/server/publicDashboardHydration";

export default async function handler(req, res) {
  const { username, slug, chartId } = req.query;

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    await dbConnect();
    const user = await User.findOne({ user_name: String(username || "").trim() }).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const dash = await ChartDashboard.findOne({
      user_id: user._id,
      public_slug: String(slug || "").trim(),
      is_public: true,
    }).lean();

    if (!dash) {
      return res.status(404).json({ success: false, message: "Dashboard not found" });
    }

    const result = await buildPublicDashboardChartBundle(dash, user, chartId);
    if (!result.success) {
      return res.status(result.message === "Chart not on this dashboard" ? 404 : 400).json(result);
    }

    const cacheHit = !!result.data?._cacheHit;
    if (result.data) delete result.data._cacheHit;

    res.setHeader("Cache-Control", publicDashboardCacheControl(cacheHit));
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
}
