"use client";

import { MousePointer2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Bouncing pointer callout for the global guide exit control.
 *
 * @param {{
 *   exitButtonRect: { top: number; left: number; width: number; height: number } | null;
 *   onDismiss: () => void;
 *   className?: string;
 * }} props
 */
export function GuidedWorkflowExitHint({ exitButtonRect, onDismiss, className }) {
  if (!exitButtonRect) return null;

  const pointerTop = exitButtonRect.top + exitButtonRect.height + 12;
  const pointerLeft = Math.max(
    16,
    exitButtonRect.left + exitButtonRect.width / 2 - 160,
  );

  return (
    <div
      className={cn("pointer-events-auto fixed z-[10001]", className)}
      style={{ top: pointerTop, left: pointerLeft, width: "min(20rem, calc(100vw - 2rem))" }}
    >
      <div className="relative rounded-xl border border-border bg-background p-4 shadow-lg">
        <div
          className="absolute -top-8 right-4 animate-bounce text-primary"
          aria-hidden
        >
          <MousePointer2 className="size-7 rotate-[-30deg]" strokeWidth={2} />
        </div>
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
