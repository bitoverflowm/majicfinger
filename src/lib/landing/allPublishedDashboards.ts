import dbConnect from "@/lib/dbConnect";
import User from "@/models/Users";
import ChartDashboard from "@/models/ChartDashboards";
import type { LandingDashboardCard } from "@/lib/landing/publishedDashboards";
import { HAS_OG_IMAGE_EXPR } from "@/lib/server/hasOgImageExpr";

export async function getAllPublishedDashboards(limit = 120): Promise<LandingDashboardCard[]> {
  const cap = Math.max(1, Math.min(500, Number(limit) || 120));
  try {
    await dbConnect();
    const dashboards = (await ChartDashboard.aggregate([
      { $match: { is_public: true, public_slug: { $type: "string", $gt: "" } } },
      { $sort: { published_at: -1, last_edited_date: -1 } },
      { $limit: cap * 2 },
      {
        $project: {
          user_id: 1,
          public_slug: 1,
          page_heading: 1,
          page_subheading: 1,
          published_at: 1,
          last_edited_date: 1,
          tags: 1,
          has_og: HAS_OG_IMAGE_EXPR,
        },
      },
    ])) as Array<{
      user_id?: unknown;
      public_slug?: string;
      page_heading?: string;
      page_subheading?: string;
      published_at?: Date | string;
      last_edited_date?: Date | string;
      has_og?: boolean;
      tags?: string[];
    }>;

    const userIds = [...new Set(dashboards.map((d) => String(d.user_id)).filter(Boolean))];
    const users = userIds.length
      ? ((await User.find({ _id: { $in: userIds } })
          .select("_id user_name profile_pic")
          .lean()) as Array<{ _id?: unknown; user_name?: string; profile_pic?: string }>)
      : [];
    const userById = new Map(
      users.map((u) => [String(u._id), { username: String(u.user_name || ""), profilePic: u.profile_pic }]),
    );

    const cards: LandingDashboardCard[] = [];
    for (const d of dashboards) {
      if (cards.length >= cap) break;
      const slug = String(d.public_slug || "").trim();
      const title = String(d.page_heading || "").trim();
      const description = String(d.page_subheading || "").trim();
      if (!slug || !title || !description) continue;
      const owner = userById.get(String(d.user_id));
      const username = owner?.username || "";
      if (!username) continue;
      const tags = Array.isArray(d.tags)
        ? d.tags.map((t) => String(t || "").trim()).filter(Boolean)
        : [];
      cards.push({
        username,
        slug,
        title,
        description,
        publishedAt: d.published_at || d.last_edited_date
          ? new Date(d.published_at || d.last_edited_date!).toISOString()
          : null,
        hasOgImage: !!d.has_og,
        tags,
      });
    }
    return cards;
  } catch {
    return [];
  }
}

export async function getPublishedDashboardsForSearch(): Promise<
  Array<{
    slug: string;
    contentType: string;
    title: string;
    description: string;
    username: string;
    tags: string[];
    topics: string[];
    integration: string[];
  }>
> {
  const dashboards = await getAllPublishedDashboards(500);
  return dashboards.map((d) => ({
    slug: `${d.username}/${d.slug}`,
    contentType: "dashboards",
    title: d.title,
    description: d.description,
    username: d.username,
    tags: d.tags || [],
    topics: d.tags || [],
    integration: [],
  }));
}
