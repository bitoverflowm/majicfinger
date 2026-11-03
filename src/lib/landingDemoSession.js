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
/** A demo request still waiting on its scroll; a member whose sign-in resolves meanwhile hands off with it. */
let queuedIntent = null;

export function requestLandingDemoActivateAfterScroll() {
  if (leaveDemoForMemberDashboard()) return;
  rememberReturnPosition();
  queuedIntent = {};
  whenScrollSettles(() => {
    queuedIntent = null;
    requestLandingDemoActivate();
  });
}

export function hasQueuedLandingDemoRequest() {
  return queuedIntent !== null || requested || pendingRecipeId !== null;
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
  if (leaveDemoForMemberDashboard({ recipeId })) return;
  rememberReturnPosition();
  queuedIntent = { recipeId };
  whenScrollSettles(() => {
    queuedIntent = null;
    requestLandingDemoRecipe(recipeId);
  });
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

let memberDashboardAccess = false;
let leavingForDashboard = false;

if (typeof window !== "undefined") {
  // Back from the dashboard restores this page from the bfcache with the flag still set.
  window.addEventListener("pageshow", () => {
    leavingForDashboard = false;
  });
}

/** Set while the visitor is signed in with dashboard access; the demo then hands off to their dashboard. */
export function setLandingDemoMemberAccess(hasAccess) {
  memberDashboardAccess = !!hasAccess;
}

export function landingDemoHandsOffToDashboard() {
  return memberDashboardAccess;
}

/**
 * Members skip the demo and open their own dashboard, carrying the recipe or source they picked.
 * Returns true when it navigated away.
 */
export function leaveDemoForMemberDashboard({ recipeId = null, integrationId = null } = {}) {
  if (!memberDashboardAccess || typeof window === "undefined") return false;
  // The first call carries the most specific intent; later ones must not replace it.
  if (leavingForDashboard) return true;
  leavingForDashboard = true;
  const recipe = recipeId || queuedIntent?.recipeId || pendingRecipeId;
  requested = false;
  pendingRecipeId = null;
  queuedIntent = null;
  const params = new URLSearchParams();
  if (recipe) params.set("recipe", recipe);
  else if (integrationId) params.set("integration", integrationId);
  const query = params.toString();
  window.location.assign(`/dashboard${query ? `?${query}` : ""}`);
  return true;
}

export function subscribeLandingDemoActivate(listener) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(LANDING_DEMO_ACTIVATE_EVENT, listener);
  return () => window.removeEventListener(LANDING_DEMO_ACTIVATE_EVENT, listener);
}
