/**
 * Shared helpers for FeatureHelper (data-driven feature documentation).
 */

/**
 * @param {unknown} guideLinks
 * @returns {Array<{ label: string; href: string }>}
 */
export function filterFeatureHelperGuideLinks(guideLinks) {
  return (Array.isArray(guideLinks) ? guideLinks : []).filter((l) => {
    const href = String(l?.href || "").trim();
    const lab = String(l?.label || "").trim();
    if (!href || !lab) return false;
    if (href === "#" || href.startsWith("#")) return false;
    return true;
  });
}
