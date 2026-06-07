import dbConnect from "@/lib/dbConnect";
import ChartDashboard from "@/models/ChartDashboards";
import User from "@/models/Users";
import { cache } from "react";
import { clampCardGridRowLimit } from "@/lib/dashboardCardGrid";

function buildShellLayout(layout, cardGridSnapshots) {
  if (!layout || typeof layout !== "object") return { version: 1, rows: [] };
  const snapshots =
    cardGridSnapshots && typeof cardGridSnapshots === "object" ? cardGridSnapshots : {};
  const rows = Array.isArray(layout.rows) ? layout.rows : [];
  const nextRows = rows.map((row) => {
    if (row?.type === "cardGrid") {
      const sheetId = row.sheetId ? String(row.sheetId) : "";
      const limit = clampCardGridRowLimit(row.rowLimit);
      const saved = sheetId && Array.isArray(snapshots[sheetId]) ? snapshots[sheetId] : [];
      const sheetRows = saved.slice(0, limit);
      return { ...row, sheetRows };
    }
    if (row?.type === "cards" && Array.isArray(row.columns)) {
      const columns = row.columns.map((col) => {
        if (!col?.chart_id) {
          return { ...col, chartPayload: null, chartLink: null };
        }
        return {
          ...col,
          chartPayload: {
            chart: { chart_name: String(col.h2 || col.caption || "Chart") },
            rows: [],
            dataSheets: {},
          },
          chartLink: null,
        };
      });
      return { ...row, columns };
    }
    return row;
  });
  return { ...layout, rows: nextRows };
}

/**
 * Single DB round-trip for published dashboard page (SSR shell + SEO meta).
 * Wrapped in React cache() so generateMetadata + page share one query per request.
 */
export const getPublicDashboardPageContext = cache(async function getPublicDashboardPageContext(
  username,
  slug,
) {
  if (!username || !slug) return null;
  await dbConnect();

  const user = await User.findOne({ user_name: String(username).trim() })
    .select("_id user_name profile_pic")
    .lean();
  if (!user?._id) return null;

  const dash = await ChartDashboard.findOne({
    user_id: user._id,
    public_slug: String(slug).trim(),
    is_public: true,
  })
    .select(
      "page_heading page_subheading dashboard_name seo_title tags keywords theme layout card_grid_snapshots published_at last_edited_date og_image_data",
    )
    .lean();
  if (!dash) return null;

  const pageTitle = (dash.page_heading || dash.dashboard_name || "Dashboard").trim();
  const seoTitle = String(dash.seo_title || "").trim() || pageTitle;
  const description = String(dash.page_subheading || "").trim();
  const tags = Array.isArray(dash.tags) ? dash.tags.filter(Boolean) : [];
  const keywords = Array.isArray(dash.keywords) ? dash.keywords.filter(Boolean) : [];

  const shellPayload = {
    success: true,
    data: {
      page_heading: dash.page_heading || "",
      page_subheading: dash.page_subheading || "",
      dashboard_name: dash.dashboard_name || "",
      theme: dash.theme || {},
      layout: buildShellLayout(dash.layout, dash.card_grid_snapshots),
      owner_handle: user.user_name,
      owner_profile_pic: user.profile_pic ? String(user.profile_pic) : null,
      tags: tags.map((t) => String(t || "").trim()).filter(Boolean),
    },
  };

  const meta = {
    project_name: pageTitle,
    seo_title: seoTitle,
    description,
    tags,
    keywords,
    published_at: dash.published_at || null,
    last_edited_date: dash.last_edited_date || null,
    has_og_image_data: !!dash.og_image_data,
  };

  return { shellPayload, meta, user, dash };
});
