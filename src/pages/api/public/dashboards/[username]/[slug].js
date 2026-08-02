import dbConnect from "@/lib/dbConnect";
import ChartDashboard from "@/models/ChartDashboards";
import User from "@/models/Users";
import {
  buildPublicDashboardResponseData,
  publicDashboardCacheControl,
} from "@/lib/server/publicDashboardHydration";

export default async function handler(req, res) {
  const { username, slug } = req.query;

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

    const data = await buildPublicDashboardResponseData(dash, user);
    const cacheHit = !!data._cacheHit;
    const liveBacked = !!data.live_backed;
    delete data._cacheHit;

    res.setHeader("Cache-Control", publicDashboardCacheControl(cacheHit, { liveBacked }));
    return res.status(200).json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
}
