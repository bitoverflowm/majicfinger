"use client";

import { useSyncExternalStore } from "react";

function subscribe(onStoreChange: () => void) {
  const el = document.documentElement;
  const obs = new MutationObserver(() => onStoreChange());
  obs.observe(el, { attributes: true, attributeFilter: ["class"] });
  return () => obs.disconnect();
}

function getSnapshot() {
  return document.documentElement.classList.contains("dark");
}

function getServerSnapshot() {
  return false;
}

/**
 * Tracks `class="dark"` on `<html>` (next-themes default). More reliable than `resolvedTheme`
 * alone for styling third-party widgets that read the DOM class (e.g. AG Grid CSS themes).
 */
export function useHtmlDarkClass(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
