/**
 * Scroll the landing demo mockup into the balanced viewport position used on first paint:
 * mockup vertically centered with even breathing room (nav floats above the card).
 * Avoids native #demo hash scroll, which aligns the section top and overshoots downward.
 */
export function getDemoScrollTop() {
  if (typeof window === "undefined") return 0;

  const mockup =
    document.getElementById("demo-mockup") ??
    document.querySelector("#demo [data-demo-mockup]");

  if (!mockup) {
    const section = document.getElementById("demo");
    if (!section) return 0;
    const rect = section.getBoundingClientRect();
    return Math.max(0, window.scrollY + rect.top - 96);
  }

  const rect = mockup.getBoundingClientRect();
  /**
   * Place the mockup card top just below the floating nav (~10–12% viewport).
   * Native #demo scroll aligns the section top to y=0 and overshoots downward.
   */
  const targetTop = window.innerHeight * 0.11;

  return Math.max(0, Math.round(window.scrollY + rect.top - targetTop));
}

/**
 * @param {{ behavior?: ScrollBehavior }} [options]
 */
export function scrollToDemoSection({ behavior = "smooth" } = {}) {
  if (typeof window === "undefined") return;

  const top = getDemoScrollTop();
  window.scrollTo({ top, behavior });

  const path = window.location.pathname;
  const nextUrl = `${path}#demo`;
  if (window.location.hash !== "#demo" && history.replaceState) {
    history.replaceState(null, "", nextUrl);
  }
}
