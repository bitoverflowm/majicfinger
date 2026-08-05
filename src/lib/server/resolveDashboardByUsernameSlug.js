import dbConnect from "@/lib/dbConnect";
import ChartDashboard from "@/models/ChartDashboards";
import User from "@/models/Users";
import { getLoginSession } from "@/lib/auth";

/**
 * Resolve a dashboard by owner handle + slug.
 * Public dashboards are world-readable. Private published (slug set, is_public false)
 * are only visible to the logged-in owner.
 *
 * @param {string} username
 * @param {string} slug
 * @param {{
 *   req?: import("http").IncomingMessage;
 *   viewerUserId?: string | null;
 *   select?: string | Record<string, number> | null;
 * }} [opts]
 * @returns {Promise<{
 *   user: object;
 *   dash: object;
 *   isPublic: boolean;
 *   isPrivatePublished: boolean;
 *   viewerIsOwner: boolean;
 * } | null>}
 */
export async function resolveDashboardByUsernameSlug(username, slug, opts = {}) {
  const handle = String(username || "").trim();
  const publicSlug = String(slug || "").trim();
  if (!handle || !publicSlug) return null;

  await dbConnect();

  const user = await User.findOne({ user_name: handle }).lean();
  if (!user?._id) return null;

  const select = opts.select;
  let query = ChartDashboard.findOne({
    user_id: user._id,
    public_slug: publicSlug,
  });
  if (select) query = query.select(select);
  const dash = await query.lean();
  if (!dash) return null;

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

  const isPublic = !!dash.is_public;
  const viewerIsOwner = !!viewerUserId && String(dash.user_id) === String(viewerUserId);
  const isPrivatePublished = !isPublic && !!String(dash.public_slug || "").trim();

  if (!isPublic && !viewerIsOwner) {
    return null;
  }

  return {
    user,
    dash,
    isPublic,
    isPrivatePublished,
    viewerIsOwner,
  };
}

/**
 * Read the App Router login cookie (same token as Pages API getLoginSession).
 * @returns {Promise<string | null>}
 */
export async function getAppRouterViewerUserId() {
  try {
    const { cookies } = await import("next/headers");
    const Iron = (await import("@hapi/iron")).default;
    const cookieStore = await cookies();
    const token = cookieStore.get("loginSessionToken")?.value;
    if (!token || !process.env.TOKEN_SECRET) return null;
    const session = await Iron.unseal(token, process.env.TOKEN_SECRET, Iron.defaults);
    const expiresAt = Number(session?.createdAt) + Number(session?.maxAge || 0) * 1000;
    if (!session?.userId || !Number.isFinite(expiresAt) || Date.now() > expiresAt) {
      return null;
    }
    return String(session.userId);
  } catch {
    return null;
  }
}
