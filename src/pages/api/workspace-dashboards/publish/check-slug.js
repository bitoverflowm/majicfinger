import dbConnect from "@/lib/dbConnect";
import WorkspacePublication from "@/models/WorkspacePublications";
import { sessionUserId, validProjectId } from "@/lib/server/workspaceProjects";
import { normalizePublishSlug, publishSlugProblem } from "@/lib/workspacePublish";

/** Whether `?slug=` is free among the signed-in user's published addresses, ignoring `?project=`'s own. */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }
  const userId = await sessionUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

  const slug = normalizePublishSlug(req.query.slug);
  const problem = publishSlugProblem(slug);
  if (problem) return res.status(200).json({ success: true, data: { slug, available: false, message: problem } });

  try {
    await dbConnect();
  } catch {
    return res.status(503).json({ success: false, message: "Couldn't check that address." });
  }
  const project = validProjectId(req.query.project);
  const clash = await WorkspacePublication.findOne({ user_id: userId, slug, ...(project ? { project_id: { $ne: project } } : {}) })
    .select("_id")
    .lean();
  return res.status(200).json({
    success: true,
    data: { slug, available: !clash, message: clash ? "Another of your projects uses that address." : "" },
  });
}
