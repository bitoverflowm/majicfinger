import dbConnect from "@/lib/dbConnect";
import NewsletterSubscriber, { NEWSLETTER_SOURCES } from "@/models/NewsletterSubscriber";
import { extractClientMeta } from "@/lib/analytics/requestClientMeta";
import { parseNewsletterEmail } from "@/lib/newsletter/validate";
import {
  createUnsubscribeToken,
  hashClientIp,
  hitRateLimit,
  isAllowedNewsletterOrigin,
  sanitizePagePath,
} from "@/lib/newsletter/server";
import { notifyNewsletterSignup } from "@/lib/telegram/trackEvent";

export const config = {
  api: { bodyParser: { sizeLimit: "2kb" } },
};

const SOURCES = new Set(NEWSLETTER_SOURCES);
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
    hitRateLimit(`newsletter:ip:10m:${ip}`, 5, TEN_MINUTES) ||
    hitRateLimit(`newsletter:ip:day:${ip}`, 20, DAY);
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

  const source = SOURCES.has(body.source) ? body.source : "inline";
  const pagePath = sanitizePagePath(body.path);

  const globalWait = hitRateLimit("newsletter:global", 120, TEN_MINUTES);
  if (globalWait) return rateLimited(res, globalWait);

  let isNew = false;
  let resubscribed = false;
  try {
    await dbConnect();
    const existing = await NewsletterSubscriber.findOneAndUpdate(
      { email },
      {
        $setOnInsert: {
          email,
          status: "subscribed",
          source,
          page_path: pagePath,
          country: meta.country || undefined,
          ip_hash: hashClientIp(meta.client_ip),
          user_agent: meta.user_agent ? meta.user_agent.slice(0, 300) : undefined,
          unsubscribe_token: createUnsubscribeToken(),
          subscribed_at: new Date(),
        },
      },
      { upsert: true, new: false, runValidators: true },
    ).lean();

    if (!existing) {
      isNew = true;
    } else if (existing.status === "unsubscribed") {
      await NewsletterSubscriber.updateOne(
        { _id: existing._id, status: "unsubscribed" },
        { $set: { status: "subscribed", subscribed_at: new Date() }, $unset: { unsubscribed_at: 1 } },
      );
      resubscribed = true;
    }
  } catch (err) {
    // Concurrent duplicate insert: the address is already on the list.
    if (err?.code !== 11000) {
      console.error("[newsletter] subscribe failed:", err?.message || err);
      return reply(res, 500, { ok: false, error: "server_error" });
    }
  }

  if ((isNew || resubscribed) && !hitRateLimit("newsletter:telegram", 30, TEN_MINUTES)) {
    await Promise.race([
      notifyNewsletterSignup({ email, source, path: pagePath, resubscribed, geo: meta }).catch((err) =>
        console.warn("[newsletter] telegram notify failed:", err?.message || err),
      ),
      new Promise((resolve) => setTimeout(resolve, NOTIFY_TIMEOUT_MS)),
    ]);
  }

  // Same response for new and existing addresses, so the endpoint can't be used to check who is subscribed.
  return reply(res, 200, { ok: true });
}
