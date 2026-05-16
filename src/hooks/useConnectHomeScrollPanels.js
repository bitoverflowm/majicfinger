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
  /** Observe #connect-home-analyze-sheet (grid column) for drawer collapse when Step 2 scrolls away. */
  trackAnalyzeSection = false,
}) {
  const [hubDominant, setHubDominant] = useState(true);
  const [workspaceInView, setWorkspaceInView] = useState(false);
  const [analyzeInView, setAnalyzeInView] = useState(false);
  const [composeDominant, setComposeDominant] = useState(false);

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

  useEffect(() => {
    const root = scrollRef?.current;
    if (!root || !workspaceActive || !trackAnalyzeSection) {
      setAnalyzeInView(false);
      setComposeDominant(false);
      return;
    }

    let sheetObserver = null;
    let composeObserver = null;
    let cancelled = false;

    const attach = () => {
      if (cancelled) return;
      sheetObserver?.disconnect();
      composeObserver?.disconnect();

      const sheet = document.getElementById("connect-home-analyze-sheet");
      const compose = document.getElementById("connect-home-compose");

      if (sheet) {
        sheetObserver = new IntersectionObserver(
          ([entry]) => {
            const ratio = entry?.intersectionRatio ?? 0;
            const rect = entry?.boundingClientRect;
            const rootRect = entry?.rootBounds;
            const visiblePx =
              rect && rootRect
                ? Math.min(rect.bottom, rootRect.bottom) - Math.max(rect.top, rootRect.top)
                : 0;
            setAnalyzeInView(
              entry.isIntersecting && (ratio >= 0.18 || visiblePx >= 160),
            );
          },
          {
            root,
            threshold: [0, 0.08, 0.18, 0.3, 0.5],
            rootMargin: "-72px 0px -40% 0px",
          },
        );
        sheetObserver.observe(sheet);
      }

      if (compose) {
        composeObserver = new IntersectionObserver(
          ([entry]) => {
            const ratio = entry?.intersectionRatio ?? 0;
            setComposeDominant(entry.isIntersecting && ratio >= 0.28);
          },
          {
            root,
            threshold: [0, 0.12, 0.28, 0.45, 0.65],
            rootMargin: "-72px 0px -50% 0px",
          },
        );
        composeObserver.observe(compose);
      }
    };

    attach();
    const retryId = window.setTimeout(attach, 120);
    const retryId2 = window.setTimeout(attach, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(retryId);
      window.clearTimeout(retryId2);
      sheetObserver?.disconnect();
      composeObserver?.disconnect();
    };
  }, [scrollRef, workspaceActive, trackAnalyzeSection]);

  const panelsVisible = workspaceActive && workspaceInView && !hubDominant;

  /** Step 2 drawer: data-sheet column in view and compose (Refine query) not dominant. */
  const analyzePanelsEngaged = trackAnalyzeSection
    ? workspaceActive && analyzeInView && !composeDominant
    : panelsVisible;

  return {
    panelsVisible,
    analyzeInView,
    analyzePanelsEngaged,
    hubDominant,
    workspaceInView,
  };
}
