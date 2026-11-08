import dbConnect from "@/lib/dbConnect";
import { requirePaidMember } from "@/lib/requirePaidMember";
import WorkspaceDashboard from "@/models/WorkspaceDashboards";
import { sessionUserId, validProjectId } from "@/lib/server/workspaceProjects";

const DATA_URL = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/;
const MAX_DATA_URL = 400_000;

export const config = {
  api: { bodyParser: { sizeLimit: "1mb" } },
};

/** The picture of a project shown on its card in the projects view. Owner-only; never public. */
export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "PUT") {
    res.setHeader("Allow", "GET, PUT");
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  const userId = await sessionUserId(req);
  if (!userId) return res.status(401).json({ success: false, message: "Unauthorized" });
  if (req.method === "PUT" && !(await requirePaidMember(req, res, { allowFreeRun: true }))) return;

  const id = validProjectId(req.query.id);
  if (!id) return res.status(400).json({ success: false, message: "Invalid project id" });

  try {
    await dbConnect();
  } catch {
    return res.status(503).json({ success: false, message: "Dashboard storage is unavailable." });
  }

  if (req.method === "GET") {
    const doc = await WorkspaceDashboard.findOne({ _id: id, user_id: userId }).select("+thumbnail thumbnail_at").lean();
    const match = DATA_URL.exec(doc?.thumbnail || "");
    if (!match) return res.status(404).end();
    res.setHeader("Content-Type", `image/${match[1]}`);
    res.setHeader("Cache-Control", "private, max-age=31536000, immutable");
    return res.status(200).send(Buffer.from(match[2], "base64"));
  }

  const image = typeof req.body?.image === "string" ? req.body.image : "";
  if (!DATA_URL.test(image) || image.length > MAX_DATA_URL) {
    return res.status(400).json({ success: false, message: "Thumbnail must be a small JPEG, PNG, or WebP data URL." });
  }
  const at = new Date();
  const { matchedCount } = await WorkspaceDashboard.updateOne(
    { _id: id, user_id: userId },
    { $set: { thumbnail: image, thumbnail_at: at } },
    { timestamps: false },
  );
  if (!matchedCount) return res.status(404).json({ success: false, message: "Project not found" });
  return res.status(200).json({ success: true, data: { thumbnailAt: at } });
}
