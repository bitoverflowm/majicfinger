"use client";

import { useEffect } from "react";
import { requestLandingDemoRecipeAfterScroll } from "@/lib/landingDemoSession";
import { scrollToDemoSection } from "@/lib/scrollToDemo";

/**
 * Corrects native demo hash scroll on load / back-navigation.
 * `/?recipe=<id>#demo` (linked from guides) also opens that recipe in the demo.
 */
export function LandingDemoScrollManager() {
  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash;
      if (hash !== "#demo" && hash !== "#live-demo") return;
      scrollToDemoSection({ behavior: "auto" });

      const params = new URLSearchParams(window.location.search);
      const recipeId = params.get("recipe");
      if (!recipeId) return;
      params.delete("recipe");
      const query = params.toString();
      history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${hash}`);
      requestLandingDemoRecipeAfterScroll(recipeId);
    };

    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return null;
}
