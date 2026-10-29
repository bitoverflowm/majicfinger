import { useSyncExternalStore } from "react";

/** Below Tailwind's `lg` breakpoint the app is too cramped to use, so the demo becomes a preview. */
export const COMPACT_SCREEN_QUERY = "(max-width: 1023.98px)";

export const DESKTOP_ONLY_EVENT = "lychee:desktop-only";

export function isCompactScreen() {
  return typeof window !== "undefined" && window.matchMedia(COMPACT_SCREEN_QUERY).matches;
}

function subscribe(onChange: () => void) {
  const query = window.matchMedia(COMPACT_SCREEN_QUERY);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

/** `null` on the server and during hydration, so callers can lay out both variants with CSS until it's known. */
export function useCompactScreen(): boolean | null {
  return useSyncExternalStore(subscribe, isCompactScreen, () => null);
}

/** Opens the "Lychee is built for bigger screens" dialog. */
export function openDesktopOnlyNotice() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(DESKTOP_ONLY_EVENT));
}

/** For "Try For Free"-style handlers: on small screens, show the notice instead. Returns true when it did. */
export function interceptOnCompactScreen(event?: { preventDefault: () => void }) {
  if (!isCompactScreen()) return false;
  event?.preventDefault();
  openDesktopOnlyNotice();
  return true;
}
