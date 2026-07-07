"use client";

import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   step: import("@/lib/guidedWorkflows/types").GuidedStep;
 *   stepIndex: number;
 *   totalSteps: number;
 *   onExit: () => void;
 *   className?: string;
 *   style?: React.CSSProperties;
 * }} props
 */
export function GuidedWorkflowTooltip({
  step,
  stepIndex,
  totalSteps,
  onExit,
  className,
  style,
}) {
  return (
    <div
      className={cn(
        "pointer-events-auto w-[min(100vw-2rem,22rem)] rounded-xl border border-border bg-background p-4 shadow-lg",
        className,
      )}
      style={style}
      role="dialog"
      aria-labelledby="guided-step-title"
      aria-describedby="guided-step-body"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Step {stepIndex + 1} of {totalSteps}
        </p>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground"
          onClick={onExit}
          aria-label="Exit guide"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      <h4 id="guided-step-title" className="mt-1 text-sm font-semibold text-foreground">
        {step.title}
      </h4>
      <p id="guided-step-body" className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        {step.body}
      </p>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border/60 pt-3">
        <p className="text-[10px] text-muted-foreground">Press Esc to exit anytime</p>
        <Button type="button" variant="outline" size="sm" className="h-7 text-xs" onClick={onExit}>
          Exit guide
        </Button>
      </div>
    </div>
  );
}
