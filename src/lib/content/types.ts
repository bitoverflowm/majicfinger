/**
 * Base content type for all Lychee knowledge engine content.
 * All guides, integrations, concepts, and playbooks extend this.
 */
export type BaseContent = {
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  author: string;
  coverImage?: string;
  ogImage?: string;
  canonicalUrl?: string;
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
