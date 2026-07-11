"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { GuidedStepBody } from "./GuidedStepBody";

/**
 * Guide step with a Continue button (and optional assert gate).
 *
 * @param {{
 *   step: import("@/lib/guidedWorkflows/types").GuidedStep;
 *   stepIndex: number;
 *   totalSteps: number;
 *   onContinue: () => void;
 *   continueDisabled?: boolean;
 *   hideUpgradeCta?: boolean;
 *   className?: string;
 *   style?: React.CSSProperties;
 * }} props
 */
export function GuidedWorkflowInfoDialog({
  step,
  stepIndex,
  totalSteps,
  onContinue,
  continueDisabled = false,
  hideUpgradeCta = false,
  className,
  style,
}) {
  const showUpgradeCta = !hideUpgradeCta && !!step.ctaLink;
  const showFooterText = !hideUpgradeCta && !!step.footerText;

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
      <GuidedStepBody
        step={step}
        id="guided-info-body"
        className="mt-1.5 text-xs leading-relaxed text-muted-foreground"
      />
      {showFooterText ? (
        <p className="mt-3 text-xs leading-relaxed text-foreground">{step.footerText}</p>
      ) : null}
      <div
        className={cn(
          "mt-4 flex gap-2",
          showUpgradeCta ? "flex-col sm:flex-row sm:items-center sm:justify-between" : "justify-end",
        )}
      >
        {showUpgradeCta ? (
          <Button type="button" size="sm" className="h-8 text-xs" asChild>
            <Link href={step.ctaLink.href}>{step.ctaLink.label}</Link>
          </Button>
        ) : null}
        <Button
          type="button"
          size="sm"
          className={cn("h-8 text-xs", showUpgradeCta && "sm:ml-auto")}
          onClick={onContinue}
          disabled={continueDisabled}
          variant={showUpgradeCta ? "outline" : "default"}
        >
          {step.continueLabel || "Continue"}
        </Button>
      </div>
    </div>
  );
}
