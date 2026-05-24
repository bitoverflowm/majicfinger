import { getLoginSession } from "@/lib/auth";

/**
 * Require a valid login session for API routes that mutate or read private user data.
 * @returns {Promise<{ userId: string } | null>}
 */
export async function requireLoginSession(req, res) {
  try {
    const session = await getLoginSession(req);
    if (!session?.userId) {
      res.status(401).json({ success: false, message: "Unauthorized" });
      return null;
    }
    return session;
  } catch {
    res.status(401).json({ success: false, message: "Unauthorized" });
    return null;
  }
}

/** @param {unknown} doc Mongo document or lean object with `user_id` */
export function documentOwnedByUser(doc, userId) {
  if (!doc?.user_id || userId == null) return false;
  return String(doc.user_id) === String(userId);
}

/**
 * Deny access when the document belongs to another user (404 to avoid id enumeration).
 * @returns {boolean} true when the caller may proceed
 */
export function assertDocumentOwner(doc, session, res) {
  if (!doc) {
    res.status(404).json({ success: false, message: "Not found" });
    return false;
  }
  if (!documentOwnedByUser(doc, session.userId)) {
    res.status(404).json({ success: false, message: "Not found" });
    return false;
  }
  return true;
}

/**
 * @param {string} uid Query param from list routes (`?uid=`)
 */
export function assertQueryUserMatchesSession(uid, session, res) {
  if (!uid || String(uid) !== String(session.userId)) {
    res.status(403).json({ success: false, message: "Forbidden" });
    return false;
  }
  return true;
}
