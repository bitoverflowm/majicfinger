import { extractClientMeta } from "@/lib/analytics/requestClientMeta";

/**
 * Lightweight in-memory sliding-window rate limiter for unauthenticated API routes.
 * Protects shared Kalshi egress IP from anonymous/bot abuse. Process-local only
 * (fine for single-instance / soft protection; not a distributed limit).
 */

/** @type {Map<string, number[]>} */
const buckets = new Map();

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX = 30;
const BUCKET_MAX_KEYS = 5_000;

/**
 * @param {import('next').NextApiRequest | { headers?: Record<string, string | string[] | undefined>; socket?: { remoteAddress?: string } }} req
 * @param {{
 *   keyPrefix?: string;
 *   max?: number;
 *   windowMs?: number;
 * }} [opts]
 * @returns {{ ok: true } | { ok: false; retryAfterSec: number }}
 */
export function checkAnonymousIpRateLimit(req, opts = {}) {
  const max = Math.max(1, Math.floor(Number(opts.max) || DEFAULT_MAX));
  const windowMs = Math.max(1_000, Math.floor(Number(opts.windowMs) || DEFAULT_WINDOW_MS));
  const prefix = String(opts.keyPrefix || "anon").trim() || "anon";

  const { client_ip: clientIp } = extractClientMeta(req);
  const ip = clientIp || "unknown";
  const key = `${prefix}:${ip}`;
  const now = Date.now();
  const cutoff = now - windowMs;

  let stamps = buckets.get(key);
  if (!stamps) {
    stamps = [];
    buckets.set(key, stamps);
  }

  // Drop expired timestamps.
  while (stamps.length && stamps[0] < cutoff) stamps.shift();

  if (stamps.length >= max) {
    const retryAfterSec = Math.max(1, Math.ceil((stamps[0] + windowMs - now) / 1000));
    return { ok: false, retryAfterSec };
  }

  stamps.push(now);

  if (buckets.size > BUCKET_MAX_KEYS) {
    // Evict arbitrary oldest-inserted key to bound memory.
    const first = buckets.keys().next().value;
    if (first) buckets.delete(first);
  }

  return { ok: true };
}

/**
 * Apply rate limit to a Pages API handler response when over quota.
 * @param {import('next').NextApiRequest} req
 * @param {import('next').NextApiResponse} res
 * @param {{ keyPrefix?: string; max?: number; windowMs?: number; message?: string }} [opts]
 * @returns {boolean} true if the request was rejected (caller should return)
 */
export function rejectIfAnonymousRateLimited(req, res, opts = {}) {
  const result = checkAnonymousIpRateLimit(req, opts);
  if (result.ok) return false;

  res.setHeader("Retry-After", String(result.retryAfterSec));
  res.status(429).json({
    error:
      opts.message ||
      "Too many requests. Please wait a moment and try again.",
    retryAfterSec: result.retryAfterSec,
  });
  return true;
}
