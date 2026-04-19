import { siteConfig } from "@/lib/config";

export type NavMenuLink = {
  id: string;
  name: string;
  href: string;
};

/**
 * Marketing navbar links.
 * Polymarket metadata page only: slim nav + "Learn more" → #guides.
 * All other routes (including `/` landing): the **exact** `siteConfig.nav.links` tuple — same reference, labels, and hrefs as before.
 */
export function getNavLinksForPathname(pathname: string | null | undefined) {
  const p = (pathname ?? "").replace(/\/$/, "") || "/";
  if (p === "/polymarket-metadata") {
    return [{ id: "guides", name: "Learn more", href: "#guides" }] satisfies NavMenuLink[];
  }
  return siteConfig.nav.links;
}

/** Section id for scroll-spy and in-page scroll targets. */
export function navHrefToSectionId(href: string): string | null {
  if (href.startsWith("/#")) return href.slice(2);
  if (href.startsWith("#")) return href.slice(1);
  if (href === "/guides" || href.startsWith("/guides/")) return "guides";
  return null;
}

export function isAbsoluteHomeHashHref(href: string): boolean {
  return href.startsWith("/#");
}
