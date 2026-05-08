import AWS from "aws-sdk";
import mongoose from "mongoose";
import { getLoginSession } from "@/lib/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/Users";

function getBucket() {
  return process.env.CMS_S3_BUCKET || process.env.S3_BUCKET_NAME || "";
}

function getRegion() {
  return process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
}

function isSafeProfileKey(key, userId) {
  const k = String(key || "").replace(/^\/+/, "");
  const uid = String(userId || "");
  if (!k || !uid) return false;
  if (k.includes("..")) return false;
  if (!k.startsWith(`profile-pictures/${uid}/`)) return false;
  return true;
}

function extractKeyFromPublicUrl(publicUrl, bucket) {
  const url = String(publicUrl || "").trim();
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = String(u.host || "").toLowerCase();
    const b = String(bucket || "").toLowerCase();
    if (!b) return null;
    // Accept common S3 virtual-host styles.
    const isBucketHost =
      host === `${b}.s3.amazonaws.com` ||
      host.startsWith(`${b}.s3.`) && host.endsWith(".amazonaws.com");
    if (!isBucketHost) return null;
    const path = String(u.pathname || "").replace(/^\/+/, "");
    return path || null;
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", ["POST"]);
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }

  let session;
  try {
    session = await getLoginSession(req);
  } catch {
    session = null;
  }
  if (!session?.userId || String(session.userId) === "dev-bypass-no-db") {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }

  const uid = String(session.userId);
  if (!mongoose.Types.ObjectId.isValid(uid)) {
    return res.status(400).json({ success: false, message: "Invalid user" });
  }

  const { key, publicUrl } = req.body || {};
  if (!isSafeProfileKey(key, uid)) {
    return res.status(400).json({ success: false, message: "Invalid key (must be under profile-pictures/<uid>/...)." });
  }
  const url = String(publicUrl || "").trim();
  if (!/^https:\/\/.+/i.test(url)) {
    return res.status(400).json({ success: false, message: "Invalid publicUrl" });
  }

  await dbConnect();
  const bucket = getBucket();
  if (!bucket) {
    return res.status(503).json({ success: false, message: "Server missing CMS_S3_BUCKET (or S3_BUCKET_NAME)." });
  }

  const existing = await User.findById(uid);
  if (!existing) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  // Best-effort: delete the previous profile picture object (only if it is ours).
  const prevKey = extractKeyFromPublicUrl(existing.profile_pic, bucket);
  if (prevKey && isSafeProfileKey(prevKey, uid) && prevKey !== key) {
    const s3 = new AWS.S3({
      region: getRegion(),
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });
    try {
      await s3.deleteObject({ Bucket: bucket, Key: prevKey }).promise();
    } catch {
      // If deletion fails, continue — we still want to let the user update their avatar.
    }
  }

  const user = await User.findByIdAndUpdate(uid, { $set: { profile_pic: url } }, { new: true, runValidators: true });
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  return res.status(200).json({ success: true, data: { profile_pic: user.profile_pic } });
}

