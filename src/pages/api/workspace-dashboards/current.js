import dbConnect from "@/lib/dbConnect";
import { getLoginSession } from "@/lib/auth";
import WorkspaceDashboard from "@/models/WorkspaceDashboards";
import { emptyWorkspaceDashboard, sanitizeWorkspaceDashboard } from "@/lib/workspaceDashboardDocument";

async function sessionUserId(req) {
  try {
    const session = await getLoginSession(req);
    return session?.userId ? String(session.userId) : "";
  } catch {
    return "";
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const userId = await sessionUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

  try {
    await dbConnect();
  } catch {
    return res.status(503).json({ success: false, message: "Dashboard storage is unavailable." });
  }

  if (req.method === "GET") {
    const doc = await WorkspaceDashboard.findOne({ user_id: userId }).sort({ updatedAt: -1 }).lean();
    return res.status(200).json({ success: true, data: doc || null });
  }

  const existing = await WorkspaceDashboard.findOne({ user_id: userId }).sort({ updatedAt: -1 }).lean();
  if (existing) return res.status(200).json({ success: true, data: existing });

  const body = sanitizeWorkspaceDashboard(req.body || emptyWorkspaceDashboard());
  const created = await WorkspaceDashboard.create({ ...body, user_id: userId });
  return res.status(201).json({ success: true, data: created.toObject() });
}
