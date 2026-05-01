import dbConnect from "@/lib/dbConnect";
import ChartDashboard from "@/models/ChartDashboards";
import User from "@/models/Users";

export async function getPublicDashboardMeta(username, slug) {
  if (!username || !slug) return null;
  await dbConnect();
  const user = await User.findOne({ user_name: String(username).trim() }).select("_id").lean();
  if (!user) return null;
  const dash = await ChartDashboard.findOne({
    user_id: user._id,
    public_slug: String(slug).trim(),
    is_public: true,
  })
    .select("page_heading dashboard_name")
    .lean();
  if (!dash) return null;
  const title = (dash.page_heading || dash.dashboard_name || "Dashboard").trim();
  return { project_name: title };
}
