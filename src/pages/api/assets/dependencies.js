import dbConnect from "@/lib/dbConnect";
import { getLoginSession } from "@/lib/auth";
import { analyzeAssetDependencies } from "@/lib/server/assetDependencies";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
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

  const type = String(req.query?.type || "").trim();
  const id = String(req.query?.id || "").trim();
  if (!type || !id) {
    return res.status(400).json({ success: false, message: "Missing type or id" });
  }

  await dbConnect();
  const result = await analyzeAssetDependencies({ type, id, userId: session.userId });
  if (!result.ok) {
    return res.status(result.status || 400).json({ success: false, message: result.message || "Failed to analyze dependencies" });
  }
  return res.status(200).json({ success: true, ...result.data });
}
