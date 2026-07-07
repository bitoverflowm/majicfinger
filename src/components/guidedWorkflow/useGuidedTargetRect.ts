"use client";

import { useCallback, useEffect, useState } from "react";

import type { GuidedTargetId } from "@/lib/guidedWorkflows/types";

import { findGuidedTargetElement, scrollGuidedTargetIntoView } from "./guidedTargetRegistry";

const PADDING = 8;

export type SpotlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function rectWithPadding(rect: DOMRect): SpotlightRect {
  return {
    top: Math.max(0, rect.top - PADDING),
    left: Math.max(0, rect.left - PADDING),
    width: rect.width + PADDING * 2,
    height: rect.height + PADDING * 2,
  };
}

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
    setRect(rectWithPadding(el.getBoundingClientRect()));
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

    const pollMs = options.waitForTarget ? 120 : 0;
    const pollId =
      pollMs > 0 && !ready
        ? window.setInterval(() => {
            measure();
          }, pollMs)
        : null;

    const onLayout = () => measure();
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);

    let ro: ResizeObserver | null = null;
    const el = findGuidedTargetElement(targetId);
    if (el && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(onLayout);
      ro.observe(el);
    }

    return () => {
      if (pollId) window.clearInterval(pollId);
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
      ro?.disconnect();
    };
  }, [options.active, options.waitForTarget, targetId, measure, ready]);

  return { rect, ready };
}
