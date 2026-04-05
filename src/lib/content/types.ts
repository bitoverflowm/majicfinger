/**
 * Base content type for all Lychee knowledge engine content.
 * All guides, integrations, concepts, and playbooks extend this.
 */
/** Matches Next.js / Twitter card values we emit in metadata. */
export type TwitterCardType =
  | "summary"
  | "summary_large_image"
  | "player"
  | "app";

export type BaseContent = {
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  author: string;
  coverImage?: string;
  ogImage?: string;
  /** Preferred canonical URL (frontmatter may use `canonical` — normalized in loader). */
  canonicalUrl?: string;
  /** Shorter or keyword-tuned title for `<title>`, Open Graph, and Twitter. */
  seoTitle?: string;
  /** Human-readable e.g. `8 min`; also used for meta + schema.org timeRequired when parsable. */
  readingTime?: string;
  twitterCard?: TwitterCardType;
  /** Optional editorial slug from MDX (path segment only; route slug still comes from the filename). */
  slug?: string;
  keywords?: string[];
  tags?: string[];
  integration?: string[];
  topics?: string[];
  featured?: boolean;
};

export type ContentType = "guides" | "integrations" | "concepts" | "playbooks" | "blog";

export type GuideContent = BaseContent & {
  integration: string[];
  topics: string[];
};

export type IntegrationContent = BaseContent & {
  integration: string[];
};

export type ConceptContent = BaseContent & {
  topics?: string[];
};

export type PlaybookContent = BaseContent & {
  integration?: string[];
  topics?: string[];
};

export type ContentItem = {
  slug: string;
  contentType: ContentType;
  frontmatter: BaseContent;
  excerpt?: string;
};
