import dbConnect from "@/lib/dbConnect";
import Bento from "@/models/Bentos";
import User from "@/models/Users";

export async function getPublicDashboardMeta(username, slug) {
  if (!username || !slug) return null;
  await dbConnect();
  const user = await User.findOne({ user_name: String(username).trim() }).select("_id").lean();
  if (!user) return null;
  const bento = await Bento.findOne({
    user_id: user._id,
    public_slug: String(slug).trim(),
    is_public: true,
  })
    .select("project_name")
    .lean();
  if (!bento) return null;
  return { project_name: bento.project_name || "Dashboard" };
}
