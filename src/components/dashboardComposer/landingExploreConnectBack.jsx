"use client";

import { useCallback, useLayoutEffect } from "react";
import { ArrowLeft } from "lucide-react";

import { useIntegrationConnect } from "@/components/dashboardComposer/integrationConnectDialog";
import { useWorkspaceCanvas } from "@/components/dashboardComposer/workspaceCanvas";
import { useMyStateV2 } from "@/context/stateContextV2";
import { isLandingConnectExploreSurface } from "@/lib/landingDemoExplore";
import { cn } from "@/lib/utils";

/**
 * Reset Historical / Present explore guests to the origin integration connect picker.
 * Shared by the Back control and the blank-canvas catch-all (closed demo loop).
 */
export function resetLandingExploreToConnect({ ctx, connect, canvas } = {}) {
  canvas?.dismissRun?.();
  const pages = new Set(Object.keys(canvas?.blocksByPage || {}));
  if (canvas?.pageId) pages.add(canvas.pageId);
  for (const pageId of pages) canvas?.replacePageBlocks?.(pageId, []);
  ctx?.setWorkspaceStartTabs?.([]);
  ctx?.setActiveWorkspaceStartTabId?.(null);
  ctx?.setWelcomeTabRemoved?.(false);
  ctx?.setViewing?.("connectDataHome");
  connect?.open?.();
}

/**
 * True when `#demo` Historical / Present would show an empty stage (← Back only).
 * Waits out Save-and-run (`runFeed` / pending tabs) so we do not interrupt a pull.
 */
export function isLandingExploreBlankCanvas({ canvas, connect } = {}) {
  if (connect?.inlineOpen) return false;
  if (!canvas?.ready) return false;
  if (canvas?.runFeed) return false;
  if (canvas?.tabLoading) return false;
  if (canvas?.hasContent) return false;
  return true;
}

/**
 * Historical / Present explore: after Save and Go, Back resets to the integration
 * connect picker (closed demo loop — never leave guests on empty dashboard chrome).
 * Blank stages auto-bounce to the same origin connect page.
 */
export function LandingExploreConnectBack({ className }) {
  const ctx = useMyStateV2();
  const connect = useIntegrationConnect();
  const canvas = useWorkspaceCanvas();

  const exploreConnect =
    !!ctx?.landingDemo && isLandingConnectExploreSurface(ctx?.landingDemoSurface);

  const resetToConnect = useCallback(() => {
    resetLandingExploreToConnect({ ctx, connect, canvas });
  }, [canvas, connect, ctx]);

  const blankCanvas = exploreConnect && isLandingExploreBlankCanvas({ canvas, connect });

  // Catch-all: never leave guests on a blank Historical / Present stage.
  useLayoutEffect(() => {
    if (!blankCanvas) return;
    resetToConnect();
  }, [blankCanvas, resetToConnect]);

  if (!exploreConnect) return null;
  if (connect?.inlineOpen) return null;
  // Blank stage is reopening connect — skip the lone Back flash.
  if (blankCanvas) return null;

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
