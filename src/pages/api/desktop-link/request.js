import dbConnect from "@/lib/dbConnect";
import DesktopLinkRequest from "@/models/DesktopLinkRequest";
import { extractClientMeta } from "@/lib/analytics/requestClientMeta";
import { parseNewsletterEmail } from "@/lib/newsletter/validate";
import { hashClientIp, hitRateLimit, isAllowedNewsletterOrigin, sanitizePagePath } from "@/lib/newsletter/server";
import { notifyDesktopLinkRequest } from "@/lib/telegram/trackEvent";

export const config = {
  api: { bodyParser: { sizeLimit: "2kb" } },
};

const TEN_MINUTES = 10 * 60_000;
const DAY = 24 * 60 * 60_000;
/** Humans fill a form in more than this; scripted posts usually don't. */
const MIN_FILL_MS = 800;
const NOTIFY_TIMEOUT_MS = 6000;

function reply(res, status, body) {
  res.setHeader("Cache-Control", "no-store");
  return res.status(status).json(body);
}

function rateLimited(res, retryAfterSec) {
  res.setHeader("Retry-After", String(retryAfterSec));
  return reply(res, 429, { ok: false, error: "rate_limited", retryAfterSec });
}

/** Stores a "send me a link for my desktop" request. Sending the email is handled separately. */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return reply(res, 405, { ok: false, error: "method_not_allowed" });
  }
  if (!String(req.headers["content-type"] || "").toLowerCase().startsWith("application/json")) {
    return reply(res, 415, { ok: false, error: "unsupported_media_type" });
  }
  if (!isAllowedNewsletterOrigin(req)) {
    return reply(res, 403, { ok: false, error: "forbidden" });
  }

  const meta = extractClientMeta(req);
  const ip = meta.client_ip || "unknown";
  const ipWait =
    hitRateLimit(`desktop-link:ip:10m:${ip}`, 5, TEN_MINUTES) || hitRateLimit(`desktop-link:ip:day:${ip}`, 20, DAY);
  if (ipWait) return rateLimited(res, ipWait);

  const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : null;
  if (!body) return reply(res, 400, { ok: false, error: "invalid_body" });

  // Honeypot / too-fast submissions get a normal-looking success so bots learn nothing.
  const elapsedMs = Number(body.elapsedMs);
  if ((typeof body.website === "string" && body.website !== "") || !(elapsedMs >= MIN_FILL_MS)) {
    return reply(res, 200, { ok: true });
  }

  const email = parseNewsletterEmail(body.email);
  if (!email) return reply(res, 400, { ok: false, error: "invalid_email" });

  const pagePath = sanitizePagePath(body.path);

  const globalWait = hitRateLimit("desktop-link:global", 120, TEN_MINUTES);
  if (globalWait) return rateLimited(res, globalWait);

  let isNew = false;
  try {
    await dbConnect();
    const now = new Date();
    const existing = await DesktopLinkRequest.findOneAndUpdate(
      { email },
      {
        $setOnInsert: {
          email,
          page_path: pagePath,
          country: meta.country || undefined,
          ip_hash: hashClientIp(meta.client_ip),
          user_agent: meta.user_agent ? meta.user_agent.slice(0, 300) : undefined,
        },
        $set: { status: "pending", last_requested_at: now },
        $inc: { request_count: 1 },
      },
      { upsert: true, new: false, runValidators: true },
    ).lean();
    isNew = !existing;
  } catch (err) {
    // Concurrent duplicate insert: the request is already recorded.
    if (err?.code !== 11000) {
      console.error("[desktop-link] request failed:", err?.message || err);
      return reply(res, 500, { ok: false, error: "server_error" });
    }
  }

  if (isNew && !hitRateLimit("desktop-link:telegram", 30, TEN_MINUTES)) {
    await Promise.race([
      notifyDesktopLinkRequest({ email, path: pagePath, geo: meta }).catch((err) =>
        console.warn("[desktop-link] telegram notify failed:", err?.message || err),
      ),
      new Promise((resolve) => setTimeout(resolve, NOTIFY_TIMEOUT_MS)),
    ]);
  }

  // Same response for new and repeat requests, so the endpoint can't be used to check addresses.
  return reply(res, 200, { ok: true });
}
