"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const VIEWPORT_MARGIN = 16;
const CARD_MAX_WIDTH = 320;
const CARD_ESTIMATED_HEIGHT = 148;

/**
 * @param {{
 *   exitButtonRect: { top: number; left: number; width: number; height: number };
 *   vw: number;
 *   vh: number;
 * }} params
 */
function computeExitHintPosition({ exitButtonRect, vw, vh }) {
  const cardWidth = Math.min(CARD_MAX_WIDTH, vw - VIEWPORT_MARGIN * 2);
  const gap = 12;

  // Below the X, right-aligned with the exit button
  let top = exitButtonRect.top + exitButtonRect.height + gap;
  let left = exitButtonRect.left + exitButtonRect.width - cardWidth;

  left = Math.max(VIEWPORT_MARGIN, Math.min(left, vw - cardWidth - VIEWPORT_MARGIN));

  if (top + CARD_ESTIMATED_HEIGHT > vh - VIEWPORT_MARGIN) {
    top = exitButtonRect.top - CARD_ESTIMATED_HEIGHT - gap;
  }
  top = Math.max(VIEWPORT_MARGIN, Math.min(top, vh - CARD_ESTIMATED_HEIGHT - VIEWPORT_MARGIN));

  return { top, left, cardWidth };
}

/**
 * Callout for the global guide exit control.
 *
 * @param {{
 *   exitButtonRect: { top: number; left: number; width: number; height: number } | null;
 *   onDismiss: () => void;
 *   className?: string;
 * }} props
 */
export function GuidedWorkflowExitHint({ exitButtonRect, onDismiss, className }) {
  if (!exitButtonRect) return null;

  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const { top, left, cardWidth } = computeExitHintPosition({
    exitButtonRect,
    vw,
    vh,
  });

  return (
    <div
      className={cn("pointer-events-auto fixed z-[10001]", className)}
      style={{ top, left, width: cardWidth }}
    >
      <div className="relative rounded-xl border border-border bg-background p-4 shadow-lg">
        <p className="text-sm font-medium text-foreground">
          You can exit this guide at any point in time
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Use the <span className="font-medium text-foreground">X</span> in the top-right corner, or
          press Esc.
        </p>
        <Button type="button" size="sm" className="mt-3 h-8 text-xs" onClick={onDismiss}>
          Got it
        </Button>
      </div>
    </div>
  );
}
