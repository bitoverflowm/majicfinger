import { getAllContent } from "@/lib/content";
import { siteConfig } from "@/lib/config";
import type { ContentItem, ContentType } from "@/lib/content/types";

export type LycheeContentNavLink = {
  label: string;
  href: string;
  slug?: string;
};

export type LycheeContentNavSection = {
  id: string;
  label: string;
  items: LycheeContentNavLink[];
};

export type LycheeContentNavData = {
  platform: LycheeContentNavLink[];
  sections: LycheeContentNavSection[];
  cta: {
    primary: { label: string; href: string };
    secondary: { label: string; href: string };
  };
};

const LYCHEE_CONTENT_TYPES: ContentType[] = [
  "guides",
  "blog",
  "concepts",
  "playbooks",
  "integrations",
];

const SECTION_LABELS: Record<ContentType, string> = {
  guides: "Guides",
  blog: "Blog",
  concepts: "Concepts",
  playbooks: "Playbooks",
  integrations: "Integrations",
};

function sortByPublishedAt(items: ContentItem[]): ContentItem[] {
  return [...items].sort((a, b) =>
    (b.frontmatter.publishedAt || "").localeCompare(
      a.frontmatter.publishedAt || "",
    ),
  );
}

function toNavLink(item: ContentItem): LycheeContentNavLink {
  const href =
    item.contentType === "guides" || item.contentType === "blog"
      ? `/guides/${item.slug}`
      : `/${item.contentType}/${item.slug}`;

  return {
    label: item.frontmatter.title,
    href,
    slug: item.slug,
  };
}

/** Server-side nav tree for lychee_content reading chrome (sidebar). */
export function getLycheeContentNavData(): LycheeContentNavData {
  const sections: LycheeContentNavSection[] = [];

  for (const contentType of LYCHEE_CONTENT_TYPES) {
    const items = sortByPublishedAt(getAllContent(contentType));
    if (items.length === 0) continue;

    sections.push({
      id: contentType,
      label: SECTION_LABELS[contentType],
      items: items.map(toNavLink),
    });
  }

  return {
    platform: [
      { label: "Home", href: "/" },
      { label: "Pricing", href: "/#pricing" },
      { label: "Guides", href: "/guides" },
      { label: "Dashboards", href: "/#guides" },
    ],
    sections,
    cta: {
      primary: {
        label: siteConfig.hero.cta.primary.text,
        href: "/#demo",
      },
      secondary: {
        label: "Log in",
        href: "/login",
      },
    },
  };
}
