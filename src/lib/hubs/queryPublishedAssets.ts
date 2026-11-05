import { Types } from "mongoose";
import dbConnectPublicRead, { getPublicReadModel } from "@/lib/dbConnectPublicRead";
import { hubSlugFromTags } from "@/lib/dashboardHubTags";
import { HAS_OG_IMAGE_EXPR } from "@/lib/server/hasOgImageExpr";
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

type LeanChartRow = {
  user_id?: unknown;
  public_slug?: string;
  chart_name?: string;
  labels?: string[];
  data_set_id?: unknown;
  has_og?: boolean;
};

/** Public charts with `has_og` computed in Mongo so the ~100 KB OG data URLs never leave the DB. */
async function findPublicCharts(
  model: PublicModels["Chart"],
  match: Record<string, unknown>,
  fields: string[],
  limit?: number,
): Promise<LeanChartRow[]> {
  const $match = { ...match };
  if (typeof $match.user_id === "string") $match.user_id = new Types.ObjectId($match.user_id);
  const project: Record<string, unknown> = { has_og: HAS_OG_IMAGE_EXPR };
  for (const f of fields) project[f] = 1;
  return (await model
    .aggregate([
      { $match },
      { $sort: { published_at: -1, last_edited_date: -1 } },
      ...(limit ? [{ $limit: limit }] : []),
      { $project: project },
    ])
    .option({ maxTimeMS: QUERY_MAX_TIME_MS })) as LeanChartRow[];
}

/** Dataset ids whose sheets pull from `lake`, reading only each sheet's `provenance.lake`. */
async function dataSetIdsUsingLake(
  model: PublicModels["DataSet"],
  ids: string[],
  lake: string,
): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const rows = (await model
    .aggregate([
      { $match: { _id: { $in: ids.map((id) => new Types.ObjectId(id)) } } },
      {
        $project: {
          lakes: {
            $cond: [
              { $eq: [{ $type: "$data_sheets" }, "object"] },
              {
                $map: {
                  input: { $objectToArray: "$data_sheets" },
                  as: "s",
                  in: "$$s.v.provenance.lake",
                },
              },
              [],
            ],
          },
        },
      },
    ])
    .option({ maxTimeMS: QUERY_MAX_TIME_MS })) as Array<{ _id: unknown; lakes?: unknown[] }>;
  const target = normalize(lake);
  return new Set(
    rows
      .filter((r) => (r.lakes || []).some((l) => normalize(String(l ?? "")) === target))
      .map((r) => String(r._id)),
  );
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

  const chartDocs = await findPublicCharts(
    models.Chart,
    {
      user_id: { $in: userIds.map((id) => new Types.ObjectId(id)) },
      is_public: true,
      public_slug: { $in: slugs },
    },
    ["user_id", "public_slug", "chart_name"],
  );

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
      hasOgImage: !!chart.has_og,
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

const QUERY_MAX_TIME_MS = 8000;
const BROAD_CHART_SCAN_LIMIT = 120;
const BROAD_DASHBOARD_SCAN_LIMIT = 80;

export async function queryHubPublishedAssets(
  filter?: HubAssetFilter,
  hubSlug?: string,
): Promise<HubPublishedAssets> {
  if (!filter) return { charts: [], dashboards: [] };

  const maxCharts = Math.max(1, Math.min(48, filter.maxCharts ?? 24));
  const maxDashboards = Math.max(1, Math.min(48, filter.maxDashboards ?? 24));

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

    if (filter.chartKeywords?.length && charts.length < maxCharts) {
      const query: Record<string, unknown> = {
        is_public: true,
        public_slug: { $type: "string", $gt: "" },
      };
      if (chartOwnerScoped && userId) query.user_id = userId;

      const allCharts = await findPublicCharts(
        ChartModel,
        query,
        ["user_id", "public_slug", "chart_name", "labels"],
        BROAD_CHART_SCAN_LIMIT,
      );

      const ownerIds = [...new Set(allCharts.map((c) => String(c.user_id)).filter(Boolean))];
      const owners = ownerIds.length
        ? ((await UserModel.find({ _id: { $in: ownerIds } })
            .select("_id user_name")
            .lean()) as Array<{ _id?: unknown; user_name?: string }>)
        : [];
      const usernameById = new Map(owners.map((o) => [String(o._id), String(o.user_name || "")]));

      for (const chart of allCharts) {
        if (charts.length >= maxCharts) break;
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
          hasOgImage: !!chart.has_og,
        });
      }
    }

    if (filter.chartLake && charts.length < maxCharts) {
      const query: Record<string, unknown> = {
        is_public: true,
        public_slug: { $type: "string", $gt: "" },
        data_set_id: { $exists: true, $ne: null },
      };
      if (chartOwnerScoped && userId) query.user_id = userId;

      const allCharts = await findPublicCharts(
        ChartModel,
        query,
        ["user_id", "public_slug", "chart_name", "data_set_id"],
        BROAD_CHART_SCAN_LIMIT,
      );

      const dataSetIds = [
        ...new Set(
          allCharts
            .map((c) => String(c.data_set_id || ""))
            .filter((id) => Types.ObjectId.isValid(id)),
        ),
      ];
      const lakeDataSets = await dataSetIdsUsingLake(DataSetModel, dataSetIds, filter.chartLake!);

      const ownerIds = [...new Set(allCharts.map((c) => String(c.user_id)).filter(Boolean))];
      const owners = ownerIds.length
        ? ((await UserModel.find({ _id: { $in: ownerIds } })
            .select("_id user_name")
            .lean()) as Array<{ _id?: unknown; user_name?: string }>)
        : [];
      const usernameById = new Map(owners.map((o) => [String(o._id), String(o.user_name || "")]));

      for (const chart of allCharts) {
        if (charts.length >= maxCharts) break;
        const slug = String(chart.public_slug || "").trim();
        const u = usernameById.get(String(chart.user_id)) || "";
        const dsId = String(chart.data_set_id || "");
        if (!slug || !u || !dsId) continue;
        if (!lakeDataSets.has(dsId)) continue;

        const key = assetKey(u, slug);
        if (seenCharts.has(key)) continue;
        seenCharts.add(key);
        charts.push({
          username: u,
          slug,
          title: String(chart.chart_name || slug).trim(),
          hasOgImage: !!chart.has_og,
        });
      }
    }

    if (filter.dashboardTags?.length && dashboards.length < maxDashboards) {
      const query: Record<string, unknown> = {
        is_public: true,
        public_slug: { $type: "string", $gt: "" },
      };
      if (dashboardOwnerScoped && userId) query.user_id = userId;

      if (query.user_id) query.user_id = new Types.ObjectId(String(query.user_id));
      const allDashboards = (await DashboardModel.aggregate([
        { $match: query },
        { $sort: { published_at: -1, last_edited_date: -1 } },
        { $limit: BROAD_DASHBOARD_SCAN_LIMIT },
        {
          $project: {
            user_id: 1,
            public_slug: 1,
            page_heading: 1,
            page_subheading: 1,
            tags: 1,
            has_og: HAS_OG_IMAGE_EXPR,
          },
        },
      ]).option({ maxTimeMS: QUERY_MAX_TIME_MS })) as Array<{
        user_id?: unknown;
        public_slug?: string;
        page_heading?: string;
        page_subheading?: string;
        has_og?: boolean;
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
        if (dashboards.length >= maxDashboards) break;
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
        const taggedHub = hubSlugFromTags(dash.tags);
        if (hubSlug && taggedHub && taggedHub !== hubSlug) continue;

        const key = assetKey(u, slug);
        if (seenDashboards.has(key)) continue;
        seenDashboards.add(key);
        dashboards.push({
          username: u,
          slug,
          title,
          description,
          hasOgImage: !!dash.has_og,
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

  return {
    charts: charts.slice(0, maxCharts),
    dashboards: dashboards.slice(0, maxDashboards),
  };
}
