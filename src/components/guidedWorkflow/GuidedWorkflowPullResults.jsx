"use client";

import { useEffect, useMemo, useRef } from "react";

import DashBody from "@/app/dashboard/dashBody";
import LiveStreamManager from "@/app/dashboard/components/liveStreamManager";
import { StateProvider } from "@/context/stateContext";
import { StateProviderV2, useMyStateV2 } from "@/context/stateContextV2";
import {
  applyHubQueryDraft,
  buildColumnComposeItemsFromSelections,
} from "@/lib/hubs/applyHubQueryDraft";
import { normalizeHubQueryDraft, normalizeHubQueryWhereFilters } from "@/lib/hubs/hubQueryDraft";
import { cn } from "@/lib/utils";

import { GuidedWorkflowPostPullSync } from "./GuidedWorkflowPostPullSync";

function GuidedWorkflowPullBootstrap({ draft }) {
  const ctx = useMyStateV2();
  const appliedRef = useRef(false);
  const normalizedDraft = useMemo(
    () =>
      draft
        ? normalizeHubQueryDraft({
            ...draft,
            whereFilters: normalizeHubQueryWhereFilters(draft.whereFilters),
          })
        : null,
    [draft],
  );

  useEffect(() => {
    if (!ctx || !normalizedDraft || appliedRef.current) return;
    appliedRef.current = true;
    applyHubQueryDraft(ctx, normalizedDraft, { autoPull: false, guidedInlinePull: true });
  }, [ctx, normalizedDraft]);

  return null;
}

/**
 * Inline data sheet + pull progress for guided workflows (landing-page demo layout).
 *
 * @param {{
 *   draft: import("@/lib/hubs/hubQueryDraft").HubQueryDraft;
 *   embedded?: boolean;
 *   mockup?: boolean;
 *   connectHome?: boolean;
 *   className?: string;
 *   onPullComplete?: () => void;
 * }} props
 */
export function GuidedWorkflowPullResults({
  draft,
  embedded = false,
  mockup = false,
  connectHome = false,
  className,
  onPullComplete,
}) {
  const sampleId = draft?.sampleId || "";
  const whereFilters = normalizeHubQueryWhereFilters(draft?.whereFilters);
  const guidedHubDraft = draft ? { ...draft, whereFilters } : null;
  const columnSelections = draft?.columnSelections || {};
  const columnComposeItems = useMemo(() => {
    if (Array.isArray(draft?.columnComposeItems) && draft.columnComposeItems.length > 0) {
      return draft.columnComposeItems;
    }
    return buildColumnComposeItemsFromSelections(sampleId, columnSelections);
  }, [draft?.columnComposeItems, sampleId, columnSelections]);

  const flushChrome = mockup || connectHome;

  return (
    <div
      className={cn(
        flushChrome
          ? "relative flex w-full flex-col overflow-hidden"
          : "relative isolate w-full overflow-hidden rounded-xl border border-border bg-background shadow-sm ring-1 ring-border/60",
        connectHome
          ? "min-h-0 flex-1"
          : flushChrome
            ? embedded
              ? "min-h-[min(85vh,820px)]"
              : "min-h-[min(90vh,920px)]"
            : embedded
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
            guidedWorkflowHubDraft: guidedHubDraft,
            viewing: "connectDataHome",
            connectWorkspace: "kalshiHistorical",
            connectDataLakeSampleId: sampleId,
            connectDataLakeColumnSelections: columnSelections,
            dataLakeColumnComposeItems: columnComposeItems,
            dataLakeComposeWhereFilters: whereFilters,
            dataLakeComposeOrderBy: Array.isArray(draft?.orderBy) ? draft.orderBy : [],
            dataLakeComposeLimitOpen: !!draft?.composeLimitOpen,
            dataLakeComposeLimitValue: draft?.composeLimitValue ?? "",
            dataLakeComposeLimitScope: draft?.composeLimitScope ?? "primary",
            connectActiveComposeOps: Array.isArray(draft?.activeComposeOps)
              ? draft.activeComposeOps
              : [],
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
          <GuidedWorkflowPostPullSync onPullComplete={onPullComplete} />
          <div
            className={cn(
              "flex min-h-0 w-full flex-col overflow-hidden",
              flushChrome ? "min-h-[min(85vh,820px)] flex-1" : "h-full",
              connectHome && "min-h-0",
            )}
          >
            <DashBody user={null} />
          </div>
        </StateProviderV2>
      </StateProvider>
    </div>
  );
}
