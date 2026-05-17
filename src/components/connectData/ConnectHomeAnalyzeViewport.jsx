"use client";

import { cn } from "@/lib/utils";
import { connectHubAnalyzeViewportClass } from "@/lib/connectHubLayout";
import { ConnectHomeFlowSteps } from "@/components/connectData/ConnectHomeFlowSteps";

/**
 * Step 2 — fixed viewport: sheet / chart / dashboard + side panel (no hub scroll stack).
 */
export function ConnectHomeAnalyzeViewport({ isDemo, connectFlowStep, children, className }) {
  return (
    <div className={cn(connectHubAnalyzeViewportClass, className)}>
      {isDemo ? (
        <div className="grid min-h-0 flex-1 grid-cols-[8.5rem_minmax(0,1fr)] gap-x-6 lg:grid-cols-[10rem_minmax(0,1fr)] lg:gap-x-8">
          <ConnectHomeFlowSteps
            currentStep={connectFlowStep}
            sticky
            className="shrink-0 self-start pt-2"
          />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:px-6 lg:px-8">
          {children}
        </div>
      )}
    </div>
  );
}
