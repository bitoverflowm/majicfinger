import { siteConfig } from "@/lib/config";

export type NavMenuLink = {
  id: string;
  name: string;
  href: string;
};

/**
 * Marketing navbar links (after Products dropdown).
 * Home is omitted — the Lychee logo links to `/`.
 * Polymarket metadata uses a slim single-link nav.
 */
export function getNavLinksForPathname(pathname: string | null | undefined) {
  const p = (pathname ?? "").replace(/\/$/, "") || "/";
  if (p === "/polymarket-metadata") {
    return [{ id: "guides", name: "Learn more", href: "#guides" }] satisfies NavMenuLink[];
  }
  return siteConfig.nav.links;
}

/** Normalize pathname for home comparisons. */
export function normalizeMarketingPathname(pathname: string | null | undefined) {
  return (pathname ?? "").replace(/\/$/, "") || "/";
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

/**
 * Whether a nav href should participate in scroll-spy on the current page.
 * Home hashes like `/#guides` only spy on `/` — otherwise hub pages that also
 * have a `#guides` section (e.g. Kalshi Live) falsely highlight "Research".
 */
export function navHrefIsInPageScrollSpy(
  href: string,
  pathname: string | null | undefined,
): boolean {
  if (href.startsWith("#") && href.length > 1) return true;
  if (isAbsoluteHomeHashHref(href)) {
    return normalizeMarketingPathname(pathname) === "/";
  }
  return false;
}
