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

function inferExtension(contentType) {
  const ct = String(contentType || "").toLowerCase().trim();
  if (ct === "image/jpeg" || ct === "image/jpg") return "jpg";
  if (ct === "image/png") return "png";
  if (ct === "image/webp") return "webp";
  return null;
}

function randomId(len = 16) {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  for (let i = 0; i < len; i += 1) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function s3PublicUrl({ bucket, region, key }) {
  const safeKey = String(key || "").replace(/^\/+/, "");
  if (!safeKey) return null;
  if (!bucket) return null;
  // us-east-1 supports the global endpoint; other regions typically use the regional host.
  const host = region && region !== "us-east-1" ? `${bucket}.s3.${region}.amazonaws.com` : `${bucket}.s3.amazonaws.com`;
  return `https://${host}/${encodeURIComponent(safeKey).replace(/%2F/g, "/")}`;
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

  const bucket = getBucket();
  if (!bucket) {
    return res.status(503).json({ success: false, message: "Server missing CMS_S3_BUCKET (or S3_BUCKET_NAME)." });
  }

  const { contentType, contentLength } = req.body || {};
  const ext = inferExtension(contentType);
  if (!ext) {
    return res.status(400).json({ success: false, message: "Unsupported contentType (use image/jpeg, image/png, or image/webp)." });
  }

  const len = Number(contentLength);
  const maxBytes = 5 * 1024 * 1024; // 5MB
  if (!Number.isFinite(len) || len <= 0 || len > maxBytes) {
    return res.status(400).json({ success: false, message: "Invalid file size (max 5MB)." });
  }

  await dbConnect();
  const dbUser = await User.findById(uid);
  if (!dbUser) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  const region = getRegion();
  const s3 = new AWS.S3({
    region,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    signatureVersion: "v4",
  });

  const key = `profile-pictures/${uid}/${Date.now()}-${randomId(10)}.${ext}`;
  const publicUrl = s3PublicUrl({ bucket, region, key });

  const params = {
    Bucket: bucket,
    Key: key,
    ContentType: String(contentType),
    Expires: 60,
  };

  try {
    const uploadUrl = await s3.getSignedUrlPromise("putObject", params);
    return res.status(200).json({
      success: true,
      data: {
        bucket,
        key,
        publicUrl,
        uploadUrl,
        contentType: String(contentType),
        expiresInSeconds: 60,
      },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e?.message || "Failed to presign upload" });
  }
}

