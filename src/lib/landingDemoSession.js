/** Homepage demo becomes active only after Try For Free or a picker selection. */

export const LANDING_DEMO_ACTIVATE_EVENT = "lychee:landing-demo-activate";

let requested = false;

export function requestLandingDemoActivate() {
  requested = true;
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(LANDING_DEMO_ACTIVATE_EVENT));
}

export function isLandingDemoActivateRequested() {
  return requested;
}

export function subscribeLandingDemoActivate(listener) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(LANDING_DEMO_ACTIVATE_EVENT, listener);
  return () => window.removeEventListener(LANDING_DEMO_ACTIVATE_EVENT, listener);
}
