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

/** Labels that mark content for the Quant Analysis product page. */
const QUANT_ANALYSIS_TOPIC_LABELS = new Set([
  "quant",
  "quant-analysis",
  "quantitative",
  "quantitative-analysis",
]);

function normalizeLabel(value: unknown): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
}

function itemLabels(item: ContentItem): string[] {
  const topics = Array.isArray(item.frontmatter?.topics) ? item.frontmatter.topics : [];
  const tags = Array.isArray(item.frontmatter?.tags) ? item.frontmatter.tags : [];
  return [...topics, ...tags].map(normalizeLabel);
}

/**
 * Whether an MDX item should appear in Feature releases / What's New /changelog.
 * Matches `section: feature-releases` or topics/tags like "new features", "feature-release", "product-update".
 * Safe for client components (no Node `fs`).
 */
export function isFeatureReleaseContent(item: ContentItem | null | undefined): boolean {
  if (!item?.frontmatter) return false;
  const section = normalizeLabel(item.frontmatter.section);
  if (section === "feature-releases" || section === "feature-release" || section === "changelog") {
    return true;
  }
  return itemLabels(item).some((label) => FEATURE_RELEASE_TOPIC_LABELS.has(label));
}

/** Whether an MDX item should appear on `/quant-analysis`. Safe for client components. */
export function isQuantAnalysisContent(item: ContentItem | null | undefined): boolean {
  if (!item?.frontmatter) return false;
  return itemLabels(item).some((label) => QUANT_ANALYSIS_TOPIC_LABELS.has(label));
}
