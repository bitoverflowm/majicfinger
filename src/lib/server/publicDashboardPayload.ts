import dbConnect from "@/lib/dbConnect";
import ChartDashboard from "@/models/ChartDashboards";
import Chart from "@/models/Charts";
import DataSet from "@/models/DataSets";
import User from "@/models/Users";
import mongoose from "mongoose";
import { buildPublicChartBundle } from "@/lib/chartBundle";
import { hydrateDataSetForPublicChartViewer } from "@/lib/server/hydratePublicChartDataset";
import {
  attachCardGridSheetRows,
  hydrateCardGridSheetsForPublicDashboard,
} from "@/lib/server/hydrateDashboardCardGridSheets";
import { applyCardGridSnapshotsToSheets } from "@/lib/server/dashboardCardGridSnapshots";

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

type CardGridRow = {
  id?: string;
  type: "cardGrid";
  h2?: string;
  caption?: string;
  sheetId?: string;
  rowLimit?: number;
  fields?: Record<string, { column?: string | null; visible?: boolean }>;
  sectionHeadingTheme?: Record<string, unknown>;
  sectionSubheadingTheme?: Record<string, unknown>;
  rankTheme?: Record<string, unknown>;
  headerTheme?: Record<string, unknown>;
  subheaderTheme?: Record<string, unknown>;
  tagsTheme?: Record<string, unknown>;
  valueTheme?: Record<string, unknown>;
  sheetRows?: unknown[];
};

type Row =
  | {
      id?: string;
      type: "text";
      body?: string;
      textVariant?: "heading" | "paragraph";
      textTheme?: Record<string, unknown>;
    }
  | { id?: string; type: "cards"; columns?: Column[] }
  | CardGridRow;

export type PublicDashboardPayload = {
  success: boolean;
  data?: {
    page_heading?: string;
    page_subheading?: string;
    dashboard_name?: string;
    theme?: { background?: string; background_color?: string };
    layout?: { rows?: Row[] };
    owner_handle?: string;
    owner_profile_pic?: string | null;
    tags?: string[];
  };
  message?: string;
};

function hydrateLayout(layout: any, chartBundlesById: Map<string, any>, dataSheets: Record<string, any>) {
  if (!layout || typeof layout !== "object") return { version: 1, rows: [] };
  const withCardRows = attachCardGridSheetRows(layout, dataSheets);
  const rows = Array.isArray(withCardRows.rows) ? withCardRows.rows : [];
  const nextRows = rows.map((row: any) => {
    if (row?.type === "cardGrid") {
      return row;
    }
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
  return { ...withCardRows, rows: nextRows };
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

  let dataSheets: Record<string, any> = {};
  if (dash.data_set_id) {
    const dataSetRaw = (await DataSet.findById(dash.data_set_id as any).lean()) as any;
    if (dataSetRaw) {
      const dataSet = await hydrateDataSetForPublicChartViewer(null, dataSetRaw);
      dataSheets =
        dataSet?.data_sheets && typeof dataSet.data_sheets === "object" ? dataSet.data_sheets : {};
      applyCardGridSnapshotsToSheets(dataSheets, dash.layout, dash.card_grid_snapshots);
      await hydrateCardGridSheetsForPublicDashboard(dataSheets, dash.layout, user._id);
    }
  }

  const chartBundlesById = new Map<string, any>();
  for (const cid of chartIds) {
    const chart = (await Chart.findOne({
      _id: cid,
      user_id: user._id,
    }).lean()) as any;
    if (!chart) continue;
    const dataSetRaw = (await DataSet.findById(chart.data_set_id as any).lean()) as any;
    if (!dataSetRaw) continue;
    const dataSet = await hydrateDataSetForPublicChartViewer(chart, dataSetRaw);
    const bundle = buildPublicChartBundle(chart, dataSet);
    chartBundlesById.set(cid, {
      ...bundle,
      meta: {
        public_slug: chart.public_slug,
        is_public: !!chart.is_public,
      },
    });
  }

  const layoutOut = hydrateLayout(dash.layout, chartBundlesById, dataSheets);
  return {
    success: true,
    data: {
      page_heading: dash.page_heading || "",
      page_subheading: dash.page_subheading || "",
      dashboard_name: dash.dashboard_name || "",
      theme: dash.theme || {},
      layout: layoutOut,
      owner_handle: user.user_name,
      owner_profile_pic: user.profile_pic ? String(user.profile_pic) : null,
      tags: Array.isArray(dash.tags) ? dash.tags.map((t: any) => String(t || "").trim()).filter(Boolean) : [],
    },
  };
}

