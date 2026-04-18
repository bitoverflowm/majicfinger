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
