/**
 * Normalize Kalshi tags_by_categories payload into sorted category → tag lists.
 * Categories with null / empty tags are still listed (tag dropdown will be empty).
 *
 * @param {unknown} raw
 * @returns {{ categories: string[]; tagsByCategory: Record<string, string[]> }}
 */
export function normalizeKalshiTagsByCategories(raw) {
  const map =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? /** @type {Record<string, unknown>} */ (raw)
      : {};

  /** @type {Record<string, string[]>} */
  const tagsByCategory = {};
  for (const [category, tags] of Object.entries(map)) {
    const key = String(category || "").trim();
    if (!key) continue;
    tagsByCategory[key] = Array.isArray(tags)
      ? [...new Set(tags.map((t) => String(t || "").trim()).filter(Boolean))].sort((a, b) =>
          a.localeCompare(b),
        )
      : [];
  }

  const categories = Object.keys(tagsByCategory).sort((a, b) => a.localeCompare(b));
  return { categories, tagsByCategory };
}

/**
 * Client fetch of series category → tags map.
 * @param {{ signal?: AbortSignal }} [opts]
 */
export async function fetchKalshiLiveTagsByCategories(opts = {}) {
  const res = await fetch("/api/integrations/kalshi-live/search/tags-by-categories", {
    headers: { Accept: "application/json" },
    credentials: "same-origin",
    signal: opts.signal,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof body?.message === "string"
        ? body.message
        : typeof body?.error === "string"
          ? body.error
          : res.statusText || "Failed to load series categories";
    throw new Error(msg);
  }
  return normalizeKalshiTagsByCategories(body?.tags_by_categories);
}
