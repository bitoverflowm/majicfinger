"use client";

import { useEffect } from "react";
import { scrollToHashSection } from "@/lib/scrollToHashSection";

/** Corrects native hash scroll on hub pages after load / back-navigation. */
export function HubHashScrollManager() {
  useEffect(() => {
    const sync = () => {
      const hash = window.location.hash;
      if (!hash || hash.length < 2) return;
      if (!document.getElementById(hash.slice(1))) return;
      scrollToHashSection(hash, { behavior: "auto" });
    };

    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return null;
}
