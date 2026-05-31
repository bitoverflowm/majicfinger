import dbConnect from "@/lib/dbConnect";
import User from "@/models/Users";
import Chart from "@/models/Charts";
import ChartDashboard from "@/models/ChartDashboards";
import type {
  HubAssetFilter,
  HubPublishedAssets,
  HubPublishedChart,
  HubPublishedDashboard,
} from "@/types/hub";

function normalize(s: string) {
  return String(s || "").trim().toLowerCase();
}

function matchesKeywords(value: string, keywords: string[]) {
  const v = normalize(value);
  return keywords.some((k) => v.includes(normalize(k)));
}

function assetKey(username: string, slug: string) {
  return `${normalize(username)}::${normalize(slug)}`;
}

export async function queryHubPublishedAssets(
  filter?: HubAssetFilter,
): Promise<HubPublishedAssets> {
  if (!filter) return { charts: [], dashboards: [] };

  const charts: HubPublishedChart[] = [];
  const dashboards: HubPublishedDashboard[] = [];
  const seenCharts = new Set<string>();
  const seenDashboards = new Set<string>();

  try {
    await dbConnect();

    const username = filter.username?.trim() || "";
    let userId: string | null = null;

    if (username) {
      const user = (await User.findOne({ user_name: username }).select("_id user_name").lean()) as
        | { _id?: unknown; user_name?: string }
        | null;
      if (user?._id) userId = String(user._id);
    }

    // Explicit chart slugs first
    if (filter.chartSlugs?.length) {
      for (const ref of filter.chartSlugs) {
        const u = ref.username.trim();
        const s = ref.slug.trim();
        if (!u || !s) continue;

        const owner = (await User.findOne({ user_name: u }).select("_id").lean()) as
          | { _id?: unknown }
          | null;
        if (!owner?._id) continue;

        const chart = (await Chart.findOne({
          user_id: owner._id,
          public_slug: s,
          is_public: true,
        })
          .select("public_slug chart_name og_image_data")
          .lean()) as { public_slug?: string; chart_name?: string; og_image_data?: string } | null;

        if (!chart?.public_slug) continue;
        const key = assetKey(u, chart.public_slug);
        if (seenCharts.has(key)) continue;
        seenCharts.add(key);
        charts.push({
          username: u,
          slug: String(chart.public_slug),
          title: String(chart.chart_name || chart.public_slug).trim(),
          hasOgImage: !!chart.og_image_data,
        });
      }
    }

    // Keyword-matched charts
    if (filter.chartKeywords?.length) {
      const query: Record<string, unknown> = {
        is_public: true,
        public_slug: { $type: "string", $gt: "" },
      };
      if (userId) query.user_id = userId;

      const allCharts = (await Chart.find(query)
        .select("user_id public_slug chart_name og_image_data labels")
        .lean()) as Array<{
        user_id?: unknown;
        public_slug?: string;
        chart_name?: string;
        og_image_data?: string;
        labels?: string[];
      }>;

      const ownerIds = [...new Set(allCharts.map((c) => String(c.user_id)).filter(Boolean))];
      const owners = ownerIds.length
        ? ((await User.find({ _id: { $in: ownerIds } })
            .select("_id user_name")
            .lean()) as Array<{ _id?: unknown; user_name?: string }>)
        : [];
      const usernameById = new Map(owners.map((o) => [String(o._id), String(o.user_name || "")]));

      for (const chart of allCharts) {
        const slug = String(chart.public_slug || "").trim();
        const u = usernameById.get(String(chart.user_id)) || "";
        if (!slug || !u) continue;

        const labelText = Array.isArray(chart.labels)
          ? chart.labels.map((l) => String(l)).join(" ")
          : "";
        const haystack = [slug, String(chart.chart_name || ""), labelText].join(" ");
        if (!matchesKeywords(haystack, filter.chartKeywords)) continue;

        const key = assetKey(u, slug);
        if (seenCharts.has(key)) continue;
        seenCharts.add(key);
        charts.push({
          username: u,
          slug,
          title: String(chart.chart_name || slug).trim(),
          hasOgImage: !!chart.og_image_data,
        });
      }
    }

    // Tag-matched dashboards
    if (filter.dashboardTags?.length) {
      const query: Record<string, unknown> = {
        is_public: true,
        public_slug: { $type: "string", $gt: "" },
      };
      if (userId) query.user_id = userId;

      const allDashboards = (await ChartDashboard.find(query)
        .select("user_id public_slug page_heading page_subheading og_image_data tags")
        .sort({ published_at: -1, last_edited_date: -1 })
        .lean()) as Array<{
        user_id?: unknown;
        public_slug?: string;
        page_heading?: string;
        page_subheading?: string;
        og_image_data?: string;
        tags?: string[];
      }>;

      const ownerIds = [...new Set(allDashboards.map((d) => String(d.user_id)).filter(Boolean))];
      const owners = ownerIds.length
        ? ((await User.find({ _id: { $in: ownerIds } })
            .select("_id user_name")
            .lean()) as Array<{ _id?: unknown; user_name?: string }>)
        : [];
      const usernameById = new Map(owners.map((o) => [String(o._id), String(o.user_name || "")]));

      const normalizedTags = filter.dashboardTags.map(normalize);

      for (const dash of allDashboards) {
        const slug = String(dash.public_slug || "").trim();
        const u = usernameById.get(String(dash.user_id)) || "";
        const title = String(dash.page_heading || "").trim();
        const description = String(dash.page_subheading || "").trim();
        if (!slug || !u || !title) continue;

        const tags = Array.isArray(dash.tags)
          ? dash.tags.map((t) => normalize(String(t)))
          : [];
        const matches = normalizedTags.some((t) =>
          tags.some((dt) => dt.includes(t) || t.includes(dt)),
        );
        if (!matches) continue;

        const key = assetKey(u, slug);
        if (seenDashboards.has(key)) continue;
        seenDashboards.add(key);
        dashboards.push({
          username: u,
          slug,
          title,
          description,
          hasOgImage: !!dash.og_image_data,
          tags: Array.isArray(dash.tags) ? dash.tags.map(String) : [],
        });
      }
    }
  } catch {
    return { charts: [], dashboards: [] };
  }

  return { charts, dashboards };
}
