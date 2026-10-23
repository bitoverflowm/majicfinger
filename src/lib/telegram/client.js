"use client";

/**
 * @deprecated Per-action Telegram alerts are retired. Record events with
 * `trackJourneyEvent` instead — one summary is sent at visitor session end.
 * Kept as a no-op so any lingering callers do not spam Telegram.
 * @param {'fork_click' | 'content_view' | 'content_leave' | 'page_view' | 'page_click' | 'hero_cta_click'} _event
 * @param {Record<string, unknown>} _payload
 * @param {{ sessionId?: string; keepalive?: boolean }} [_opts]
 */
export function sendTelegramAnalyticsEvent(_event, _payload, _opts = {}) {
  // no-op: journey summary only
}
