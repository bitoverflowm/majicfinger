/**
 * Scroll the landing / hub demo mockup into the balanced viewport position used on first paint:
 * mockup vertically centered with even breathing room (nav floats above the card).
 * Avoids native hash scroll, which aligns the section top and overshoots downward.
 *
 * Homepage uses `#demo`; hub pages (e.g. Kalshi Live) use `#live-demo`.
 */

const DEMO_SECTION_IDS = ["demo", "live-demo"];

/**
 * @returns {HTMLElement | null}
 */
export function resolveDemoSectionEl() {
  if (typeof document === "undefined") return null;
  for (const id of DEMO_SECTION_IDS) {
    const el = document.getElementById(id);
    if (el) return el;
  }
  return null;
}

/**
 * @returns {HTMLElement | null}
 */
export function resolveDemoMockupEl() {
  if (typeof document === "undefined") return null;
  return (
    document.getElementById("demo-mockup") ||
    document.querySelector("#demo [data-demo-mockup]") ||
    document.querySelector("#live-demo [data-demo-mockup]") ||
    document.querySelector("[data-demo-mockup]")
  );
}

export function getDemoScrollTop() {
  if (typeof window === "undefined") return 0;

  const mockup = resolveDemoMockupEl();

  if (!mockup) {
    const section = resolveDemoSectionEl();
    if (!section) return 0;
    const rect = section.getBoundingClientRect();
    return Math.max(0, window.scrollY + rect.top - 96);
  }

  const rect = mockup.getBoundingClientRect();
  /**
   * Place the mockup card top just below the floating nav (~10–12% viewport).
   * Native hash scroll aligns the section top to y=0 and overshoots downward.
   */
  const targetTop = window.innerHeight * 0.11;

  return Math.max(0, Math.round(window.scrollY + rect.top - targetTop));
}

/**
 * @param {{ behavior?: ScrollBehavior }} [options]
 */
export function scrollToDemoSection({ behavior = "smooth" } = {}) {
  if (typeof window === "undefined") return;

  const section = resolveDemoSectionEl();
  if (!section && !resolveDemoMockupEl()) return;

  const top = getDemoScrollTop();
  window.scrollTo({ top, behavior });

  const hashId = section?.id || "demo";
  const nextUrl = `${window.location.pathname}#${hashId}`;
  if (window.location.hash !== `#${hashId}` && history.replaceState) {
    history.replaceState(null, "", nextUrl);
  }
}
