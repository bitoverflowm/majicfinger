"use client";

import { useEffect, type RefObject } from "react";

function canScroll(el: HTMLElement, deltaX: number, deltaY: number) {
  const vertical = Math.abs(deltaY) >= Math.abs(deltaX);
  const style = window.getComputedStyle(el);
  const overflow = vertical ? style.overflowY : style.overflowX;
  if (overflow !== "auto" && overflow !== "scroll" && overflow !== "overlay") return false;
  if (vertical) {
    const max = el.scrollHeight - el.clientHeight;
    if (max <= 1) return false;
    if (deltaY > 0) return el.scrollTop < max - 1;
    if (deltaY < 0) return el.scrollTop > 0;
    return false;
  }
  const max = el.scrollWidth - el.clientWidth;
  if (max <= 1) return false;
  if (deltaX > 0) return el.scrollLeft < max - 1;
  if (deltaX < 0) return el.scrollLeft > 0;
  return false;
}

function nestedCanScroll(root: HTMLElement, target: EventTarget | null, deltaX: number, deltaY: number) {
  let node: Element | null = target instanceof Element ? target : null;
  while (node && root.contains(node)) {
    if (node instanceof HTMLElement && canScroll(node, deltaX, deltaY)) return true;
    node = node.parentElement;
  }
  return false;
}

/** Stage covers the visual center enough to own wheel events (optional demo lock). */
function stageOwnsWheel(rect: DOMRect) {
  const viewH = window.innerHeight || 1;
  const mid = viewH * 0.45;
  // Still approaching / leaving the demo — page keeps the wheel.
  if (rect.top > mid || rect.bottom < mid) return false;
  const visible = Math.min(rect.bottom, viewH) - Math.max(rect.top, 0);
  return visible / viewH >= 0.4;
}

/**
 * Homepage `#demo` explore stages:
 * - Mid-page: page keeps the wheel (don’t dive into Markets/Holders virtual lists).
 * - Stage dominant: scroll nested demo content; at edges, continue the landing page.
 */
export function useLandingExploreScrollHandoff(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    const onWheel = (event: WheelEvent) => {
      if (event.defaultPrevented) return;
      if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;

      const stage =
        (root.querySelector("[data-landing-explore]") as HTMLElement | null) || root;
      const rect = stage.getBoundingClientRect();

      if (!stageOwnsWheel(rect)) {
        event.preventDefault();
        window.scrollBy({ top: event.deltaY, left: 0, behavior: "instant" });
        return;
      }

      if (nestedCanScroll(root, event.target, event.deltaX, event.deltaY)) return;

      event.preventDefault();
      window.scrollBy({ top: event.deltaY, left: 0, behavior: "instant" });
    };

    root.addEventListener("wheel", onWheel, { passive: false });
    return () => root.removeEventListener("wheel", onWheel);
  }, [rootRef]);
}
