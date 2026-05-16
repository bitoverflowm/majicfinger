"use client";

import { useLayoutEffect, useRef } from "react";

import DataView from "@/components/dataView";
import { ConnectHomePullProgress } from "@/components/connectData/ConnectHomePullProgress";
import { useMyStateV2 } from "@/context/stateContextV2";
import { CONNECT_FLOW_STEP } from "@/lib/connectHomeFlow";
import { connectAnalyzeDashboardSectionClass } from "@/lib/connectHubLayout";
import { scheduleConnectAnalyzeScroll } from "@/lib/connectHubScroll";
import { cn } from "@/lib/utils";

/**
 * Step 2 — analyze: progress while pulling, then AG Grid datasheet (same as dataStart).
 */
export function ConnectHomeAnalyzeSection({ user, startNew, setStartNew, className }) {
  const pull = useMyStateV2()?.connectDataLakePullState ?? {};
  const analyzeScrollTick = useMyStateV2()?.connectAnalyzeScrollTick ?? 0;
  const analyzeRef = useRef(null);

  useLayoutEffect(() => {
    if (!analyzeScrollTick) return;
    scheduleConnectAnalyzeScroll(analyzeRef, null);
  }, [analyzeScrollTick]);

  return (
    <section
      ref={analyzeRef}
      id="connect-home-analyze"
      className={cn(connectAnalyzeDashboardSectionClass, className)}
    >
      <div className="mb-4 shrink-0">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Step {CONNECT_FLOW_STEP.ANALYZE}
        </p>
        <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          Analyze your data
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          You can execute operations, bucketing, formulas, or chart and create
        </p>
      </div>

      <ConnectHomePullProgress className="mb-4 w-full max-w-xl shrink-0" />

      {pull.error ? (
        <p className="mb-4 max-w-xl text-sm text-destructive" role="alert">
          {pull.error}
        </p>
      ) : null}

      <div className="flex min-h-[min(24rem,40vh)] min-h-0 w-full flex-1 flex-col">
        <DataView user={user} startNew={startNew} setStartNew={setStartNew} fillViewport />
      </div>
    </section>
  );
}
