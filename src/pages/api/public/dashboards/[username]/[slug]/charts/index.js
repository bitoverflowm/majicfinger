import {
  buildPublicDashboardChartBundles,
  PUBLIC_DASHBOARD_LIGHT_SELECT,
  publicDashboardCacheControl,
} from "@/lib/server/publicDashboardHydration";
import { resolveDashboardByUsernameSlug } from "@/lib/server/resolveDashboardByUsernameSlug";

const MAX_IDS = 24;

/**
 * GET /api/public/dashboards/[username]/[slug]/charts?ids=a,b,c
 * Several chart payloads in one round trip, so the viewer can load above-the-fold
 * charts together instead of one request (and one dashboard lookup) per chart.
 */
export default async function handler(req, res) {
  const { username, slug } = req.query;

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const ids = String(req.query.ids || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_IDS);
  if (!ids.length) {
    return res.status(400).json({ success: false, message: "Missing ids" });
  }

  try {
    const resolved = await resolveDashboardByUsernameSlug(username, slug, {
      req,
      select: PUBLIC_DASHBOARD_LIGHT_SELECT,
    });
    if (!resolved) {
      return res.status(404).json({ success: false, message: "Dashboard not found" });
    }

    const { user, dash, isPublic } = resolved;
    const charts = await buildPublicDashboardChartBundles(dash, user, ids);

    res.setHeader(
      "Cache-Control",
      isPublic
        ? publicDashboardCacheControl(true, { liveBacked: !!dash.live_backed })
        : "private, no-store",
    );
    return res.status(200).json({ success: true, data: { charts } });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
}
