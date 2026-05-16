"use client";

import { useEffect, useState } from "react";

/**
 * Step 2 analyze panels (right drawer, etc.) show only when the workspace block is in view
 * and Step 1 hub is not dominant. Scrolling up to integrations collapses panels.
 */
export function useConnectHomeScrollPanels({
  scrollRef,
  hubRef,
  workspaceRef,
  workspaceActive,
  /** When true (e.g. sheet has rows), keep panels available even if Step 1 hub still peeks in view. */
  hasSheetData = false,
}) {
  const [hubDominant, setHubDominant] = useState(true);
  const [workspaceInView, setWorkspaceInView] = useState(false);

  useEffect(() => {
    const root = scrollRef?.current;
    const hub = hubRef?.current;
    if (!root || !hub || !workspaceActive) {
      setHubDominant(true);
      return;
    }

    const hubObserver = new IntersectionObserver(
      ([entry]) => {
        const ratio = entry?.intersectionRatio ?? 0;
        setHubDominant(entry.isIntersecting && ratio >= 0.22);
      },
      {
        root,
        threshold: [0, 0.12, 0.22, 0.4, 0.65, 1],
        rootMargin: "-72px 0px -40% 0px",
      },
    );

    hubObserver.observe(hub);
    return () => hubObserver.disconnect();
  }, [scrollRef, hubRef, workspaceActive]);

  useEffect(() => {
    const root = scrollRef?.current;
    const workspace = workspaceRef?.current;
    if (!root || !workspace || !workspaceActive) {
      setWorkspaceInView(false);
      return;
    }

    const workspaceObserver = new IntersectionObserver(
      ([entry]) => {
        const ratio = entry?.intersectionRatio ?? 0;
        setWorkspaceInView(entry.isIntersecting && ratio >= 0.12);
      },
      {
        root,
        threshold: [0, 0.08, 0.12, 0.25, 0.5, 1],
        rootMargin: "-72px 0px 0px",
      },
    );

    workspaceObserver.observe(workspace);
    return () => workspaceObserver.disconnect();
  }, [scrollRef, workspaceRef, workspaceActive]);

  const panelsVisible =
    workspaceActive && workspaceInView && (!hubDominant || hasSheetData);
  return { panelsVisible, hubDominant, workspaceInView };
}
