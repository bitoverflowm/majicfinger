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

function isGlobeWheelTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "[data-war-room-globe], .maplibregl-canvas, .maplibregl-canvas-container, .maplibregl-map",
    ),
  );
}

/**
 * Homepage `#demo` explore stages — explicit scroll lock:
 * - Click / focus inside the stage: lock. Wheel on the globe zooms MapLibre;
 *   wheel on a pane with room scrolls that pane.
 * - Pane edge or non-scrollable demo chrome: release lock and scroll the page.
 * - Unlocked (incl. mid-page over the stage): landing page keeps the wheel —
 *   no sticky hijack into Markets/Holders lists.
 */
export function useLandingExploreScrollHandoff(rootRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;

    let locked = false;

    const setLocked = (next: boolean) => {
      if (locked === next) return;
      locked = next;
      root.dataset.landingDemoLocked = next ? "1" : "0";
      root.dispatchEvent(
        new CustomEvent("landing-demo-scroll-lock", {
          detail: { locked: next },
          bubbles: true,
        }),
      );
    };

    root.dataset.landingDemoLocked = "0";

    const onPointerDownInside = () => {
      setLocked(true);
    };

    const onFocusIn = () => {
      setLocked(true);
    };

    const onDocPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Node && !root.contains(target)) setLocked(false);
    };

    const onWheel = (event: WheelEvent) => {
      if (event.defaultPrevented) return;
      if (Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;

      // Unlocked: page owns the wheel (capture so nested lists cannot steal it).
      if (!locked) {
        event.preventDefault();
        window.scrollBy({ top: event.deltaY, left: 0, behavior: "instant" });
        return;
      }

      // Locked on the globe: leave the event for MapLibre scrollZoom.
      if (isGlobeWheelTarget(event.target)) return;

      // Locked on a scrollable pane with room: stay locked; let native scroll run.
      if (nestedCanScroll(root, event.target, event.deltaX, event.deltaY)) return;

      // Pane edge or non-scrollable chrome: edge-release to the landing page.
      setLocked(false);
      event.preventDefault();
      window.scrollBy({ top: event.deltaY, left: 0, behavior: "instant" });
    };

    root.addEventListener("pointerdown", onPointerDownInside);
    root.addEventListener("focusin", onFocusIn);
    document.addEventListener("pointerdown", onDocPointerDown, true);
    root.addEventListener("wheel", onWheel, { passive: false, capture: true });

    return () => {
      root.removeEventListener("pointerdown", onPointerDownInside);
      root.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("pointerdown", onDocPointerDown, true);
      root.removeEventListener("wheel", onWheel, { capture: true });
      delete root.dataset.landingDemoLocked;
    };
  }, [rootRef]);
}
