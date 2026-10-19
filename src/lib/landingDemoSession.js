/** Homepage demo becomes active only after Try For Free or a picker selection. */

export const LANDING_DEMO_ACTIVATE_EVENT = "lychee:landing-demo-activate";
export const LANDING_DEMO_EXIT_EVENT = "lychee:landing-demo-exit";

let requested = false;

export function requestLandingDemoActivate() {
  requested = true;
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(LANDING_DEMO_ACTIVATE_EVENT));
}

export function clearLandingDemoActivateRequest() {
  requested = false;
}

/** Asks the demo stage to play its exit animation and return the demo to the landing page. */
export function requestLandingDemoExit() {
  clearLandingDemoActivateRequest();
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(LANDING_DEMO_EXIT_EVENT));
}

export function subscribeLandingDemoExit(listener) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(LANDING_DEMO_EXIT_EVENT, listener);
  return () => window.removeEventListener(LANDING_DEMO_EXIT_EVENT, listener);
}

/** Leaves the full-viewport demo, then scrolls the landing page to a section once the demo is back in place. */
export function exitLandingDemoToSection(sectionId) {
  requestLandingDemoExit();
  if (typeof window === "undefined") return;
  window.setTimeout(() => {
    const section = document.getElementById(sectionId);
    if (!section) return;
    const navClearance = 96;
    const top = window.scrollY + section.getBoundingClientRect().top - navClearance;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    if (history.replaceState) history.replaceState(null, "", `${window.location.pathname}#${sectionId}`);
  }, 500);
}

/** Try For Free scrolls to the demo first; the demo expands once the page stops moving. */
export function requestLandingDemoActivateAfterScroll() {
  if (typeof window === "undefined") return;
  const started = performance.now();
  let last = window.scrollY;
  let stillFrames = 0;
  const tick = () => {
    const y = window.scrollY;
    stillFrames = y === last ? stillFrames + 1 : 0;
    last = y;
    const elapsed = performance.now() - started;
    if ((elapsed > 150 && stillFrames >= 6) || elapsed > 1500) {
      requestLandingDemoActivate();
      return;
    }
    window.requestAnimationFrame(tick);
  };
  window.requestAnimationFrame(tick);
}

export function isLandingDemoActivateRequested() {
  return requested;
}

export function subscribeLandingDemoActivate(listener) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(LANDING_DEMO_ACTIVATE_EVENT, listener);
  return () => window.removeEventListener(LANDING_DEMO_ACTIVATE_EVENT, listener);
}
