export type SpotlightRect = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type DialogPlacement = "top" | "bottom" | "left" | "right";

export type DialogSize = {
  width: number;
  height: number;
};

const GAP = 12;
const VIEWPORT_MARGIN = 12;

export const DEFAULT_GUIDED_DIALOG_SIZE: DialogSize = {
  width: 352,
  height: 140,
};

function getViewport(): { width: number; height: number } {
  if (typeof window === "undefined") return { width: 1200, height: 800 };
  return { width: window.innerWidth, height: window.innerHeight };
}

function dialogRectAt(top: number, left: number, size: DialogSize): SpotlightRect {
  return { top, left, width: size.width, height: size.height };
}

function rectsOverlap(a: SpotlightRect, b: SpotlightRect, gap = 0): boolean {
  return !(
    a.left + a.width + gap <= b.left ||
    b.left + b.width + gap <= a.left ||
    a.top + a.height + gap <= b.top ||
    b.top + b.height + gap <= a.top
  );
}

function positionAtPlacement(
  spotlight: SpotlightRect,
  placement: DialogPlacement,
  size: DialogSize,
): { top: number; left: number } {
  const { width: tw, height: th } = size;

  switch (placement) {
    case "top":
      return {
        top: spotlight.top - th - GAP,
        left: spotlight.left + spotlight.width / 2 - tw / 2,
      };
    case "bottom":
      return {
        top: spotlight.top + spotlight.height + GAP,
        left: spotlight.left + spotlight.width / 2 - tw / 2,
      };
    case "left":
      return {
        top: spotlight.top + spotlight.height / 2 - th / 2,
        left: spotlight.left - tw - GAP,
      };
    case "right":
      return {
        top: spotlight.top + spotlight.height / 2 - th / 2,
        left: spotlight.left + spotlight.width + GAP,
      };
  }
}

function clampToViewport(
  top: number,
  left: number,
  size: DialogSize,
  viewport: { width: number; height: number },
): { top: number; left: number } {
  const maxLeft = viewport.width - size.width - VIEWPORT_MARGIN;
  const maxTop = viewport.height - size.height - VIEWPORT_MARGIN;

  return {
    top: Math.max(VIEWPORT_MARGIN, Math.min(top, maxTop)),
    left: Math.max(VIEWPORT_MARGIN, Math.min(left, maxLeft)),
  };
}

function placementOrder(preferred: DialogPlacement): DialogPlacement[] {
  const all: DialogPlacement[] = ["bottom", "left", "top", "right"];
  return [preferred, ...all.filter((p) => p !== preferred)];
}

function placementPriority(placement: DialogPlacement, preferred: DialogPlacement): number {
  const order = placementOrder(preferred);
  return order.length - order.indexOf(placement);
}

/**
 * Place a guide dialog beside a spotlight without covering it.
 * Tries the preferred side first, then falls back to other sides that fit.
 */
export function computeGuidedDialogPosition(
  spotlight: SpotlightRect,
  preferredPlacement: DialogPlacement = "bottom",
  size: DialogSize = DEFAULT_GUIDED_DIALOG_SIZE,
): { top: number; left: number; placement: DialogPlacement } {
  const viewport = getViewport();
  const candidates = placementOrder(preferredPlacement);

  let best: {
    top: number;
    left: number;
    placement: DialogPlacement;
    score: number;
  } | null = null;

  for (const placement of candidates) {
    const ideal = positionAtPlacement(spotlight, placement, size);
    const clamped = clampToViewport(ideal.top, ideal.left, size, viewport);
    const dialog = dialogRectAt(clamped.top, clamped.left, size);

    if (rectsOverlap(spotlight, dialog, GAP)) continue;

    const displacement =
      Math.abs(clamped.top - ideal.top) + Math.abs(clamped.left - ideal.left);
    const score = placementPriority(placement, preferredPlacement) * 10_000 - displacement;

    if (!best || score > best.score) {
      best = { top: clamped.top, left: clamped.left, placement, score };
    }
  }

  if (best) {
    return { top: best.top, left: best.left, placement: best.placement };
  }

  // Last resort: park below and align to the viewport edge farthest from the spotlight.
  const belowTop = spotlight.top + spotlight.height + GAP;
  const alignLeft =
    spotlight.left + spotlight.width / 2 > viewport.width / 2
      ? Math.max(VIEWPORT_MARGIN, spotlight.left - size.width + spotlight.width)
      : spotlight.left;

  const fallback = clampToViewport(belowTop, alignLeft, size, viewport);
  const fallbackDialog = dialogRectAt(fallback.top, fallback.left, size);

  if (!rectsOverlap(spotlight, fallbackDialog, GAP)) {
    return { ...fallback, placement: "bottom" };
  }

  const aboveTop = spotlight.top - size.height - GAP;
  const above = clampToViewport(aboveTop, alignLeft, size, viewport);
  return { ...above, placement: "top" };
}
