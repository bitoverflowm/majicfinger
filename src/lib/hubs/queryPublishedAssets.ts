import dbConnectPublicRead, { getPublicReadModel } from "@/lib/dbConnectPublicRead";
import User from "@/models/Users";
import Chart from "@/models/Charts";
import ChartDashboard from "@/models/ChartDashboards";
import DataSet from "@/models/DataSets";
import { RUN_YOURSELF_ANALYSES } from "@/config/runYourselfAnalyses";
import type {
  HubAssetFilter,
  HubPublishedAssets,
  HubPublishedChart,
  HubPublishedDashboard,
} from "@/types/hub";

type PublicModels = {
  User: typeof User;
  Chart: typeof Chart;
  ChartDashboard: typeof ChartDashboard;
  DataSet: typeof DataSet;
};

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

function dataSheetsUseLake(dataSheets: unknown, lake: string): boolean {
  if (!dataSheets || typeof dataSheets !== "object") return false;
  const target = normalize(lake);
  for (const sheet of Object.values(dataSheets as Record<string, unknown>)) {
    if (!sheet || typeof sheet !== "object") continue;
    const prov = (sheet as { provenance?: { lake?: string } }).provenance;
    if (normalize(prov?.lake || "") === target) return true;
  }
  return false;
}

function slugToTitle(slug: string) {
  return String(slug || "")
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function applyStaticChartFallback(
  charts: HubPublishedChart[],
  seenCharts: Set<string>,
  filter: HubAssetFilter,
) {
  for (const ref of filter.chartSlugs || []) {
    const username = ref.username.trim();
    const slug = ref.slug.trim();
    if (!username || !slug) continue;
    const key = assetKey(username, slug);
    if (seenCharts.has(key)) continue;
    seenCharts.add(key);
    charts.push({
      username,
      slug,
      title: slugToTitle(slug),
      hasOgImage: true,
    });
  }
}

function collectRunYourselfChartRefs(lake?: string): Array<{ username: string; slug: string }> {
  const target = lake ? normalize(lake) : "";
  const refs: Array<{ username: string; slug: string }> = [];
  const seen = new Set<string>();

  for (const analysis of RUN_YOURSELF_ANALYSES) {
    if (target && normalize(analysis.lake || "") !== target) continue;
    for (const chart of analysis.sourceCharts || []) {
      const username = String(chart.ownerHandle || "").trim();
      const slug = String(chart.slug || "").trim();
      if (!username || !slug) continue;
      const key = assetKey(username, slug);
      if (seen.has(key)) continue;
      seen.add(key);
      refs.push({ username, slug });
    }
  }

  return refs;
}

async function fetchPublishedChartsByRefs(
  refs: Array<{ username: string; slug: string }>,
  models: Pick<PublicModels, "User" | "Chart">,
): Promise<HubPublishedChart[]> {
  const normalizedRefs = refs
    .map((ref) => ({ username: ref.username.trim(), slug: ref.slug.trim() }))
    .filter((ref) => ref.username && ref.slug);
  if (!normalizedRefs.length) return [];

  const usernames = [...new Set(normalizedRefs.map((ref) => ref.username))];
  const users = (await models.User.find({ user_name: { $in: usernames } })
    .select("_id user_name")
    .lean()) as Array<{ _id?: unknown; user_name?: string }>;
  const userIdByUsername = new Map(
    users.map((user) => [String(user.user_name || "").trim(), String(user._id)]),
  );

  const userIds = [...userIdByUsername.values()].filter(Boolean);
  const slugs = [...new Set(normalizedRefs.map((ref) => ref.slug))];
  if (!userIds.length || !slugs.length) return [];

  const chartDocs = (await models.Chart.find({
    user_id: { $in: userIds },
    is_public: true,
    public_slug: { $in: slugs },
  })
    .select("user_id public_slug chart_name og_image_data")
    .lean()) as Array<{
    user_id?: unknown;
    public_slug?: string;
    chart_name?: string;
    og_image_data?: string;
  }>;

  const usernameById = new Map(
    [...userIdByUsername.entries()].map(([username, id]) => [id, username]),
  );
  const chartByKey = new Map<string, HubPublishedChart>();
  for (const chart of chartDocs) {
    const username = usernameById.get(String(chart.user_id)) || "";
    const slug = String(chart.public_slug || "").trim();
    if (!username || !slug) continue;
    chartByKey.set(assetKey(username, slug), {
      username,
      slug,
      title: String(chart.chart_name || slug).trim(),
      hasOgImage: !!chart.og_image_data,
    });
  }

  const out: HubPublishedChart[] = [];
  for (const ref of normalizedRefs) {
    const chart = chartByKey.get(assetKey(ref.username, ref.slug));
    if (chart) out.push(chart);
  }
  return out;
}

async function getPublicModels(): Promise<PublicModels> {
  const conn = await dbConnectPublicRead();
  return {
    User: getPublicReadModel(conn, "User", User) as typeof User,
    Chart: getPublicReadModel(conn, "Chart", Chart) as typeof Chart,
    ChartDashboard: getPublicReadModel(conn, "ChartDashboard", ChartDashboard) as typeof ChartDashboard,
    DataSet: getPublicReadModel(conn, "DataSet", DataSet) as typeof DataSet,
  };
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
    const { User: UserModel, Chart: ChartModel, ChartDashboard: DashboardModel, DataSet: DataSetModel } =
      await getPublicModels();

    const username = filter.username?.trim() || "";
    const chartOwnerScoped = username && !filter.chartSearchAllUsers;
    const dashboardOwnerScoped = username && !filter.dashboardSearchAllUsers;
    let userId: string | null = null;

    if (username) {
      const user = (await UserModel.findOne({ user_name: username }).select("_id user_name").lean()) as
        | { _id?: unknown; user_name?: string }
        | null;
      if (user?._id) userId = String(user._id);
    }

    const explicitRefs = [
      ...(filter.chartSlugs || []),
      ...collectRunYourselfChartRefs(filter.chartLake),
    ];

    const explicitCharts = await fetchPublishedChartsByRefs(explicitRefs, {
      User: UserModel,
      Chart: ChartModel,
    });
    for (const chart of explicitCharts) {
      const key = assetKey(chart.username, chart.slug);
      if (seenCharts.has(key)) continue;
      seenCharts.add(key);
      charts.push(chart);
    }

    if (filter.chartKeywords?.length) {
      const query: Record<string, unknown> = {
        is_public: true,
        public_slug: { $type: "string", $gt: "" },
      };
      if (chartOwnerScoped && userId) query.user_id = userId;

      const allCharts = (await ChartModel.find(query)
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
        ? ((await UserModel.find({ _id: { $in: ownerIds } })
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

    if (filter.chartLake) {
      const query: Record<string, unknown> = {
        is_public: true,
        public_slug: { $type: "string", $gt: "" },
        data_set_id: { $exists: true, $ne: null },
      };
      if (chartOwnerScoped && userId) query.user_id = userId;

      const allCharts = (await ChartModel.find(query)
        .select("user_id public_slug chart_name og_image_data data_set_id")
        .lean()) as Array<{
        user_id?: unknown;
        public_slug?: string;
        chart_name?: string;
        og_image_data?: string;
        data_set_id?: unknown;
      }>;

      const dataSetIds = [
        ...new Set(allCharts.map((c) => String(c.data_set_id)).filter(Boolean)),
      ];
      const dataSets = dataSetIds.length
        ? ((await DataSetModel.find({ _id: { $in: dataSetIds } })
            .select("_id data_sheets")
            .lean()) as Array<{ _id?: unknown; data_sheets?: unknown }>)
        : [];
      const lakeByDataSetId = new Map(
        dataSets.map((ds) => [
          String(ds._id),
          dataSheetsUseLake(ds.data_sheets, filter.chartLake!),
        ]),
      );

      const ownerIds = [...new Set(allCharts.map((c) => String(c.user_id)).filter(Boolean))];
      const owners = ownerIds.length
        ? ((await UserModel.find({ _id: { $in: ownerIds } })
            .select("_id user_name")
            .lean()) as Array<{ _id?: unknown; user_name?: string }>)
        : [];
      const usernameById = new Map(owners.map((o) => [String(o._id), String(o.user_name || "")]));

      for (const chart of allCharts) {
        const slug = String(chart.public_slug || "").trim();
        const u = usernameById.get(String(chart.user_id)) || "";
        const dsId = String(chart.data_set_id || "");
        if (!slug || !u || !dsId) continue;
        if (!lakeByDataSetId.get(dsId)) continue;

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

    if (filter.dashboardTags?.length) {
      const query: Record<string, unknown> = {
        is_public: true,
        public_slug: { $type: "string", $gt: "" },
      };
      if (dashboardOwnerScoped && userId) query.user_id = userId;

      const allDashboards = (await DashboardModel.find(query)
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
        ? ((await UserModel.find({ _id: { $in: ownerIds } })
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
  } catch (err) {
    console.error("[queryHubPublishedAssets]", err);
  }

  if (!charts.length) {
    applyStaticChartFallback(charts, seenCharts, filter);
  }

  dashboards.sort((a, b) => b.title.localeCompare(a.title, undefined, { sensitivity: "base" }));

  return { charts, dashboards };
}
