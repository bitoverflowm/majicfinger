import { getAllContent } from "@/lib/content";
import type { ContentItem } from "@/lib/content/types";

/** Labels that mark a guide/blog post as a feature release / changelog entry. */
const FEATURE_RELEASE_TOPIC_LABELS = new Set([
  "feature-release",
  "feature-releases",
  "product-update",
  "new features",
  "new-features",
  "new_features",
]);

function normalizeLabel(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
}

/**
 * Whether an MDX item should appear in Feature releases / What's New /changelog.
 * Matches `section: feature-releases` or topics/tags like "new features", "feature-release", "product-update".
 */
export function isFeatureReleaseContent(item: ContentItem | null | undefined): boolean {
  if (!item?.frontmatter) return false;
  const section = normalizeLabel(item.frontmatter.section);
  if (section === "feature-releases" || section === "feature-release" || section === "changelog") {
    return true;
  }
  const topics = Array.isArray(item.frontmatter.topics) ? item.frontmatter.topics : [];
  const tags = Array.isArray(item.frontmatter.tags) ? item.frontmatter.tags : [];
  return [...topics, ...tags].some((label) => FEATURE_RELEASE_TOPIC_LABELS.has(normalizeLabel(label)));
}

function contentPublishedAt(item: ContentItem): string {
  return String(item.frontmatter?.publishedAt || item.frontmatter?.updatedAt || "").trim();
}

/**
 * Guides + blog posts marked as feature releases, newest first.
 */
export function getFeatureReleaseContent(): ContentItem[] {
  const guides = getAllContent("guides") || [];
  const blog = getAllContent("blog") || [];
  return [...guides, ...blog]
    .filter(isFeatureReleaseContent)
    .sort((a, b) => contentPublishedAt(b).localeCompare(contentPublishedAt(a)));
}
