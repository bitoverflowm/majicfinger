/**
 * Normalize user input into a URL-safe chart embed slug (lowercase, hyphenated).
 * @param {string} raw
 * @returns {string}
 */
export function normalizeChartEmbedSlug(raw) {
  if (raw == null || typeof raw !== "string") return "";
  const s = raw
    .trim()
    .toLowerCase()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return s;
}

export function isValidChartEmbedSlug(slug) {
  if (!slug || typeof slug !== "string") return false;
  if (slug.length < 1 || slug.length > 120) return false;
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/**
 * @param {"idle"|"checking"|"available"|"taken"|"invalid"|"empty"|"error"|string} status
 * @param {"chart"|"dashboard"} [kind]
 */
export function embedSlugStatusMessage(status, kind = "chart") {
  const noun = kind === "dashboard" ? "dashboard" : "chart";
  if (status === "taken") return `That slug is already used by another ${noun} of yours.`;
  if (status === "invalid") return "Use lowercase letters, numbers, and hyphens only.";
  if (status === "checking") return "Checking slug…";
  if (status === "error") return "Could not verify slug. Try again.";
  if (status === "available") return "Slug is available.";
  return null;
}
