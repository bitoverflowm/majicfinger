/**
 * Scroll the landing / hub demo into view under the floating nav.
 * Avoids native hash scroll, which aligns the section top and overshoots downward.
 *
 * Homepage War Room hero: `#demo` + `[data-war-room-demo]` (tabs stay visible).
 * Classic homepage / hubs: `#demo` / `#live-demo` mockup card.
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
 * War Room explore block (tabs + globe). Prefer this over a lower-page terminal mockup.
 * @returns {HTMLElement | null}
 */
export function resolveWarRoomExploreEl() {
  if (typeof document === "undefined") return null;
  return (
    document.querySelector("[data-war-room-demo]") ||
    document.querySelector("#demo [role='tablist']") ||
    null
  );
}

/**
 * @returns {HTMLElement | null}
 */
export function resolveDemoMockupEl() {
  if (typeof document === "undefined") return null;
  // Never steal scroll from the War Room hero to a terminal mockup further down / in another tab.
  if (resolveWarRoomExploreEl()) return null;
  return (
    document.getElementById("demo-mockup") ||
    document.querySelector("#demo [data-demo-mockup]") ||
    document.querySelector("#live-demo [data-demo-mockup]") ||
    document.querySelector("#explore-demo [data-demo-mockup]") ||
    null
  );
}

export function getDemoScrollTop() {
  if (typeof window === "undefined") return 0;

  const navOffset = Math.round(window.innerHeight * 0.1);

  // Keep explore tabs in frame — scroll so the tablist sits under the nav.
  const warRoom = resolveWarRoomExploreEl();
  if (warRoom) {
    const tablist = document.querySelector("#demo [role='tablist']");
    const anchor = tablist || warRoom;
    const rect = anchor.getBoundingClientRect();
    return Math.max(0, Math.round(window.scrollY + rect.top - navOffset));
  }

  const mockup = resolveDemoMockupEl();
  if (!mockup) {
    const section = resolveDemoSectionEl();
    if (!section) return 0;
    const rect = section.getBoundingClientRect();
    return Math.max(0, window.scrollY + rect.top - 96);
  }

  const rect = mockup.getBoundingClientRect();
  return Math.max(0, Math.round(window.scrollY + rect.top - navOffset));
}

/**
 * @param {{ behavior?: ScrollBehavior }} [options]
 */
export function scrollToDemoSection({ behavior = "smooth" } = {}) {
  if (typeof window === "undefined") return;

  const section = resolveDemoSectionEl();
  if (!section && !resolveDemoMockupEl()) return;

  const top = getDemoScrollTop();
  const y = window.scrollY || 0;
  // Nudge one pixel toward the target first so the first frame moves even if the
  // main thread stalls on follow-up React work (Jarvis select-only pick).
  if (behavior === "smooth" && Number.isFinite(top) && top !== y) {
    const nudge = top > y ? Math.min(y + 1, top) : Math.max(y - 1, top);
    window.scrollTo({ top: nudge, behavior: "auto" });
  }
  window.scrollTo({ top, behavior });

  const hashId = section?.id || "demo";
  const nextUrl = `${window.location.pathname}#${hashId}`;
  if (window.location.hash !== `#${hashId}` && history.replaceState) {
    history.replaceState(null, "", nextUrl);
  }
}
