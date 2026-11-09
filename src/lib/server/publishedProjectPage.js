import { cache } from "react";
import {
  publicationContent,
  resolvePublication,
  unlockCookieName,
  unlockMatches,
} from "@/lib/server/workspacePublication";

/** Content small enough to send with the page; bigger dashboards load it after. */
const INLINE_CONTENT_CHARS = 350_000;

/**
 * Everything `/<handle>/<slug>` renders, once per request: the publication, its owner, whether
 * this visitor may see it, and (when they may) its content.
 */
export const getPublishedProjectPage = cache(async (handle, slug) => {
  let found;
  try {
    found = await resolvePublication(handle, slug, { select: "+password_hash" });
  } catch {
    return null;
  }
  if (!found) return null;
  const { user, publication } = found;
  let unlocked = !publication.password_on;
  if (!unlocked) {
    const { cookies } = await import("next/headers");
    const store = await cookies();
    unlocked = unlockMatches(publication._id, publication.password_hash, store.get(unlockCookieName(publication._id))?.value);
  }
  const { password_hash: _hidden, ...safe } = publication;
  const content = unlocked ? await publicationContent(publication).catch(() => null) : null;
  const inline = content && JSON.stringify(content).length <= INLINE_CONTENT_CHARS ? content : null;
  return {
    user: { handle: String(user.user_name || handle), picture: user.profile_pic || "" },
    publication: { ...safe, _id: String(safe._id) },
    unlocked,
    content,
    inline,
  };
});

/** Plain-language lines about each tab, for the page's crawlable summary and structured data. */
export function describePublishedTabs(content) {
  const tabs = Array.isArray(content?.tabs) ? content.tabs : [];
  return tabs.map((tab) => {
    const blocks = Array.isArray(content?.blocks?.[tab.id]) ? content.blocks[tab.id] : [];
    const subject = tab.terminalSubject;
    const about =
      subject?.kind === "market"
        ? `Polymarket market: ${subject.title || "a market"}`
        : subject?.kind === "trader"
          ? `Polymarket trader: ${subject.title || subject.address || "a wallet"}`
          : "";
    const pieces = [];
    for (const block of blocks) {
      if (block?.panel === "intro" || block?.panel === "search") continue;
      const title = String(block?.title || "").trim();
      if (title && !pieces.includes(title)) pieces.push(title);
    }
    return { id: tab.id, name: String(tab.name || "").trim() || "Tab", about, pieces: pieces.slice(0, 14) };
  });
}
