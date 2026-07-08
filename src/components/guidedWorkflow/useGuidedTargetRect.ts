"use client";

import { useCallback, useEffect, useState } from "react";

import type { GuidedTargetId } from "@/lib/guidedWorkflows/types";

import { findGuidedTargetElement, scrollGuidedTargetIntoView } from "./guidedTargetRegistry";
import { measureGuidedSpotlightRect } from "./guidedSpotlightRect";

export type SpotlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

/**
 * Track DOM rect for a guided target; polls when waitForTarget until element mounts.
 */
export function useGuidedTargetRect(
  targetId: GuidedTargetId | null,
  options: { active: boolean; waitForTarget?: boolean },
) {
  const [rect, setRect] = useState<SpotlightRect | null>(null);
  const [ready, setReady] = useState(false);

  const measure = useCallback(() => {
    if (!targetId) {
      setRect(null);
      setReady(false);
      return;
    }
    const el = findGuidedTargetElement(targetId);
    if (!el) {
      setRect(null);
      setReady(false);
      return;
    }
    setRect(measureGuidedSpotlightRect(el));
    setReady(true);
    scrollGuidedTargetIntoView(el);
  }, [targetId]);

  useEffect(() => {
    if (!options.active || !targetId) {
      setRect(null);
      setReady(false);
      return;
    }

    measure();

    const pollMs = options.waitForTarget ? 120 : 100;
    const pollId = window.setInterval(() => {
      measure();
    }, pollMs);

    const onLayout = () => measure();
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);

    let mo: MutationObserver | null = null;
    if (typeof MutationObserver !== "undefined") {
      mo = new MutationObserver(onLayout);
      mo.observe(document.body, {
        attributes: true,
        attributeFilter: ["data-state", "aria-expanded"],
        subtree: true,
        childList: true,
      });
    }

    let ro: ResizeObserver | null = null;
    const el = findGuidedTargetElement(targetId);
    if (el && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(onLayout);
      ro.observe(el);
    }

    return () => {
      window.clearInterval(pollId);
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
      mo?.disconnect();
      ro?.disconnect();
    };
  }, [options.active, options.waitForTarget, targetId, measure]);

  return { rect, ready };
}
