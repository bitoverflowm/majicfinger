"use client";

import { useEffect } from "react";
import { scrollToDemoSection } from "@/lib/scrollToDemo";

/** Corrects native #demo hash scroll on load / back-navigation. */
export function LandingDemoScrollManager() {
  useEffect(() => {
    const sync = () => {
      if (window.location.hash !== "#demo") return;
      scrollToDemoSection({ behavior: "auto" });
    };

    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return null;
}
