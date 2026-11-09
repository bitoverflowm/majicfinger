import { publicationContent, resolvePublication, unlockCookieName, unlockMatches } from "@/lib/server/workspacePublication";

/** A published project's tabs and blocks, for its public page. Password-protected pages need the unlock cookie. */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
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

  if (publication.password_on) {
    const cookie = req.cookies?.[unlockCookieName(publication._id)];
    if (!unlockMatches(publication._id, publication.password_hash, cookie)) {
      res.setHeader("Cache-Control", "private, no-store");
      return res.status(401).json({ success: false, code: "LOCKED", message: "This page needs a password." });
    }
  }

  const content = await publicationContent(publication);
  if (!content) return res.status(404).json({ success: false, message: "Not found" });
  res.setHeader(
    "Cache-Control",
    publication.password_on ? "private, no-store" : publication.mode === "snapshot" ? "public, s-maxage=300, stale-while-revalidate=3600" : "public, s-maxage=30, stale-while-revalidate=300",
  );
  return res.status(200).json({ success: true, data: { ...content, mode: publication.mode } });
}
