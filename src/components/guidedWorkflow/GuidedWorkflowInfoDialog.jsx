"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Read-only guide step — user advances with Continue only.
 *
 * @param {{
 *   step: import("@/lib/guidedWorkflows/types").GuidedStep;
 *   stepIndex: number;
 *   totalSteps: number;
 *   onContinue: () => void;
 *   className?: string;
 *   style?: React.CSSProperties;
 * }} props
 */
export function GuidedWorkflowInfoDialog({
  step,
  stepIndex,
  totalSteps,
  onContinue,
  className,
  style,
}) {
  return (
    <div
      className={cn(
        "pointer-events-auto w-[min(100vw-2rem,24rem)] rounded-xl border border-border bg-background p-4 shadow-lg",
        className,
      )}
      style={style}
      role="dialog"
      aria-labelledby="guided-info-title"
      aria-describedby="guided-info-body"
    >
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        Step {stepIndex + 1} of {totalSteps}
      </p>
      <h4 id="guided-info-title" className="mt-1 text-sm font-semibold text-foreground">
        {step.title}
      </h4>
      <p id="guided-info-body" className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
        {step.body}
      </p>
      <div className="mt-4 flex justify-end">
        <Button type="button" size="sm" className="h-8 text-xs" onClick={onContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
}
