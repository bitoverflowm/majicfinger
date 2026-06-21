export const siteConfig = {
  name: "Lychee",
  url: "https://lycheedata.com",
  description: "Lychee: Your Quant in a Box",
  links: {
    twitter: "https://x.com/misterrpink1",
    github: "https://github.com/misterrpink1",
  },
} as const;

export type SiteConfig = typeof siteConfig;

/** Canonical apex origin (always https, never www). */
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url;
  try {
    const url = new URL(raw);
    if (url.hostname.startsWith("www.")) {
      url.hostname = url.hostname.slice(4);
    }
    url.protocol = "https:";
    return url.origin;
  } catch {
    return siteConfig.url;
  }
}

/** Self-referencing canonical URL for a site path. */
export function canonicalUrl(path = "/"): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getSiteUrl()}${normalizedPath === "/" ? "" : normalizedPath}`;
}
