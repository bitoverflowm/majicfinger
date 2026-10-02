import dbConnect from "@/lib/dbConnect";
import { getLoginSession } from "@/lib/auth";
import WorkspaceDashboard from "@/models/WorkspaceDashboards";

async function sessionUserId(req) {
  try {
    const session = await getLoginSession(req);
    return session?.userId ? String(session.userId) : "";
  } catch {
    return "";
  }
}

/** Read-only copy of the signed-in user's dashboard. Not a public publish URL. */
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

  const doc = await WorkspaceDashboard.findOne({ user_id: userId }).sort({ updatedAt: -1 }).lean();
  if (!doc) return res.status(404).json({ success: false, message: "Dashboard not found" });
  return res.status(200).json({ success: true, data: doc });
}
