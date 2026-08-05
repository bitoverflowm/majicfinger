import {
  buildPublicDashboardChartBundle,
  publicDashboardCacheControl,
} from "@/lib/server/publicDashboardHydration";
import { resolveDashboardByUsernameSlug } from "@/lib/server/resolveDashboardByUsernameSlug";

export default async function handler(req, res) {
  const { username, slug, chartId } = req.query;

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const resolved = await resolveDashboardByUsernameSlug(username, slug, { req });
    if (!resolved) {
      return res.status(404).json({ success: false, message: "Dashboard not found" });
    }

    const { user, dash, isPublic } = resolved;
    const result = await buildPublicDashboardChartBundle(dash, user, chartId);
    if (!result.success) {
      return res.status(result.message === "Chart not on this dashboard" ? 404 : 400).json(result);
    }

    const cacheHit = !!result.data?._cacheHit;
    if (result.data) delete result.data._cacheHit;

    res.setHeader(
      "Cache-Control",
      isPublic
        ? publicDashboardCacheControl(cacheHit, { liveBacked: !!dash.live_backed })
        : "private, no-store",
    );
    return res.status(200).json(result);
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
}
