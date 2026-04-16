import dbConnect from "@/lib/dbConnect";
import { getLoginSession } from "@/lib/auth";
import { deleteAssetWithDependencies } from "@/lib/server/assetDependencies";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    res.setHeader("Allow", ["DELETE"]);
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  let session = null;
  try {
    session = await getLoginSession(req);
  } catch {
    session = null;
  }
  if (!session?.userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const type = String(req.body?.type || "").trim();
  const id = String(req.body?.id || "").trim();
  const deleteDownstream = !!req.body?.deleteDownstream;
  if (!type || !id) {
    return res.status(400).json({ success: false, message: "Missing type or id" });
  }

  await dbConnect();
  const result = await deleteAssetWithDependencies({
    type,
    id,
    userId: session.userId,
    deleteDownstream,
  });
  if (!result.ok) {
    return res.status(result.status || 400).json({ success: false, message: result.message || "Delete failed" });
  }
  return res.status(200).json({ success: true, ...result.data });
}
