import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import { requirePaidMember } from "@/lib/requirePaidMember";
import WorkspaceDashboard from "@/models/WorkspaceDashboards";
import { emptyWorkspaceDashboard, sanitizeWorkspaceDashboard } from "@/lib/workspaceDashboardDocument";
import {
  backfillLiveTabs,
  findProject,
  liveTabIds,
  PROJECT_KINDS,
  PROJECT_LIST_FIELDS,
  projectListItem,
  separateLegacyScopes,
  sessionUserId,
  validProjectId,
} from "@/lib/server/workspaceProjects";

const MAX_PROJECTS_LISTED = 200;

export const config = {
  api: { bodyParser: { sizeLimit: "16mb" } },
};

/**
 * GET lists the user's projects for the projects view. `?id=` or `?last=1` returns just that one
 * project's summary (or null), which is how the dashboard resolves which project to open.
 * POST creates a project; its browser storage is scoped to its own id.
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

  if (req.method === "GET") {
    await separateLegacyScopes(WorkspaceDashboard, userId);
    const id = validProjectId(req.query.id);
    if (!id && req.query.last !== "1") await backfillLiveTabs(WorkspaceDashboard, userId);
    if (id || req.query.last === "1") {
      const doc = await findProject(WorkspaceDashboard, userId, id).select(PROJECT_LIST_FIELDS).lean();
      return res.status(200).json({ success: true, data: doc ? projectListItem(doc) : null });
    }
    const docs = await WorkspaceDashboard.find({ user_id: userId })
      .sort({ updatedAt: -1 })
      .limit(MAX_PROJECTS_LISTED)
      .select(PROJECT_LIST_FIELDS)
      .lean();
    return res.status(200).json({ success: true, data: docs.map(projectListItem) });
  }

  const body = req.body && typeof req.body === "object" ? req.body : {};
  const draft = sanitizeWorkspaceDashboard({ ...emptyWorkspaceDashboard(), ...body });
  const _id = new mongoose.Types.ObjectId();
  const created = await WorkspaceDashboard.create({
    ...draft,
    _id,
    user_id: userId,
    kind: PROJECT_KINDS.includes(body.kind) ? body.kind : "dashboard",
    local_scope: String(_id),
    last_opened_at: new Date(),
    live_tabs: liveTabIds(draft.blocks),
  });
  return res.status(201).json({ success: true, data: projectListItem(created.toObject()) });
}
