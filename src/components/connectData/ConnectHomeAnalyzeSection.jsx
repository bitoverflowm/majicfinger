"use client";

import { useLayoutEffect, useRef } from "react";

import DataView from "@/components/dataView";
import { ConnectHomeWorkspaceNav } from "@/components/connectData/ConnectHomeWorkspaceNav";
import { useMyStateV2 } from "@/context/stateContextV2";
import { CONNECT_FLOW_STEP } from "@/lib/connectHomeFlow";
import { connectAnalyzeDashboardSectionClass } from "@/lib/connectHubLayout";
import { scheduleConnectAnalyzeScroll } from "@/lib/connectHubScroll";
import { cn } from "@/lib/utils";

/**
 * Step 2 — analyze: progress while pulling, then AG Grid datasheet (same as dataStart).
 */
export function ConnectHomeAnalyzeSection({
  user,
  startNew,
  setStartNew,
  className,
  showWorkspaceNav = false,
}) {
  const analyzeScrollTick = useMyStateV2()?.connectAnalyzeScrollTick ?? 0;
  const pull = useMyStateV2()?.connectDataLakePullState ?? {};
  const analyzeRef = useRef(null);

  useLayoutEffect(() => {
    if (!analyzeScrollTick) return;
    scheduleConnectAnalyzeScroll(analyzeRef, null);
  }, [analyzeScrollTick]);

  return (
    <section
      ref={analyzeRef}
      id="connect-home-analyze"
      className={cn("w-full max-w-none", connectAnalyzeDashboardSectionClass, className)}
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

      {showWorkspaceNav ? (
        <ConnectHomeWorkspaceNav compact className="mb-3 shrink-0 px-0.5 sm:px-1" />
      ) : null}

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
