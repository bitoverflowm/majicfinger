import {
  getAppRouterViewerUserId,
  resolveDashboardByUsernameSlug,
} from "@/lib/server/resolveDashboardByUsernameSlug";

export async function getPublicDashboardMeta(username, slug) {
  if (!username || !slug) return null;
  const viewerUserId = await getAppRouterViewerUserId();
  const resolved = await resolveDashboardByUsernameSlug(username, slug, {
    viewerUserId,
    select:
      "user_id page_heading page_subheading dashboard_name seo_title tags keywords published_at last_edited_date og_image_data is_public public_slug",
  });
  if (!resolved) return null;
  const { dash, isPublic, isPrivatePublished } = resolved;
  const pageTitle = (dash.page_heading || dash.dashboard_name || "Dashboard").trim();
  const seoTitle = String(dash.seo_title || "").trim() || pageTitle;
  const description = String(dash.page_subheading || "").trim();
  const tags = Array.isArray(dash.tags) ? dash.tags.filter(Boolean) : [];
  const keywords = Array.isArray(dash.keywords) ? dash.keywords.filter(Boolean) : [];
  return {
    project_name: pageTitle,
    seo_title: seoTitle,
    description,
    tags,
    keywords,
    published_at: dash.published_at || null,
    last_edited_date: dash.last_edited_date || null,
    has_og_image_data: !!dash.og_image_data,
    is_public: isPublic,
    is_private_published: isPrivatePublished,
  };
}
