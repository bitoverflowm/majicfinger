/**
 * Scroll the landing guides section into view below the floating nav.
 * Avoids relying on native hash scroll, which Next.js client navigation often skips on `/`.
 */
export function getGuidesScrollTop() {
  if (typeof window === "undefined") return 0;

  const section = document.getElementById("guides");
  if (!section) return 0;

  const rect = section.getBoundingClientRect();
  const navOffset = 96;

  return Math.max(0, Math.round(window.scrollY + rect.top - navOffset));
}

/**
 * @param {{ behavior?: ScrollBehavior }} [options]
 */
export function scrollToGuidesSection({ behavior = "smooth" } = {}) {
  if (typeof window === "undefined") return;

  const top = getGuidesScrollTop();
  window.scrollTo({ top, behavior });

  const path = window.location.pathname;
  const nextUrl = `${path}#guides`;
  if (window.location.hash !== "#guides" && history.replaceState) {
    history.replaceState(null, "", nextUrl);
  }
}
