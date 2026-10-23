/**
 * Returning-visitor lookup from saved VisitorSession rows (IP + optional visitor_id).
 */

/** Skip loopback / private ranges — shared office NAT is still useful; local/dev is not. */
export function isUsableClientIp(ip) {
  const value = String(ip || "").trim();
  if (!value) return false;
  if (value === "::1" || value === "127.0.0.1") return false;
  if (value.startsWith("10.") || value.startsWith("192.168.") || value.startsWith("fc") || value.startsWith("fd")) {
    return false;
  }
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(value)) return false;
  return true;
}

/**
 * @param {Date | string | undefined | null} value
 * @param {Date} [now]
 */
export function formatRelativeVisitAge(value, now = new Date()) {
  if (!value) return "";
  const then = new Date(value).getTime();
  if (!Number.isFinite(then)) return "";
  const deltaMs = Math.max(0, now.getTime() - then);
  const minutes = Math.round(deltaMs / 60_000);
  if (minutes < 60) return minutes <= 1 ? "just now" : `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return hours === 1 ? "1h ago" : `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 60) return days === 1 ? "yesterday" : `${days}d ago`;
  const months = Math.round(days / 30);
  return months === 1 ? "1mo ago" : `${months}mo ago`;
}

/**
 * Count prior visitor sessions for this IP (and visitor_id when present).
 * @param {import("mongoose").Model} VisitorSession
 * @param {{
 *   sessionId: string;
 *   clientIp?: string | null;
 *   visitorId?: string | null;
 *   now?: Date;
 * }} opts
 * @returns {Promise<{
 *   isReturning: boolean;
 *   visitNumber: number;
 *   priorVisits: number;
 *   priorByIp: number;
 *   priorByVisitorId: number;
 *   matchedBy: 'ip' | 'visitor_id' | 'ip+visitor_id' | null;
 *   firstSeenAt: Date | null;
 *   lastPriorAt: Date | null;
 *   lastPriorEntryPath: string;
 * } | null>}
 */
export async function lookupReturningVisitor(
  VisitorSession,
  { sessionId, clientIp, visitorId, now = new Date() },
) {
  const ip = isUsableClientIp(clientIp) ? String(clientIp).trim() : "";
  const vid = String(visitorId || "").trim();
  if (!ip && !vid) return null;

  /** @type {Record<string, unknown>[]} */
  const orClauses = [];
  if (ip) orClauses.push({ client_ip: ip });
  if (vid) orClauses.push({ visitor_id: vid });

  const baseFilter = {
    session_kind: "visitor",
    session_id: { $ne: sessionId },
    ...(orClauses.length === 1 ? orClauses[0] : { $or: orClauses }),
  };

  const [priorTotal, priorByIp, priorByVisitorId, first, lastPrior] = await Promise.all([
    VisitorSession.countDocuments(baseFilter),
    ip
      ? VisitorSession.countDocuments({
          session_kind: "visitor",
          session_id: { $ne: sessionId },
          client_ip: ip,
        })
      : Promise.resolve(0),
    vid
      ? VisitorSession.countDocuments({
          session_kind: "visitor",
          session_id: { $ne: sessionId },
          visitor_id: vid,
        })
      : Promise.resolve(0),
    VisitorSession.findOne(baseFilter).sort({ started_at: 1 }).select("started_at").lean(),
    VisitorSession.findOne(baseFilter)
      .sort({ started_at: -1 })
      .select("started_at entry_path")
      .lean(),
  ]);

  const priorVisits = Math.max(priorTotal, priorByIp, priorByVisitorId);
  const isReturning = priorVisits > 0;
  let matchedBy = null;
  if (priorByIp > 0 && priorByVisitorId > 0) matchedBy = "ip+visitor_id";
  else if (priorByIp > 0) matchedBy = "ip";
  else if (priorByVisitorId > 0) matchedBy = "visitor_id";

  return {
    isReturning,
    visitNumber: priorVisits + 1,
    priorVisits,
    priorByIp,
    priorByVisitorId,
    matchedBy,
    firstSeenAt: first?.started_at ? new Date(first.started_at) : null,
    lastPriorAt: lastPrior?.started_at ? new Date(lastPrior.started_at) : null,
    lastPriorEntryPath: lastPrior?.entry_path || "",
  };
}

/**
 * One-line summary for Telegram.
 * @param {Awaited<ReturnType<typeof lookupReturningVisitor>>} info
 * @param {Date} [now]
 */
export function formatReturningVisitorLine(info, now = new Date()) {
  if (!info) return "";
  if (!info.isReturning) {
    return "first visit from this IP";
  }

  const parts = [`returning · visit #${info.visitNumber}`];
  if (info.priorByIp > 0) {
    parts.push(`${info.priorByIp} prior from this IP`);
  } else if (info.priorByVisitorId > 0) {
    parts.push(`${info.priorByVisitorId} prior (same browser id)`);
  }
  if (info.firstSeenAt) {
    parts.push(`first seen ${formatRelativeVisitAge(info.firstSeenAt, now)}`);
  }
  if (info.lastPriorAt) {
    parts.push(`last visit ${formatRelativeVisitAge(info.lastPriorAt, now)}`);
  }
  return parts.join(" · ");
}
