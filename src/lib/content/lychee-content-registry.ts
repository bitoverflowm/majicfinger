import fs from "fs";
import path from "path";
import { getContentBySlug } from "@/lib/content";
import type {
  ContentClass,
  IntegrationHub,
  IntegrationTopic,
} from "@/lib/content/taxonomy";

export type RegistryEntry = {
  contentClass: ContentClass;
  integrationHub: IntegrationHub;
  integrationTopic: IntegrationTopic;
  /** MDX filename (guides or blog). */
  slug?: string;
  /** Full path — required for dashboards; optional override for articles. */
  href?: string;
  /** Display title; resolved from frontmatter when slug is set. */
  title?: string;
  /** ISO date for changelog ordering in Build in public. */
  publishedAt?: string;
};

type RegistryFile = {
  entries: RegistryEntry[];
};

export type ResolvedRegistryEntry = RegistryEntry & {
  label: string;
  href: string;
};

const REGISTRY_PATH = path.join(
  process.cwd(),
  "content",
  "lychee-content-registry.json",
);

function readRegistryFile(): RegistryFile {
  const raw = fs.readFileSync(REGISTRY_PATH, "utf-8");
  return JSON.parse(raw) as RegistryFile;
}

function resolveArticleHref(slug: string, hrefOverride?: string): string {
  return hrefOverride ?? `/guides/${slug}`;
}

function resolveArticleLabel(slug: string, titleOverride?: string): string {
  if (titleOverride?.trim()) return titleOverride.trim();

  const guide = getContentBySlug("guides", slug);
  if (guide) return guide.frontmatter.title;

  const blog = getContentBySlug("blog", slug);
  if (blog) return blog.frontmatter.title;

  return slug;
}

function resolveArticlePublishedAt(
  slug: string,
  publishedAtOverride?: string,
): string | undefined {
  if (publishedAtOverride?.trim()) return publishedAtOverride.trim();

  const guide = getContentBySlug("guides", slug);
  if (guide?.frontmatter.publishedAt) return guide.frontmatter.publishedAt;

  const blog = getContentBySlug("blog", slug);
  if (blog?.frontmatter.publishedAt) return blog.frontmatter.publishedAt;

  return undefined;
}

/** Load and resolve registry entries (titles, hrefs) for nav and hubs. */
export function getLycheeContentRegistry(): ResolvedRegistryEntry[] {
  const { entries } = readRegistryFile();

  return entries.map((entry) => {
    if (entry.slug) {
      const href = resolveArticleHref(entry.slug, entry.href);
      const label = resolveArticleLabel(entry.slug, entry.title);
      const publishedAt = resolveArticlePublishedAt(
        entry.slug,
        entry.publishedAt,
      );

      return {
        ...entry,
        href,
        label,
        ...(publishedAt && { publishedAt }),
      };
    }

    if (!entry.href?.trim()) {
      throw new Error(
        `Registry entry missing slug and href: ${JSON.stringify(entry)}`,
      );
    }

    const label = entry.title?.trim() ?? entry.href;

    return {
      ...entry,
      href: entry.href.trim(),
      label,
    };
  });
}
