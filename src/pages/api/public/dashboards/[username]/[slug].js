import {
  buildPublicDashboardResponseData,
  PUBLIC_DASHBOARD_LIGHT_SELECT,
  publicDashboardCacheControl,
} from "@/lib/server/publicDashboardHydration";
import { resolveDashboardByUsernameSlug } from "@/lib/server/resolveDashboardByUsernameSlug";

export default async function handler(req, res) {
  const { username, slug } = req.query;

  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  // `?part=cardGrids` returns layout + card grid rows only (no chart data); charts load
  // separately through the batched charts endpoint.
  const cardGridsOnly = req.query.part === "cardGrids";

  try {
    const resolved = await resolveDashboardByUsernameSlug(username, slug, {
      req,
      ...(cardGridsOnly
        ? {
            select: `${PUBLIC_DASHBOARD_LIGHT_SELECT} page_heading page_subheading dashboard_name theme tags card_grid_snapshots`,
          }
        : {}),
    });
    if (!resolved) {
      return res.status(404).json({ success: false, message: "Dashboard not found" });
    }

    const { user, dash, isPublic } = resolved;
    const data = await buildPublicDashboardResponseData(dash, user, { includeCharts: !cardGridsOnly });
    const cacheHit = !!data._cacheHit;
    const liveBacked = !!data.live_backed;
    delete data._cacheHit;
    data.is_public = isPublic;
    data.is_private_published = !isPublic;

    res.setHeader(
      "Cache-Control",
      isPublic
        ? publicDashboardCacheControl(cacheHit, { liveBacked })
        : "private, no-store",
    );
    return res.status(200).json({ success: true, data });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message || "Server error" });
  }
}
