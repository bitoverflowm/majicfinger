import crypto from "crypto";

const SITE_ORIGINS = new Set(
  [
    "https://lycheedata.com",
    "https://www.lycheedata.com",
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NODE_ENV === "production" ? null : "http://localhost:3000",
  ]
    .filter(Boolean)
    .map((url) => {
      try {
        return new URL(url).origin;
      } catch {
        return null;
      }
    })
    .filter(Boolean),
);

/**
 * Browser-only endpoint: require a same-site Origin so other sites can't post on a visitor's behalf.
 * @param {import('next').NextApiRequest} req
 */
export function isAllowedNewsletterOrigin(req) {
  if (req.headers["sec-fetch-site"] === "cross-site") return false;
  const origin = req.headers.origin;
  if (typeof origin !== "string" || !origin) return false;
  let url;
  try {
    url = new URL(origin);
  } catch {
    return false;
  }
  if (SITE_ORIGINS.has(url.origin)) return true;
  const host = req.headers.host;
  return typeof host === "string" && url.host === host;
}

/** @type {Map<string, number[]>} */
const windows = new Map();
const MAX_KEYS = 5_000;

/**
 * Process-local sliding window. Returns seconds to wait, or 0 when the hit is allowed.
 * @param {string} key
 * @param {number} max
 * @param {number} windowMs
 */
export function hitRateLimit(key, max, windowMs) {
  const now = Date.now();
  let stamps = windows.get(key);
  if (!stamps) {
    if (windows.size >= MAX_KEYS) windows.delete(windows.keys().next().value);
    stamps = [];
    windows.set(key, stamps);
  }
  while (stamps.length && stamps[0] <= now - windowMs) stamps.shift();
  if (stamps.length >= max) return Math.max(1, Math.ceil((stamps[0] + windowMs - now) / 1000));
  stamps.push(now);
  return 0;
}

/** @param {string} ip */
export function hashClientIp(ip) {
  if (!ip) return undefined;
  const salt = process.env.TOKEN_SECRET || "lychee-newsletter";
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export function createUnsubscribeToken() {
  return crypto.randomBytes(24).toString("base64url");
}

/** @param {unknown} value */
export function sanitizePagePath(value) {
  if (typeof value !== "string") return undefined;
  const path = value.split(/[?#]/)[0].trim();
  if (!path.startsWith("/") || path.startsWith("//")) return undefined;
  if (!/^[\w\-./~%@]*$/.test(path)) return undefined;
  return path.slice(0, 200);
}
