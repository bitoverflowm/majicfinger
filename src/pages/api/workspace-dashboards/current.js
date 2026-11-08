import dbConnect from "@/lib/dbConnect";
import { requirePaidMember } from "@/lib/requirePaidMember";
import WorkspaceDashboard from "@/models/WorkspaceDashboards";
import { emptyWorkspaceDashboard, sanitizeWorkspaceDashboard } from "@/lib/workspaceDashboardDocument";
import { findProject, liveTabIds, markProjectOpened, sessionUserId } from "@/lib/server/workspaceProjects";

/** Tab ids go into a Mongo field path, so dots and dollars must never reach it. */
const TAB_ID = /^[A-Za-z0-9_-]{1,80}$/;

export const config = {
  api: { bodyParser: { sizeLimit: "16mb" } },
};

/**
 * GET loads one project (`?project=id`, else the one opened last), one tab of blocks at a time.
 * POST creates the user's first project and is a no-op once they have one; more projects are
 * created through `/api/workspace-dashboards`.
 */
export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const userId = await sessionUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
  if (req.method !== "GET" && !(await requirePaidMember(req, res, { allowFreeRun: true }))) return;

  try {
    await dbConnect();
  } catch {
    return res.status(503).json({ success: false, message: "Dashboard storage is unavailable." });
  }

  const projectId = req.query.project;

  if (req.method === "GET") {
    const tab = String(req.query.tab || "").trim();
    const blocksOnly = req.query.part === "1";
    if (TAB_ID.test(tab)) {
      const head = await findProject(WorkspaceDashboard, userId, projectId)
        .select(blocksOnly ? { blocks: 0, tables: 0, charts: 0 } : { blocks: 0 })
        .lean();
      if (!head) return res.status(200).json({ success: true, data: null });
      if (!blocksOnly) await markProjectOpened(WorkspaceDashboard, head._id);
      const [part] = await WorkspaceDashboard.aggregate([
        { $match: { _id: head._id } },
        {
          $project: {
            list: `$blocks.${tab}`,
            keys: { $map: { input: { $objectToArray: { $ifNull: ["$blocks", {}] } }, as: "entry", in: "$$entry.k" } },
          },
        },
      ]);
      return res.status(200).json({
        success: true,
        data: {
          ...head,
          blocks: Array.isArray(part?.list) ? { [tab]: part.list } : {},
          pending_tabs: (part?.keys || []).filter((id) => id !== tab),
        },
      });
    }
    const doc = await findProject(WorkspaceDashboard, userId, projectId).lean();
    if (doc) await markProjectOpened(WorkspaceDashboard, doc._id);
    if (!doc || !tab) return res.status(200).json({ success: true, data: doc || null });
    const all = doc.blocks && typeof doc.blocks === "object" ? doc.blocks : {};
    return res.status(200).json({
      success: true,
      data: {
        ...doc,
        blocks: all[tab] ? { [tab]: all[tab] } : {},
        pending_tabs: Object.keys(all).filter((id) => id !== tab),
      },
    });
  }

  const existing = await findProject(WorkspaceDashboard, userId, projectId).lean();
  if (existing) return res.status(200).json({ success: true, data: existing });
  if (projectId) return res.status(404).json({ success: false, message: "Project not found" });

  const body = sanitizeWorkspaceDashboard(req.body || emptyWorkspaceDashboard());
  const created = await WorkspaceDashboard.create({
    ...body,
    user_id: userId,
    last_opened_at: new Date(),
    live_tabs: liveTabIds(body.blocks),
  });
  const { thumbnail: _thumbnail, ...data } = created.toObject();
  return res.status(201).json({ success: true, data });
}
