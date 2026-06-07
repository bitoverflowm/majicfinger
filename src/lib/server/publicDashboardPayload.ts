import dbConnect from "@/lib/dbConnect";
import ChartDashboard from "@/models/ChartDashboards";
import User from "@/models/Users";
import {
  buildPublicDashboardResponseData,
  hydrateLayoutWithChartBundles,
} from "@/lib/server/publicDashboardHydration";
import { getPublicDashboardPageContext } from "@/lib/server/publicDashboardPageContext";

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

/**
 * Lightweight dashboard payload for SSR (HTML shell, OG/social crawlers).
 * Chart/card data loads client-side via /api/public/dashboards/...
 */
export async function getPublicDashboardShellPayload(
  username: string,
  slug: string,
): Promise<PublicDashboardPayload> {
  const ctx = await getPublicDashboardPageContext(username, slug);
  if (!ctx) return { success: false, message: "Dashboard not found" };
  return ctx.shellPayload as PublicDashboardPayload;
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

  const data = await buildPublicDashboardResponseData(dash, user);
  delete (data as { _cacheHit?: boolean })._cacheHit;

  return {
    success: true,
    data: {
      page_heading: data.page_heading,
      page_subheading: data.page_subheading,
      dashboard_name: data.dashboard_name,
      theme: data.theme,
      layout: data.layout as PublicDashboardPayload["data"] extends infer D
        ? D extends { layout?: infer L }
          ? L
          : never
        : never,
      owner_handle: data.owner_handle,
      owner_profile_pic: data.owner_profile_pic,
      tags: data.tags,
    },
  };
}

export { hydrateLayoutWithChartBundles };
