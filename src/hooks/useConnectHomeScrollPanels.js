"use client";

import { useEffect, useState } from "react";

/**
 * When the Connect hub scrolls out of view, workspace panels (side nav + right drawer) should show.
 * When the user scrolls back to the hub, panels hide again.
 */
export function useConnectHomeScrollPanels({ scrollRef, hubRef, workspaceActive }) {
  const [hubDominant, setHubDominant] = useState(true);

  useEffect(() => {
    const root = scrollRef?.current;
    const hub = hubRef?.current;
    if (!root || !hub || !workspaceActive) {
      setHubDominant(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const ratio = entry?.intersectionRatio ?? 0;
        setHubDominant(entry.isIntersecting && ratio >= 0.28);
      },
      {
        root,
        threshold: [0, 0.15, 0.28, 0.45, 0.65, 1],
        rootMargin: "-72px 0px -35% 0px",
      },
    );

    observer.observe(hub);
    return () => observer.disconnect();
  }, [scrollRef, hubRef, workspaceActive]);

  const panelsVisible = workspaceActive && !hubDominant;
  return { panelsVisible, hubDominant };
}
