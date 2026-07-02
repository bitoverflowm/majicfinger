/** Visitor session-start Telegram dedupe window. */
export const VISITOR_START_DEDUPE_MS = 24 * 60 * 60 * 1000;

/** @param {string | undefined | null} ua */
export function normalizeUserAgent(ua) {
  return String(ua || "")
    .toLowerCase()
    .replace(/\d+\.\d+(\.\d+)*/g, "x")
    .slice(0, 160);
}

/**
 * @param {{ visitor_id?: string; client_ip?: string; user_agent?: string }} session
 */
export function buildVisitorStartDedupeKey(session = {}) {
  const visitorId = String(session.visitor_id || "").trim();
  if (visitorId) {
    return { strategy: "visitor_id", key: visitorId };
  }

  const ip = String(session.client_ip || "").trim();
  const ua = normalizeUserAgent(session.user_agent);
  if (ip && ua) {
    return { strategy: "ip_ua", key: `${ip}|${ua}` };
  }
  if (ip) {
    return { strategy: "ip", key: ip };
  }
  return null;
}

/**
 * @param {import('mongoose').Model} VisitorSession
 * @param {string} sessionId
 * @param {{ strategy: string; key: string }} dedupe
 * @param {Date} now
 */
export async function hasRecentVisitorStartTelegram(VisitorSession, sessionId, dedupe, now) {
  if (!dedupe?.key) return false;

  const dedupeSince = new Date(now.getTime() - VISITOR_START_DEDUPE_MS);
  /** @type {Record<string, unknown>} */
  const query = {
    session_id: { $ne: sessionId },
    start_telegram_sent: true,
    start_notified_at: { $gte: dedupeSince },
  };

  if (dedupe.strategy === "visitor_id") {
    query.visitor_id = dedupe.key;
  } else {
    query.start_dedupe_key = dedupe.key;
  }

  const duplicate = await VisitorSession.findOne(query).select("_id").lean();
  return !!duplicate;
}
