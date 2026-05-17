"use client";

import { X } from "lucide-react";

import { CONNECT_FLOW_STEPS } from "@/lib/connectHomeFlow";
import { connectHubFlowStepsCollapsedPeekClass } from "@/lib/connectHubLayout";
import { cn } from "@/lib/utils";

const peekTabBaseClass =
  "pointer-events-auto flex h-6 w-5 flex-col items-center justify-center rounded-r border border-l-0 border-border/70 bg-white font-mono text-[10px] font-medium leading-none text-muted-foreground shadow-sm transition-colors hover:bg-muted/40 hover:text-foreground dark:bg-slate-950 dark:hover:bg-slate-900";

/**
 * Vertical step rail for the Connect hub (wireframe / inspiration layout).
 * @param {{
 *   currentStep: number;
 *   className?: string;
 *   sticky?: boolean;
 *   collapsible?: boolean;
 *   fixedRail?: boolean;
 *   expanded?: boolean;
 *   onExpandedChange?: (open: boolean) => void;
 * }} props
 */
export function ConnectHomeFlowSteps({
  currentStep,
  className,
  sticky = false,
  collapsible = false,
  fixedRail = false,
  expanded = true,
  onExpandedChange,
}) {
  const isExpanded = !collapsible || expanded;
  const peekTabClass = cn(
    peekTabBaseClass,
    fixedRail ? connectHubFlowStepsCollapsedPeekClass : "absolute left-full top-6 z-40",
  );

  return (
    <nav
      aria-label="Platform steps"
      className={cn(
        "flex flex-col",
        sticky && "sticky top-[4.5rem] z-10 self-start",
        collapsible && "overflow-visible",
        collapsible && !isExpanded && "w-0 min-w-0",
        className,
      )}
    >
      {!isExpanded && collapsible ? (
        <button
          type="button"
          className={peekTabClass}
          onClick={() => onExpandedChange?.(true)}
          aria-label={`Show platform steps (step ${currentStep})`}
          title={`Step ${currentStep} — show steps`}
        >
          {currentStep}
        </button>
      ) : null}

      {collapsible && isExpanded ? (
        <button
          type="button"
          className="mb-1 flex h-4 w-4 shrink-0 items-center justify-center self-start p-0 text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => onExpandedChange?.(false)}
          aria-label="Hide platform steps"
          title="Hide steps"
        >
          <X className="h-3 w-3" strokeWidth={2} aria-hidden />
        </button>
      ) : null}

      <div
        className={cn(
          "relative w-[8.5rem] lg:w-[10rem] xl:w-[11rem]",
          collapsible && "transition-[transform,opacity] duration-300 ease-in-out",
          collapsible && !isExpanded && "-translate-x-full pointer-events-none opacity-0",
        )}
      >
        <ol className="flex flex-col gap-6">
          {CONNECT_FLOW_STEPS.map((item) => {
            const isActive = currentStep === item.step;

            return (
              <li key={item.step}>
                <div
                  className={cn(
                    "px-2.5 py-2 transition-colors",
                    isActive
                      ? "border-primary/20 bg-muted/35"
                      : "border-transparent opacity-40",
                  )}
                >
                  <p
                    className={cn(
                      "text-[11px] font-medium leading-snug",
                      isActive ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <span className="text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                      Step {item.step}
                    </span>
                    <span className="mt-0.5 block">{item.title}</span>
                  </p>
                  <p className="mt-0.5 text-[10px] leading-snug text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}
