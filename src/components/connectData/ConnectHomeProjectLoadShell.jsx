"use client";

import { ConnectProgressWithLabel } from "@/components/integrationsView/integrationPlayground/integrations/polymarketHistorical/ConnectProgressWithLabel";
import { ConnectHomeWorkspaceNav } from "@/components/connectData/ConnectHomeWorkspaceNav";
import { Skeleton } from "@/components/ui/skeleton";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  connectAnalyzeSectionFitClass,
  connectDemoAnalyzeFitClass,
} from "@/lib/connectHubLayout";
import { cn } from "@/lib/utils";

function GridSkeletonBody({ rows = 14 }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border/50 bg-white dark:bg-slate-950">
      <div className="flex shrink-0 gap-px border-b border-border/40 bg-muted/30 p-1">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={`h-${i}`} className="h-7 flex-1 rounded-sm" />
        ))}
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-px p-1">
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} className="flex min-h-[1.75rem] flex-1 gap-px">
            {Array.from({ length: 6 }, (_, col) => (
              <Skeleton
                key={`${row}-${col}`}
                className={cn(
                  "h-full min-h-[1.5rem] flex-1 rounded-sm",
                  col === 0 && "max-w-[2.5rem] shrink-0 flex-none",
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConnectHomeProjectLoadShell({ isDemo = false, className }) {
  const load = useMyStateV2()?.connectProjectLoadState ?? {};
  if (!load.loading) return null;

  const title = load.projectName?.trim()
    ? `Loading “${load.projectName.trim()}”`
    : "Loading project";

  return (
    <section
      className={cn(
        "flex w-full max-w-none flex-col",
        isDemo ? connectDemoAnalyzeFitClass : connectAnalyzeSectionFitClass,
        className,
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <div className="mb-3 shrink-0 space-y-3 px-0.5 sm:px-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <ConnectProgressWithLabel
          label={load.message || "Loading project…"}
          progress={load.progress ?? 0}
        />
      </div>

      <ConnectHomeWorkspaceNav
        compact
        className="pointer-events-none mb-2 shrink-0 px-0.5 opacity-60 sm:px-1"
      />

      <div className="flex min-h-0 flex-1 gap-3 overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <GridSkeletonBody />
        </div>
        <div className="hidden w-[min(18rem,28vw)] shrink-0 flex-col gap-2 border-l border-border/40 pl-3 sm:flex">
          <Skeleton className="h-9 w-full rounded-md" />
          <Skeleton className="h-24 w-full rounded-md" />
          <Skeleton className="h-24 w-full rounded-md" />
          <Skeleton className="h-32 w-full flex-1 rounded-md" />
        </div>
      </div>
    </section>
  );
}
