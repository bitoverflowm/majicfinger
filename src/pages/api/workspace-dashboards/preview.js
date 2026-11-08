import dbConnect from "@/lib/dbConnect";
import WorkspaceDashboard from "@/models/WorkspaceDashboards";
import { findProject, sessionUserId } from "@/lib/server/workspaceProjects";

/** Read-only copy of one of the signed-in user's projects (`?project=id`, else the one opened last). Not a public publish URL. */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const userId = await sessionUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

  try {
    await dbConnect();
  } catch {
    return res.status(503).json({ success: false, message: "Dashboard storage is unavailable." });
  }

  const doc = await findProject(WorkspaceDashboard, userId, req.query.project).lean();
  if (!doc) return res.status(404).json({ success: false, message: "Dashboard not found" });
  return res.status(200).json({ success: true, data: doc });
}
