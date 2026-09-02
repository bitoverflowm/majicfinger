"use client";

import { useEffect } from "react";

function readEmbedWantsDark(): boolean {
  if (typeof window === "undefined") return false;

  const fromQuery = new URLSearchParams(window.location.search).get("theme");
  if (fromQuery === "dark") return true;
  if (fromQuery === "light") return false;

  if (window.self !== window.top) {
    try {
      return window.parent.document.documentElement.classList.contains("dark");
    } catch {
      /* cross-origin */
    }
  }

  return document.documentElement.classList.contains("dark");
}

function applyEmbedAppearance(dark: boolean) {
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

/**
 * Match article-embed chrome to the host page's light/dark appearance.
 *
 * Important: do NOT call next-themes `setTheme` here — that writes the shared
 * localStorage key and makes the parent app jitter between themes.
 */
export function useEmbedParentThemeSync(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    const apply = () => {
      const wantDark = readEmbedWantsDark();
      const isDark = document.documentElement.classList.contains("dark");
      if (wantDark !== isDark) applyEmbedAppearance(wantDark);
      else document.documentElement.style.colorScheme = wantDark ? "dark" : "light";
    };

    apply();

    // next-themes may hydrate from localStorage and flip <html class>; re-assert embed appearance.
    const selfObs = new MutationObserver(apply);
    selfObs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    let parentObs: MutationObserver | null = null;
    if (window.self !== window.top) {
      try {
        parentObs = new MutationObserver(apply);
        parentObs.observe(window.parent.document.documentElement, {
          attributes: true,
          attributeFilter: ["class"],
        });
      } catch {
        /* cross-origin */
      }
    }

    return () => {
      selfObs.disconnect();
      parentObs?.disconnect();
    };
  }, [enabled]);
}
