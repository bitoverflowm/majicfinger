import dbConnect from "@/lib/dbConnect";
import User from "@/models/Users";
import ChartDashboard from "@/models/ChartDashboards";

export type LandingDashboardCard = {
  username: string;
  slug: string;
  title: string;
  description: string;
  publishedAt?: string | null;
  hasOgImage?: boolean;
  tags?: string[];
};

export type LandingDashboardsResult = {
  dashboards: LandingDashboardCard[];
  profilePic: string | null;
};

export async function getPublishedDashboardsForLanding(
  username = "misterrpink",
  limit = 12,
): Promise<LandingDashboardsResult> {
  let dashboards: LandingDashboardCard[] = [];
  let profilePic: string | null = null;

  try {
    await dbConnect();
    const user = (await User.findOne({ user_name: String(username).trim() })
      .select("_id user_name profile_pic")
      .lean()) as {
      _id?: unknown;
      user_name?: string;
      profile_pic?: string;
    } | null;

    if (user?._id) {
      profilePic = user.profile_pic ? String(user.profile_pic) : null;
      const list = (await ChartDashboard.find({
        user_id: user._id,
        is_public: true,
        public_slug: { $type: "string", $gt: "" },
      })
        .select(
          "public_slug page_heading page_subheading published_at last_edited_date og_image_data tags",
        )
        .sort({ published_at: -1, last_edited_date: -1 })
        .limit(Math.max(1, Math.min(120, Number(limit) || 12)))
        .lean()) as Array<{
        public_slug?: string;
        page_heading?: string;
        page_subheading?: string;
        published_at?: Date | string;
        last_edited_date?: Date | string;
        og_image_data?: unknown;
        tags?: string[];
      }>;

      dashboards = list
        .map((d) => {
          const slug = String(d.public_slug || "").trim();
          const title = String(d.page_heading || "").trim();
          const description = String(d.page_subheading || "").trim();
          if (!slug || !title || !description) return null;
          const tags = Array.isArray(d.tags)
            ? d.tags.map((t) => String(t || "").trim()).filter(Boolean)
            : [];
          const publishedAt = d.published_at || d.last_edited_date
            ? new Date(d.published_at || d.last_edited_date!).toISOString()
            : null;
          return {
            username: String(user.user_name || username),
            slug,
            title,
            description,
            publishedAt,
            hasOgImage: !!d.og_image_data,
            tags,
          } satisfies LandingDashboardCard;
        })
        .filter(Boolean) as LandingDashboardCard[];
    }
  } catch {
    dashboards = [];
  }

  return { dashboards, profilePic };
}
