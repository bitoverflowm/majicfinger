import { getAllContentForSearch } from "@/lib/content";
import type { ContentItem } from "@/lib/content/types";

export type SearchIndexItem = {
  slug: string;
  contentType: string;
  title: string;
  description: string;
  excerpt?: string;
  integration: string[];
  topics: string[];
  tags: string[];
};

export function buildSearchIndex(): SearchIndexItem[] {
  const items = getAllContentForSearch();
  return items.map((item: ContentItem) => ({
    slug: item.slug,
    contentType: item.contentType,
    title: item.frontmatter.title,
    description: item.frontmatter.description,
    excerpt: item.excerpt,
    integration: item.frontmatter.integration || [],
    topics: item.frontmatter.topics || [],
    tags: item.frontmatter.tags || [],
  }));
}
