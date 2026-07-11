"use client";

import { cn } from "@/lib/utils";
import { useMyStateV2 } from "@/context/stateContextV2";
import { connectHubAnalyzeViewportClass, connectHubDemoInsetClass } from "@/lib/connectHubLayout";
import { ConnectHomeFlowSteps } from "@/components/connectData/ConnectHomeFlowSteps";

/**
 * Step 2 — fixed viewport: sheet / chart / dashboard + side panel (no hub scroll stack).
 * Demo shows the STEP rail once; nested guided-pull shells omit it to avoid a double rail.
 */
export function ConnectHomeAnalyzeViewport({ isDemo, connectFlowStep, children, className }) {
  const guidedWorkflowPull = !!useMyStateV2()?.guidedWorkflowPull;
  const showDemoFlowSteps = isDemo && !guidedWorkflowPull;

  return (
    <div
      className={cn(
        connectHubAnalyzeViewportClass,
        isDemo && "overflow-x-visible overflow-y-hidden",
        className,
      )}
    >
      {showDemoFlowSteps ? (
        <div
          className={cn(
            "relative grid min-h-0 flex-1 grid-cols-[8.5rem_minmax(0,1fr)] gap-x-6 lg:grid-cols-[10rem_minmax(0,1fr)] lg:gap-x-8",
            connectHubDemoInsetClass,
          )}
        >
          <ConnectHomeFlowSteps
            currentStep={connectFlowStep}
            sticky
            className="shrink-0 self-start pt-2"
          />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-visible overflow-y-hidden">
            {children}
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden",
            isDemo
              ? cn(connectHubDemoInsetClass, "overflow-x-visible overflow-y-hidden")
              : "md:px-6 lg:px-8",
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}
