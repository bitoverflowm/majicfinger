import {
  notifyContentLeave,
  notifyContentView,
  notifyForkClick,
  notifyHeroCtaClick,
  notifyPageClick,
  notifyPageView,
} from "@/lib/telegram/trackEvent";
import { extractClientMeta } from "@/lib/analytics/requestClientMeta";

const ALLOWED_EVENTS = new Set([
  "fork_click",
  "content_view",
  "content_leave",
  "page_view",
  "page_click",
  "hero_cta_click",
]);

/** @param {import('next').NextApiRequest} req */
function parseJsonBody(req) {
  let body = req.body;
  if (Buffer.isBuffer(body)) {
    body = JSON.parse(body.toString("utf8"));
  } else if (typeof body === "string") {
    body = JSON.parse(body);
  }
  return body || {};
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, message: "Method not allowed" });

  let body;
  try {
    body = parseJsonBody(req);
  } catch {
    return res.status(400).json({ ok: false, message: "Invalid JSON" });
  }

  const { event, payload = {}, sessionId } = body;
  const geo = extractClientMeta(req);

  if (!ALLOWED_EVENTS.has(event)) {
    return res.status(400).json({ ok: false, message: "Invalid event" });
  }

  try {
    if (event === "fork_click") {
      const result = await notifyForkClick({
        kind: payload.kind || "chart",
        displayName: payload.displayName,
        ownerHandle: payload.ownerHandle,
        chartSlug: payload.chartSlug,
        dashboardSlug: payload.dashboardSlug,
        isLoggedIn: !!payload.isLoggedIn,
        userEmail: payload.userEmail,
        geo,
      });
      return res.status(200).json(result);
    }

    if (event === "content_view") {
      if (!payload?.name || !payload?.contentType) {
        return res.status(400).json({ ok: false, message: "Missing name or contentType" });
      }
      const result = await notifyContentView({
        contentType: payload.contentType,
        name: payload.name,
        path: payload.path,
        ownerHandle: payload.ownerHandle,
        geo,
      });
      return res.status(200).json(result);
    }

    if (event === "page_view") {
      if (!payload?.pageName || !payload?.pageType) {
        return res.status(400).json({ ok: false, message: "Missing pageName or pageType" });
      }
      const result = await notifyPageView({
        pageType: payload.pageType,
        pageName: payload.pageName,
        path: payload.path,
        geo,
      });
      return res.status(200).json(result);
    }

    if (event === "page_click") {
      if (!payload?.pageName || !payload?.pageType || !payload?.label) {
        return res.status(400).json({ ok: false, message: "Missing pageName, pageType, or label" });
      }
      const result = await notifyPageClick({
        pageType: payload.pageType,
        pageName: payload.pageName,
        path: payload.path,
        label: payload.label,
        targetType: payload.targetType,
        href: payload.href,
        section: payload.section,
        geo,
      });
      return res.status(200).json(result);
    }

    if (event === "hero_cta_click") {
      if (!payload?.eventLabel || !payload?.buttonText) {
        return res.status(400).json({ ok: false, message: "Missing eventLabel or buttonText" });
      }
      const result = await notifyHeroCtaClick({
        eventLabel: payload.eventLabel,
        buttonText: payload.buttonText,
        href: payload.href,
        page: payload.page,
        pagePath: payload.pagePath,
        destination: payload.destination,
        userState: payload.userState,
        sessionId: payload.sessionId || sessionId,
        referrer: payload.referrer,
        userEmail: payload.userEmail,
        isLoggedIn: !!payload.isLoggedIn,
        geo,
      });
      return res.status(200).json(result);
    }

    if (event === "content_leave") {
      if (!payload?.name || !payload?.contentType) {
        return res.status(400).json({ ok: false, message: "Missing name or contentType" });
      }
      const dedupeKey = sessionId ? `leave:${sessionId}` : null;
      if (dedupeKey && global.__telegramLeaveDedupe?.has(dedupeKey)) {
        return res.status(200).json({ ok: true, deduped: true });
      }
      if (dedupeKey) {
        if (!global.__telegramLeaveDedupe) global.__telegramLeaveDedupe = new Set();
        global.__telegramLeaveDedupe.add(dedupeKey);
        if (global.__telegramLeaveDedupe.size > 5000) {
          global.__telegramLeaveDedupe.clear();
        }
      }
      const result = await notifyContentLeave({
        contentType: payload.contentType,
        name: payload.name,
        path: payload.path,
        ownerHandle: payload.ownerHandle,
        durationSeconds: payload.durationSeconds,
        geo,
      });
      return res.status(200).json(result);
    }

    return res.status(400).json({ ok: false, message: "Unhandled event" });
  } catch (err) {
    console.error("[telegram-event]", err);
    return res.status(500).json({ ok: false, message: err?.message || "Server error" });
  }
}
