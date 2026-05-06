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
    .select("page_heading page_subheading dashboard_name seo_title tags keywords published_at og_image_data")
    .lean();
  if (!dash) return null;
  const pageTitle = (dash.page_heading || dash.dashboard_name || "Dashboard").trim();
  const seoTitle = String(dash.seo_title || "").trim() || pageTitle;
  const description = String(dash.page_subheading || "").trim();
  const tags = Array.isArray(dash.tags) ? dash.tags.filter(Boolean) : [];
  const keywords = Array.isArray(dash.keywords) ? dash.keywords.filter(Boolean) : [];
  const publishedAt = dash.published_at || null;
  const hasOgImageData = !!dash.og_image_data;
  return {
    project_name: pageTitle,
    seo_title: seoTitle,
    description,
    tags,
    keywords,
    published_at: publishedAt,
    has_og_image_data: hasOgImageData,
  };
}
