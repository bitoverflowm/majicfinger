import { isProdAnalyticsEnabled } from "@/lib/analytics/isProdAnalyticsEnabled";

const ALLOWED_EVENTS = new Set([
  "fork_click",
  "content_view",
  "content_leave",
  "page_view",
  "page_click",
  "hero_cta_click",
]);

/**
 * Legacy per-action Telegram endpoint.
 * Marketing actions are now batched into the visitor journey summary
 * (/api/analytics/journey session_end) — this route acknowledges but does not notify.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, message: "Method not allowed" });

  if (!isProdAnalyticsEnabled()) {
    return res.status(200).json({ ok: true, skipped: true, reason: "dev_disabled" });
  }

  let body = req.body;
  try {
    if (Buffer.isBuffer(body)) {
      body = JSON.parse(body.toString("utf8"));
    } else if (typeof body === "string") {
      body = JSON.parse(body);
    }
  } catch {
    return res.status(400).json({ ok: false, message: "Invalid JSON" });
  }

  const event = body?.event;
  if (!ALLOWED_EVENTS.has(event)) {
    return res.status(400).json({ ok: false, message: "Invalid event" });
  }

  return res.status(200).json({ ok: true, skipped: true, reason: "journey_summary_only" });
}
