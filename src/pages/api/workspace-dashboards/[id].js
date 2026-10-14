import mongoose from "mongoose";
import dbConnect from "@/lib/dbConnect";
import { getLoginSession } from "@/lib/auth";
import WorkspaceDashboard from "@/models/WorkspaceDashboards";
import { sanitizeWorkspaceDashboard } from "@/lib/workspaceDashboardDocument";

async function sessionUserId(req) {
  try {
    const session = await getLoginSession(req);
    return session?.userId ? String(session.userId) : "";
  } catch {
    return "";
  }
}

export const config = {
  api: { bodyParser: { sizeLimit: "16mb" } },
};

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "PUT") {
    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const userId = await sessionUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });

  const id = String(req.query.id || "");
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ success: false, message: "Invalid dashboard id" });
  }

  try {
    await dbConnect();
  } catch {
    return res.status(503).json({ success: false, message: "Dashboard storage is unavailable." });
  }
  const doc = await WorkspaceDashboard.findOne({ _id: id, user_id: userId });
  if (!doc) return res.status(404).json({ success: false, message: "Dashboard not found" });

  if (req.method === "GET") return res.status(200).json({ success: true, data: doc.toObject() });

  const loadedTabs = Array.isArray(req.body?.loaded_tabs)
    ? req.body.loaded_tabs.map((tabId) => String(tabId || "").trim()).filter(Boolean)
    : null;
  const next = sanitizeWorkspaceDashboard(req.body || {});
  if (loadedTabs) {
    const existing = doc.toObject().blocks || {};
    const merged = { ...existing };
    const incoming = next.blocks || {};
    for (const tabId of loadedTabs) {
      if (incoming[tabId]) merged[tabId] = incoming[tabId];
      else delete merged[tabId];
    }
    next.blocks = merged;
  }
  doc.set(next);
  await doc.save();
  return res.status(200).json({ success: true, data: doc.toObject() });
}
