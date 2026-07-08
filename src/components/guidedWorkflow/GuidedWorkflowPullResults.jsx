"use client";

import { useEffect, useRef } from "react";

import DashBody from "@/app/dashboard/dashBody";
import LiveStreamManager from "@/app/dashboard/components/liveStreamManager";
import { StateProvider } from "@/context/stateContext";
import { StateProviderV2, useMyStateV2 } from "@/context/stateContextV2";
import { applyHubQueryDraft } from "@/lib/hubs/applyHubQueryDraft";
import { cn } from "@/lib/utils";

function GuidedWorkflowPullBootstrap({ draft }) {
  const ctx = useMyStateV2();
  const appliedRef = useRef(false);

  useEffect(() => {
    if (!ctx || !draft || appliedRef.current) return;
    appliedRef.current = true;
    applyHubQueryDraft(ctx, draft, { autoPull: false, guidedInlinePull: true });
  }, [ctx, draft]);

  return null;
}

/**
 * Inline data sheet + pull progress for guided workflows (landing-page demo layout).
 *
 * @param {{
 *   draft: import("@/lib/hubs/hubQueryDraft").HubQueryDraft;
 *   embedded?: boolean;
 *   className?: string;
 * }} props
 */
export function GuidedWorkflowPullResults({ draft, embedded = false, className }) {
  const sampleId = draft?.sampleId || "";

  return (
    <div
      className={cn(
        "relative isolate w-full overflow-hidden rounded-xl border border-border bg-background shadow-sm ring-1 ring-border/60",
        embedded
          ? "h-[min(85vh,820px)] min-h-[560px]"
          : "h-[min(90vh,920px)] min-h-[720px]",
        className,
      )}
    >
      <StateProvider>
        <StateProviderV2
          initialSettings={{
            demo: true,
            guidedWorkflowPull: true,
            guidedWorkflowPullRequested: true,
            viewing: "connectDataHome",
            connectWorkspace: "kalshiHistorical",
            connectDataLakeSampleId: sampleId,
            connectHomeAnalyzeActive: true,
            connectDataLakePullState: {
              loading: true,
              label: "Preparing your data pull…",
              progress: 2,
              error: null,
            },
            rightPanelOpen: false,
            rightPanelTab: "integrations",
            integrationSidebar: "kalshiHistorical",
            connectHomeFlowStepsOpen: false,
          }}
        >
          <LiveStreamManager />
          <GuidedWorkflowPullBootstrap draft={draft} />
          <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
            <DashBody user={null} />
          </div>
        </StateProviderV2>
      </StateProvider>
    </div>
  );
}
