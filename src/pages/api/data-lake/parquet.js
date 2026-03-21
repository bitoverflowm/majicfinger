/**
 * Same-origin Parquet bytes for DuckDB-WASM (private S3).
 *
 * Server uses AWS credentials — browser never needs public objects.
 *
 * Env (server):
 *   DATA_LAKE_S3_BUCKET       — e.g. becker
 *   DATA_LAKE_S3_KEY_PREFIX   — e.g. becker/data/polymarket (no trailing slash)
 *   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
 *
 * Client enables proxy with NEXT_PUBLIC_DATA_LAKE_USE_S3_PROXY=true
 */
import AWS from "aws-sdk";

function getBucket() {
  return process.env.DATA_LAKE_S3_BUCKET || process.env.S3_BUCKET_NAME || "";
}

function getKeyPrefix() {
  return String(process.env.DATA_LAKE_S3_KEY_PREFIX || "").replace(/\/+$/, "");
}

/** @param {string} pathParam */
function validateRelativePath(pathParam) {
  if (!pathParam || typeof pathParam !== "string") return null;
  const decoded = decodeURIComponent(pathParam.trim()).replace(/^\/+/, "");
  if (decoded.includes("..")) return null;
  if (!decoded.endsWith(".parquet")) return null;
  const parts = decoded.split("/").filter(Boolean);
  if (parts.length < 1) return null;
  for (const p of parts) {
    if (p.startsWith(".")) return null;
  }
  return decoded;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", ["GET"]);
    return res.status(405).json({ message: "Method not allowed" });
  }

  const bucket = getBucket();
  if (!bucket) {
    return res.status(503).json({
      message: "Server missing DATA_LAKE_S3_BUCKET (or S3_BUCKET_NAME).",
    });
  }

  const raw = req.query.path;
  const pathParam = Array.isArray(raw) ? raw[0] : raw;
  const rel = validateRelativePath(pathParam || "");
  if (!rel) {
    return res.status(400).json({ message: "Invalid or missing path (expect …/file.parquet, no ..)." });
  }

  const prefix = getKeyPrefix();
  const key = prefix ? `${prefix}/${rel}` : rel;

  const s3 = new AWS.S3({
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  });

  try {
    const data = await s3.getObject({ Bucket: bucket, Key: key }).promise();
    const body = data.Body;
    if (!body) {
      return res.status(404).json({ message: "Empty object" });
    }
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Cache-Control", "private, max-age=120");
    if (data.ContentLength != null) {
      res.setHeader("Content-Length", String(data.ContentLength));
    }
    return res.status(200).send(body);
  } catch (e) {
    const code = e?.code || e?.statusCode;
    if (code === "NoSuchKey" || code === "NotFound") {
      return res.status(404).json({ message: "Object not found", key });
    }
    if (code === "AccessDenied" || code === 403 || code === "Forbidden") {
      return res.status(403).json({ message: "S3 access denied — check IAM for s3:GetObject on this key.", key });
    }
    return res.status(500).json({ message: e?.message || "S3 error" });
  }
}
