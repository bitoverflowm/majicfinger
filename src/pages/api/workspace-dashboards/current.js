import dbConnect from "@/lib/dbConnect";
import { getLoginSession } from "@/lib/auth";
import { requirePaidMember } from "@/lib/requirePaidMember";
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

/** Tab ids go into a Mongo field path, so dots and dollars must never reach it. */
const TAB_ID = /^[A-Za-z0-9_-]{1,80}$/;

export const config = {
  api: { bodyParser: { sizeLimit: "16mb" } },
};

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
    const tab = String(req.query.tab || "").trim();
    if (TAB_ID.test(tab)) {
      const blocksOnly = req.query.part === "1";
      const head = await WorkspaceDashboard.findOne({ user_id: userId })
        .sort({ updatedAt: -1 })
        .select(blocksOnly ? { blocks: 0, tables: 0, charts: 0 } : { blocks: 0 })
        .lean();
      if (!head) return res.status(200).json({ success: true, data: null });
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
    const doc = await WorkspaceDashboard.findOne({ user_id: userId }).sort({ updatedAt: -1 }).lean();
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

  const existing = await WorkspaceDashboard.findOne({ user_id: userId }).sort({ updatedAt: -1 }).lean();
  if (existing) return res.status(200).json({ success: true, data: existing });

  const body = sanitizeWorkspaceDashboard(req.body || emptyWorkspaceDashboard());
  const created = await WorkspaceDashboard.create({ ...body, user_id: userId });
  return res.status(201).json({ success: true, data: created.toObject() });
}
