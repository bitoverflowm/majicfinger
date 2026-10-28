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

/** Hub pages name their pricing section per hub (e.g. `kalshi-live-pricing`). */
function findPageSection(sectionId) {
  const exact = document.getElementById(sectionId);
  if (exact) return exact;
  return document.querySelector(`[id$="-${CSS.escape(sectionId)}"]`);
}

/**
 * Leaves the full-viewport demo, then scrolls the page to a section once the demo is back in place.
 * Pages without that section (guides) go to the homepage's copy instead.
 */
export function exitLandingDemoToSection(sectionId) {
  returnScrollY = null;
  requestLandingDemoExit();
  if (typeof window === "undefined") return;
  window.setTimeout(() => {
    const section = findPageSection(sectionId);
    if (!section) {
      window.location.assign(`/#${sectionId}`);
      return;
    }
    const navClearance = 96;
    const top = window.scrollY + section.getBoundingClientRect().top - navClearance;
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    if (history.replaceState) history.replaceState(null, "", `${window.location.pathname}#${section.id}`);
  }, 500);
}

/** Runs `callback` once a smooth scroll has stopped moving the page (or after 1.5s). */
function whenScrollSettles(callback) {
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
      callback();
      return;
    }
    window.requestAnimationFrame(tick);
  };
  window.requestAnimationFrame(tick);
}

let returnScrollY = null;

/** Remembers where the visitor was before a link scrolled them up to the demo. */
function rememberReturnPosition() {
  if (typeof window !== "undefined") returnScrollY = window.scrollY;
}

/** Where to put the page back once the demo closes, if a link brought the visitor to it. */
export function takeLandingDemoReturnPosition() {
  const y = returnScrollY;
  returnScrollY = null;
  return y;
}

/** Try For Free scrolls to the demo first; the demo expands once the page stops moving. */
export function requestLandingDemoActivateAfterScroll() {
  rememberReturnPosition();
  whenScrollSettles(requestLandingDemoActivate);
}

export const LANDING_DEMO_RECIPE_EVENT = "lychee:landing-demo-recipe";

let pendingRecipeId = null;

/**
 * Asks the demo picker to open a recipe (which also expands the demo). Held until the picker
 * takes it, since the demo may still be loading when the request is made.
 */
export function requestLandingDemoRecipe(recipeId) {
  pendingRecipeId = recipeId;
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(LANDING_DEMO_RECIPE_EVENT));
}

export function requestLandingDemoRecipeAfterScroll(recipeId) {
  rememberReturnPosition();
  whenScrollSettles(() => requestLandingDemoRecipe(recipeId));
}

export function takeLandingDemoRecipeRequest() {
  const recipeId = pendingRecipeId;
  pendingRecipeId = null;
  return recipeId;
}

export function hasLandingDemoRecipeRequest() {
  return pendingRecipeId !== null;
}

export function subscribeLandingDemoRecipe(listener) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(LANDING_DEMO_RECIPE_EVENT, listener);
  return () => window.removeEventListener(LANDING_DEMO_RECIPE_EVENT, listener);
}

export function isLandingDemoActivateRequested() {
  return requested;
}

export function subscribeLandingDemoActivate(listener) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(LANDING_DEMO_ACTIVATE_EVENT, listener);
  return () => window.removeEventListener(LANDING_DEMO_ACTIVATE_EVENT, listener);
}
