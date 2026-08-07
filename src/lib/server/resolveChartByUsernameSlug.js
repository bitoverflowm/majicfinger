import dbConnect from "@/lib/dbConnect";
import Chart from "@/models/Charts";
import User from "@/models/Users";
import { getLoginSession } from "@/lib/auth";

/**
 * Resolve a chart by owner handle + public_slug.
 * Public charts are world-readable. Private published (slug set, is_public false)
 * are only visible to the logged-in owner.
 *
 * @param {string} username
 * @param {string} slug
 * @param {{
 *   req?: import("http").IncomingMessage;
 *   viewerUserId?: string | null;
 *   select?: string | Record<string, number> | null;
 * }} [opts]
 */
export async function resolveChartByUsernameSlug(username, slug, opts = {}) {
  const handle = String(username || "").trim();
  const publicSlug = String(slug || "").trim();
  if (!handle || !publicSlug) return null;

  await dbConnect();

  const user = await User.findOne({ user_name: handle }).lean();
  if (!user?._id) return null;

  const select = opts.select;
  let query = Chart.findOne({
    user_id: user._id,
    public_slug: publicSlug,
  });
  if (select) query = query.select(select);
  const chart = await query.lean();
  if (!chart) return null;

  let viewerUserId =
    opts.viewerUserId != null && String(opts.viewerUserId).trim()
      ? String(opts.viewerUserId).trim()
      : null;
  if (!viewerUserId && opts.req) {
    try {
      const session = await getLoginSession(opts.req);
      if (session?.userId) viewerUserId = String(session.userId);
    } catch {
      viewerUserId = null;
    }
  }

  const isPublic = !!chart.is_public;
  const viewerIsOwner = !!viewerUserId && String(chart.user_id) === String(viewerUserId);
  const isPrivatePublished = !isPublic && !!String(chart.public_slug || "").trim();

  if (!isPublic && !viewerIsOwner) {
    return null;
  }

  return {
    user,
    chart,
    isPublic,
    isPrivatePublished,
    viewerIsOwner,
  };
}
