"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

function resolveAnalyzeScrollLockMin(scrollRoot) {
  if (!scrollRoot) return 0;
  const anchor =
    document.getElementById("connect-home-analyze-anchor") ||
    document.getElementById("connect-home-analyze-sheet") ||
    document.getElementById("connect-home-workspace");
  if (!anchor) return 0;

  const padTop =
    Number.parseInt(getComputedStyle(scrollRoot).scrollPaddingTop, 10) || 0;
  const elRect = anchor.getBoundingClientRect();
  const scrollerRect = scrollRoot.getBoundingClientRect();
  return Math.max(0, elRect.top - scrollerRect.top + scrollRoot.scrollTop - padTop);
}

/**
 * After Step 2 (sheet/chart) is active, block manual scroll back to the Connect hub.
 * Programmatic scroll (e.g. Integration → compose) can temporarily bypass via allowScrollAboveAnalyze.
 */
export function useConnectHomeAnalyzeScrollLock({ scrollRef, hubRef, enabled }) {
  const bypassUntilRef = useRef(0);
  const minScrollRef = useRef(0);

  const allowScrollAboveAnalyze = useCallback((ms = 1400) => {
    bypassUntilRef.current = Date.now() + ms;
  }, []);

  const refreshMinScroll = useCallback(() => {
    const root = scrollRef?.current;
    if (!root) return 0;
    const min = resolveAnalyzeScrollLockMin(root);
    minScrollRef.current = min;
    return min;
  }, [scrollRef]);

  useLayoutEffect(() => {
    if (!enabled) return;
    const root = scrollRef?.current;
    if (!root) return;
    const min = refreshMinScroll();
    if (root.scrollTop < min) {
      root.scrollTop = min;
    }
  }, [enabled, scrollRef, refreshMinScroll]);

  useEffect(() => {
    if (!enabled) return undefined;
    const root = scrollRef?.current;
    if (!root) return undefined;

    const isBypassed = () => Date.now() < bypassUntilRef.current;

    const clamp = () => {
      if (isBypassed()) return;
      const min = refreshMinScroll();
      if (root.scrollTop < min - 1) {
        root.scrollTop = min;
      }
    };

    const onWheel = (e) => {
      if (isBypassed()) return;
      const composeEl = document.getElementById("connect-home-compose");
      if (composeEl?.contains(e.target)) return;
      const min = refreshMinScroll();
      if (root.scrollTop <= min + 2 && e.deltaY < 0) {
        e.preventDefault();
      }
    };

    let touchStartY = 0;
    const onTouchStart = (e) => {
      touchStartY = e.touches?.[0]?.clientY ?? 0;
    };
    const onTouchMove = (e) => {
      if (isBypassed()) return;
      const composeEl = document.getElementById("connect-home-compose");
      if (composeEl?.contains(e.target)) return;
      const min = refreshMinScroll();
      const y = e.touches?.[0]?.clientY ?? 0;
      if (root.scrollTop <= min + 2 && y > touchStartY + 4) {
        e.preventDefault();
      }
    };

    root.addEventListener("scroll", clamp, { passive: true });
    root.addEventListener("wheel", onWheel, { passive: false });
    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchmove", onTouchMove, { passive: false });

    const ro = new ResizeObserver(() => {
      if (!isBypassed()) clamp();
    });
    const anchor = document.getElementById("connect-home-analyze-anchor");
    if (anchor) ro.observe(anchor);
    if (hubRef?.current) ro.observe(hubRef.current);
    ro.observe(root);

    const t1 = window.setTimeout(clamp, 80);
    const t2 = window.setTimeout(clamp, 400);
    const t3 = window.setTimeout(clamp, 1200);

    return () => {
      root.removeEventListener("scroll", clamp);
      root.removeEventListener("wheel", onWheel);
      root.removeEventListener("touchmove", onTouchMove);
      root.removeEventListener("touchstart", onTouchStart);
      ro.disconnect();
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [enabled, scrollRef, hubRef, refreshMinScroll]);

  return { allowScrollAboveAnalyze, refreshMinScroll };
}
