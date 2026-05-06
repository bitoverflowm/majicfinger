import dbConnect from "@/lib/dbConnect";
import ChartDashboard from "@/models/ChartDashboards";
import Chart from "@/models/Charts";
import DataSet from "@/models/DataSets";
import User from "@/models/Users";
import mongoose from "mongoose";
import { buildPublicChartBundle } from "@/lib/chartBundle";

type ChartPayload = {
  chart?: {
    chart_name?: string;
    chart_properties?: unknown[];
    rechartsBuilder?: { v: number };
  };
  rows?: unknown[];
  dataSheets?: Record<string, unknown>;
};

type Column = {
  id?: string;
  chart_id?: string | null;
  colSpan?: number;
  rowSpan?: number;
  h2?: string;
  caption?: string;
  chartHeadingTheme?: Record<string, unknown>;
  chartSubheadingTheme?: Record<string, unknown>;
  chartMicrotextTheme?: Record<string, unknown>;
  microtext?: string;
  link?: { mode?: string; url?: string };
  chartPayload?: ChartPayload | null;
  chartLink?: { mode?: string; slug?: string } | null;
};

type Row =
  | {
      id?: string;
      type: "text";
      body?: string;
      textVariant?: "heading" | "paragraph";
      textTheme?: Record<string, unknown>;
    }
  | { id?: string; type: "cards"; columns?: Column[] };

export type PublicDashboardPayload = {
  success: boolean;
  data?: {
    page_heading?: string;
    page_subheading?: string;
    dashboard_name?: string;
    theme?: { background?: string; background_color?: string };
    layout?: { rows?: Row[] };
    owner_handle?: string;
  };
  message?: string;
};

function hydrateLayout(layout: any, chartBundlesById: Map<string, any>) {
  if (!layout || typeof layout !== "object") return { version: 1, rows: [] };
  const rows = Array.isArray(layout.rows) ? layout.rows : [];
  const nextRows = rows.map((row: any) => {
    if (!row || row.type !== "cards" || !Array.isArray(row.columns)) {
      return row;
    }
    const columns = row.columns.map((col: any) => {
      if (!col || !col.chart_id) {
        return { ...col, chartPayload: null, chartLink: null };
      }
      const id = String(col.chart_id);
      const bundle = chartBundlesById.get(id);
      const meta = bundle?.meta;
      return {
        ...col,
        chartPayload: bundle
          ? { chart: bundle.chart, rows: bundle.rows, dataSheets: bundle.dataSheets }
          : null,
        chartLink:
          meta?.is_public && meta?.public_slug
            ? { mode: "chart_public", slug: meta.public_slug }
            : null,
      };
    });
    return { ...row, columns };
  });
  return { ...layout, rows: nextRows };
}

export async function getPublicDashboardPayload(
  username: string,
  slug: string,
): Promise<PublicDashboardPayload> {
  if (!username || !slug) return { success: false, message: "Missing username or slug" };
  await dbConnect();
  const user = (await User.findOne({ user_name: String(username || "").trim() }).lean()) as any;
  if (!user || !user._id) return { success: false, message: "User not found" };

  const dash = (await ChartDashboard.findOne({
    user_id: user._id as any,
    public_slug: String(slug || "").trim(),
    is_public: true,
  }).lean()) as any;

  if (!dash) return { success: false, message: "Dashboard not found" };

  const chartIds = new Set<string>();
  const rows = Array.isArray(dash.layout?.rows) ? dash.layout.rows : [];
  for (const row of rows) {
    if (!row || row.type !== "cards" || !Array.isArray(row.columns)) continue;
    for (const col of row.columns) {
      if (col?.chart_id && mongoose.Types.ObjectId.isValid(String(col.chart_id))) {
        chartIds.add(String(col.chart_id));
      }
    }
  }

  const chartBundlesById = new Map<string, any>();
  for (const cid of chartIds) {
    const chart = (await Chart.findOne({
      _id: cid,
      user_id: user._id,
    }).lean()) as any;
    if (!chart) continue;
    const dataSet = (await DataSet.findById(chart.data_set_id as any).lean()) as any;
    if (!dataSet) continue;
    const bundle = buildPublicChartBundle(chart, dataSet);
    chartBundlesById.set(cid, {
      ...bundle,
      meta: {
        public_slug: chart.public_slug,
        is_public: !!chart.is_public,
      },
    });
  }

  const layoutOut = hydrateLayout(dash.layout, chartBundlesById);
  return {
    success: true,
    data: {
      page_heading: dash.page_heading || "",
      page_subheading: dash.page_subheading || "",
      dashboard_name: dash.dashboard_name || "",
      theme: dash.theme || {},
      layout: layoutOut,
      owner_handle: user.user_name,
    },
  };
}

