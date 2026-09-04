import { getAllContent } from "@/lib/content";
import {
  isFeatureReleaseContent,
  isQuantAnalysisContent,
} from "@/lib/content/featureReleaseMatchers";
import type { ContentItem } from "@/lib/content/types";

export { isFeatureReleaseContent, isQuantAnalysisContent } from "@/lib/content/featureReleaseMatchers";

function contentPublishedAt(item: ContentItem): string {
  return String(item.frontmatter?.publishedAt || item.frontmatter?.updatedAt || "").trim();
}

function allGuideAndBlogContent(): ContentItem[] {
  const guides = getAllContent("guides") || [];
  const blog = getAllContent("blog") || [];
  return [...guides, ...blog];
}

/**
 * Guides + blog posts marked as feature releases, newest first.
 * Server-only (reads MDX from disk).
 */
export function getFeatureReleaseContent(): ContentItem[] {
  return allGuideAndBlogContent()
    .filter(isFeatureReleaseContent)
    .sort((a, b) => contentPublishedAt(b).localeCompare(contentPublishedAt(a)));
}

/**
 * Guides + blog posts tagged for Quant Analysis, newest first.
 * Server-only (reads MDX from disk).
 */
export function getQuantAnalysisContent(): ContentItem[] {
  return allGuideAndBlogContent()
    .filter(isQuantAnalysisContent)
    .sort((a, b) => contentPublishedAt(b).localeCompare(contentPublishedAt(a)));
}
