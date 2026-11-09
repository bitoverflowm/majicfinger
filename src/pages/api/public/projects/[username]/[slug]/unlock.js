import { resolvePublication, unlockCookieName, unlockToken, verifyPublishPassword } from "@/lib/server/workspacePublication";

const COOKIE_DAYS = 30;

/** Checks a password-protected page's password and remembers the visitor for a month. */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ success: false, message: "Method not allowed" });
  }
  let found;
  try {
    found = await resolvePublication(req.query.username, req.query.slug, { select: "+password_hash" });
  } catch {
    return res.status(503).json({ success: false, message: "This page is unavailable right now." });
  }
  if (!found) return res.status(404).json({ success: false, message: "Not found" });
  const { publication } = found;
  if (!publication.password_on) return res.status(200).json({ success: true });

  const password = typeof req.body?.password === "string" ? req.body.password : "";
  if (!password || !verifyPublishPassword(password, publication.password_hash)) {
    return res.status(401).json({ success: false, message: "That password isn't right." });
  }
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${unlockCookieName(publication._id)}=${unlockToken(publication._id, publication.password_hash)}; Path=/; Max-Age=${COOKIE_DAYS * 86400}; HttpOnly; SameSite=Lax${secure}`,
  );
  return res.status(200).json({ success: true });
}
