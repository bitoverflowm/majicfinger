"use client";

import { useLayoutEffect, useRef } from "react";

import DataView from "@/components/dataView";
import { ConnectHomePullProgress } from "@/components/connectData/ConnectHomePullProgress";
import { useMyStateV2 } from "@/context/stateContextV2";
import { CONNECT_FLOW_STEP } from "@/lib/connectHomeFlow";
import { connectWorkspaceScrollInsetClass } from "@/lib/connectHubLayout";
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
    const t = window.setTimeout(() => {
      analyzeRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
    return () => window.clearTimeout(t);
  }, [analyzeScrollTick]);

  return (
    <section
      ref={analyzeRef}
      id="connect-home-analyze"
      className={cn(
        "mt-12 border-t border-border/40 pt-8 sm:mt-14 sm:pt-10",
        connectWorkspaceScrollInsetClass,
        className,
      )}
    >
      <div className="mb-4">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          Step {CONNECT_FLOW_STEP.ANALYZE}
        </p>
        <h2 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl">
          Analyze your data
        </h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          Your pull runs with the same SQL as the integrations panel. Results land in the sheet below.
        </p>
      </div>

      <ConnectHomePullProgress className="mb-4 w-full max-w-xl" />

      {pull.error ? (
        <p className="mb-4 max-w-xl text-sm text-destructive" role="alert">
          {pull.error}
        </p>
      ) : null}

      <div className="min-h-[min(24rem,50vh)] w-full">
        <DataView user={user} startNew={startNew} setStartNew={setStartNew} />
      </div>
    </section>
  );
}
