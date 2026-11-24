"use client";

import { ArrowLeft } from "lucide-react";

import { useIntegrationConnect } from "@/components/dashboardComposer/integrationConnectDialog";
import { useWorkspaceCanvas } from "@/components/dashboardComposer/workspaceCanvas";
import { useMyStateV2 } from "@/context/stateContextV2";
import { isLandingConnectExploreSurface } from "@/lib/landingDemoExplore";
import { cn } from "@/lib/utils";

/**
 * Historical / Present explore: after Save and Go, Back resets to the integration
 * connect picker (closed demo loop — never leave guests on empty dashboard chrome).
 */
export function LandingExploreConnectBack({ className }) {
  const ctx = useMyStateV2();
  const connect = useIntegrationConnect();
  const canvas = useWorkspaceCanvas();

  if (!ctx?.landingDemo || !isLandingConnectExploreSurface(ctx?.landingDemoSurface)) return null;
  if (connect?.inlineOpen) return null;

  const resetToConnect = () => {
    canvas?.dismissRun?.();
    const pages = new Set(Object.keys(canvas?.blocksByPage || {}));
    if (canvas?.pageId) pages.add(canvas.pageId);
    for (const pageId of pages) canvas?.replacePageBlocks?.(pageId, []);
    ctx.setWorkspaceStartTabs?.([]);
    ctx.setActiveWorkspaceStartTabId?.(null);
    ctx.setWelcomeTabRemoved?.(false);
    ctx.setViewing?.("connectDataHome");
    connect?.open?.();
  };

  return (
    <button
      type="button"
      onClick={resetToConnect}
      aria-label="Back to integrations"
      className={cn(
        "pointer-events-auto absolute left-3 top-3 z-[46] inline-flex h-9 items-center gap-1.5 rounded-lg border border-border/70 bg-background/95 px-3 text-sm font-medium text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-muted",
        className,
      )}
    >
      <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden />
      Back
    </button>
  );
}
