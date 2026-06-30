"use client";

/**
 * Fire-and-forget client event for Telegram analytics.
 * @param {'fork_click' | 'content_view' | 'content_leave' | 'page_view' | 'page_click' | 'hero_cta_click'} event
 * @param {Record<string, unknown>} payload
 * @param {{ sessionId?: string; keepalive?: boolean }} [opts]
 */
export function sendTelegramAnalyticsEvent(event, payload, opts = {}) {
  if (typeof window === "undefined") return;

  const body = JSON.stringify({
    event,
    payload,
    sessionId: opts.sessionId,
  });

  if (opts.keepalive && typeof fetch !== "undefined") {
    fetch("/api/analytics/telegram-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
    return;
  }

  fetch("/api/analytics/telegram-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  }).catch(() => {});
}
