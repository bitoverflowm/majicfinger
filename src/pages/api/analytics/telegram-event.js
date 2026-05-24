import {
  notifyContentLeave,
  notifyContentView,
  notifyForkClick,
} from "@/lib/telegram/trackEvent";

const ALLOWED_EVENTS = new Set(["fork_click", "content_view", "content_leave"]);

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ ok: false, message: "Method not allowed" });

  const { event, payload = {}, sessionId } = req.body || {};
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
      });
      return res.status(200).json(result);
    }

    return res.status(400).json({ ok: false, message: "Unhandled event" });
  } catch (err) {
    console.error("[telegram-event]", err);
    return res.status(500).json({ ok: false, message: err?.message || "Server error" });
  }
}
