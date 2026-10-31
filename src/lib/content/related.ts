import {
  getAllContent,
  getAllContentForSearch,
  getContentBySlug,
} from "./index";
import { getLycheeContentRegistry } from "./lychee-content-registry";
import type { ContentClass } from "./taxonomy";
import type { BaseContent, ContentItem, ContentType } from "./types";

export type RelatedItem = {
  slug: string;
  contentType: ContentType;
  title: string;
  description: string;
  publishedAt?: string;
  /** e.g. "Guide", "Research", "Recipe". */
  category?: string;
  author?: string;
  readingTime?: string;
  relevanceScore: number;
};

const CONTENT_CLASS_SINGULAR: Record<ContentClass, string> = {
  dashboard: "Dashboard",
  research: "Research",
  explainer: "Explainer",
  guide: "Guide",
  changelog: "Changelog",
};

/** Slug → category label from the registry, preferring a non-changelog designation. */
function registryCategoryBySlug(): Map<string, string> {
  const map = new Map<string, string>();
  for (const entry of getLycheeContentRegistry()) {
    if (!entry.slug) continue;
    if (map.has(entry.slug) && entry.contentClass === "changelog") continue;
    map.set(entry.slug, CONTENT_CLASS_SINGULAR[entry.contentClass]);
  }
  return map;
}

function computeRelevanceScore(
  current: BaseContent,
  candidate: ContentItem
): number {
  let score = 0;

  const currentTopics = new Set(current.topics || []);
  const candidateTopics = new Set(candidate.frontmatter.topics || []);
  for (const t of currentTopics) {
    if (candidateTopics.has(t)) score += 3;
  }

  const currentIntegrations = new Set(current.integration || []);
  const candidateIntegrations = new Set(
    candidate.frontmatter.integration || []
  );
  for (const i of currentIntegrations) {
    if (candidateIntegrations.has(i)) score += 2;
  }

  const currentTags = new Set(current.tags || []);
  const candidateTags = new Set(candidate.frontmatter.tags || []);
  for (const t of currentTags) {
    if (candidateTags.has(t)) score += 1;
  }

  return score;
}

export function getRelatedContent(
  contentType: ContentType,
  currentSlug: string,
  currentFrontmatter: BaseContent,
  limit = 6
): RelatedItem[] {
  const allItems = getAllContentForSearch();
  const currentUrl = `/${contentType}/${currentSlug}`;

  const scored = allItems
    .filter((item) => `/${item.contentType}/${item.slug}` !== currentUrl)
    .map((item) => ({
      ...item,
      relevanceScore: computeRelevanceScore(currentFrontmatter, item),
    }))
    .filter((item) => item.relevanceScore > 0)
    .sort((a, b) => {
      if (b.relevanceScore !== a.relevanceScore) {
        return b.relevanceScore - a.relevanceScore;
      }
      const dateA = new Date(a.frontmatter.publishedAt || 0).getTime();
      const dateB = new Date(b.frontmatter.publishedAt || 0).getTime();
      return dateB - dateA;
    })
    .slice(0, limit);

  const categories = registryCategoryBySlug();

  return scored.map((item) => ({
    slug: item.slug,
    contentType: item.contentType,
    title: item.frontmatter.title,
    description: item.frontmatter.description,
    publishedAt: item.frontmatter.publishedAt,
    category:
      item.frontmatter.contentType?.trim() || categories.get(item.slug),
    author: item.frontmatter.author?.trim() || undefined,
    readingTime: item.frontmatter.readingTime?.trim() || undefined,
    relevanceScore: item.relevanceScore,
  }));
}
