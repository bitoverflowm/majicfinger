import type { SpotlightRect } from "./useGuidedTargetRect";

const PADDING = 8;
const POPOVER_PROXIMITY_PX = 64;

const OPEN_POPOVER_SELECTORS = [
  '[data-state="open"][role="menu"]',
  '[data-state="open"][role="listbox"]',
  '[data-radix-select-content][data-state="open"]',
].join(", ");

function domRectToSpotlight(rect: DOMRect): SpotlightRect {
  return {
    top: rect.top,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function unionSpotlightRects(a: SpotlightRect, b: SpotlightRect): SpotlightRect {
  const top = Math.min(a.top, b.top);
  const left = Math.min(a.left, b.left);
  const right = Math.max(a.left + a.width, b.left + b.width);
  const bottom = Math.max(a.top + a.height, b.top + b.height);

  return {
    top: Math.max(0, top - PADDING),
    left: Math.max(0, left - PADDING),
    width: right - left + PADDING * 2,
    height: bottom - top + PADDING * 2,
  };
}

function isNearAnchor(popover: DOMRect, anchor: DOMRect): boolean {
  const pad = POPOVER_PROXIMITY_PX;
  return !(
    popover.right < anchor.left - pad ||
    popover.left > anchor.right + pad ||
    popover.bottom < anchor.top - pad ||
    popover.top > anchor.bottom + pad
  );
}

function isPopoverOwnedByTrigger(popover: Element, trigger: HTMLElement): boolean {
  const controlsId = trigger.getAttribute("aria-controls");
  if (controlsId && popover.id === controlsId) return true;

  const popoverId = popover.getAttribute("id");
  if (popoverId && trigger.getAttribute("aria-controls") === popoverId) return true;

  return isNearAnchor(popover.getBoundingClientRect(), trigger.getBoundingClientRect());
}

/** Include open Radix dropdown/select popovers anchored to the target element. */
export function expandSpotlightWithOpenPopovers(
  trigger: HTMLElement,
  base: SpotlightRect,
): SpotlightRect {
  if (typeof document === "undefined") return base;

  const anchorRect = trigger.getBoundingClientRect();
  const openPopovers = Array.from(document.querySelectorAll(OPEN_POPOVER_SELECTORS));

  let expanded = base;

  for (const popover of openPopovers) {
    if (!(popover instanceof HTMLElement)) continue;
    if (popover.getAttribute("data-state") !== "open") continue;
    if (!isPopoverOwnedByTrigger(popover, trigger)) continue;

    const popoverRect = domRectToSpotlight(popover.getBoundingClientRect());
    if (popoverRect.width < 1 || popoverRect.height < 1) continue;

    expanded = unionSpotlightRects(expanded, popoverRect);
  }

  return expanded;
}

export function measureGuidedSpotlightRect(trigger: HTMLElement): SpotlightRect {
  const base = domRectToSpotlight(trigger.getBoundingClientRect());
  const padded: SpotlightRect = {
    top: Math.max(0, base.top - PADDING),
    left: Math.max(0, base.left - PADDING),
    width: base.width + PADDING * 2,
    height: base.height + PADDING * 2,
  };

  return expandSpotlightWithOpenPopovers(trigger, padded);
}
