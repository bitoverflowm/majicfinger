import zlib from "node:zlib";
import { promisify } from "util";

const gunzip = promisify(zlib.gunzip);

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return chunks.length ? Buffer.concat(chunks) : Buffer.alloc(0);
}

/**
 * Parses JSON from a Next.js API request. Supports optional gzip Content-Encoding
 * (used to stay under Vercel's ~4.5MB serverless body limit while Next.js allows 16MB).
 */
export async function parseJsonBodyMaybeGzip(req) {
  const rawBody = await readRawBody(req);
  if (!rawBody.length) return {};
  const encoding = String(req.headers["content-encoding"] || "").toLowerCase();
  let payload = rawBody;
  if (encoding === "gzip" || encoding === "x-gzip") {
    payload = await gunzip(rawBody);
  }
  const text = payload.toString("utf8");
  if (!text) return {};
  return JSON.parse(text);
}
