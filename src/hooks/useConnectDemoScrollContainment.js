"use client";

import { useEffect } from "react";

function isScrollableY(el) {
  if (!el) return false;
  const { overflowY } = getComputedStyle(el);
  if (overflowY !== "auto" && overflowY !== "scroll" && overflowY !== "overlay") {
    return false;
  }
  return el.scrollHeight > el.clientHeight + 1;
}

function canScrollY(el, deltaY) {
  if (!el || !isScrollableY(el)) return false;
  const { scrollTop, scrollHeight, clientHeight } = el;
  if (deltaY < 0) return scrollTop > 0;
  if (deltaY > 0) return scrollTop + clientHeight < scrollHeight - 1;
  return false;
}

function findScrollableTarget(target, boundary, primaryScrollRoot) {
  let node = target instanceof Element ? target : null;
  while (node && node !== boundary) {
    if (isScrollableY(node)) return node;
    node = node.parentElement;
  }
  return primaryScrollRoot;
}

/**
 * Keep wheel / trackpad scroll inside the landing demo embed (#connect-home-scroll).
 */
export function useConnectDemoScrollContainment({ enabled, scrollRef, trapRootRef }) {
  useEffect(() => {
    if (!enabled) return undefined;

    const scrollRoot = scrollRef?.current;
    const trapRoot = trapRootRef?.current ?? scrollRoot;
    if (!scrollRoot || !trapRoot) return undefined;

    const onWheel = (e) => {
      if (!trapRoot.contains(e.target)) return;

      const primary = findScrollableTarget(e.target, trapRoot, scrollRoot);
      if (canScrollY(primary, e.deltaY)) {
        e.stopPropagation();
        return;
      }

      if (primary !== scrollRoot && canScrollY(scrollRoot, e.deltaY)) {
        e.stopPropagation();
        return;
      }

      e.preventDefault();
      e.stopPropagation();
    };

    trapRoot.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => trapRoot.removeEventListener("wheel", onWheel, { capture: true });
  }, [enabled, scrollRef, trapRootRef]);
}
