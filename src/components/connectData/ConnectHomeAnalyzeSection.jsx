"use client";

import { useLayoutEffect, useRef } from "react";

import DataView from "@/components/dataView";
import { ConnectHomeWorkspaceNav } from "@/components/connectData/ConnectHomeWorkspaceNav";
import { LargeAthenaPullPanel } from "@/components/connectData/LargeAthenaPullPanel";
import { useMyStateV2 } from "@/context/stateContextV2";
import {
  CONNECT_HOME_WORKSPACE_MIN_H,
  connectAnalyzeSectionFitClass,
  connectDemoAnalyzeFitClass,
  connectWorkspaceScrollInsetClass,
} from "@/lib/connectHubLayout";
import { scheduleConnectAnalyzeAnchorScroll } from "@/lib/connectHubScroll";
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
  showIntro = true,
  embeddedInFixedViewport = false,
  onPanelManualOpen,
}) {
  const ctx = useMyStateV2() ?? {};
  const isDemo = !!ctx.isDemo;
  const analyzeScrollTick = ctx.connectAnalyzeScrollTick ?? 0;
  const pull = ctx.connectDataLakePullState ?? {};
  const largePullView = pull.largePullView;
  const analyzeRef = useRef(null);

  const largePullActive = !!largePullView;
  const hideGridUntilTableReady =
    largePullActive && largePullView?.parseStatus !== "ready";

  useLayoutEffect(() => {
    if (embeddedInFixedViewport || !analyzeScrollTick) return;
    scheduleConnectAnalyzeAnchorScroll(null);
  }, [analyzeScrollTick, embeddedInFixedViewport]);

  return (
    <section
      ref={analyzeRef}
      id="connect-home-analyze"
      className={cn(
        "flex w-full max-w-none flex-col",
        showWorkspaceNav
          ? isDemo
            ? connectDemoAnalyzeFitClass
            : connectAnalyzeSectionFitClass
          : cn(
              CONNECT_HOME_WORKSPACE_MIN_H,
              connectWorkspaceScrollInsetClass,
              "mt-24 snap-start sm:mt-28 md:mt-32 lg:mt-40",
            ),
        className,
      )}
    >
      {showIntro ? (
        <div className="mb-4 shrink-0">
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Execute operations, bucketing, formulas on your data sheet. Download, JSON, CSV, xlsx.
            Pull more data via integrations or uploading your own data sheet. Chart and create your
            dashboards to share with your audience/ team.
          </p>
        </div>
      ) : null}

      {showWorkspaceNav ? (
        <ConnectHomeWorkspaceNav
          compact
          className="mb-2 shrink-0 px-0.5 sm:px-1"
          onPanelManualOpen={onPanelManualOpen}
        />
      ) : null}

      {pull.error ? (
        <p className="mb-4 max-w-xl shrink-0 text-sm text-destructive" role="alert">
          {pull.error}
        </p>
      ) : null}

      {largePullActive ? (
        <LargeAthenaPullPanel
          columns={largePullView.columns || []}
          rows={largePullView.rows || []}
          rowCount={largePullView.rowCount ?? 0}
          parseStatus={largePullView.parseStatus || "downloading"}
          parsedProgress={largePullView.parsedProgress}
          parseError={largePullView.parseError}
          progressLabel={pull.label}
          progressPct={pull.progress ?? 0}
          onViewDataTable={() => ctx.connectLargePullApplyRef?.current?.()}
          className="mb-4 shrink-0"
        />
      ) : null}

      <div
        className={cn(
          "flex min-h-0 w-full flex-1 flex-col",
          hideGridUntilTableReady && "sr-only",
        )}
        aria-hidden={hideGridUntilTableReady || undefined}
      >
        <DataView user={user} startNew={startNew} setStartNew={setStartNew} fillViewport />
      </div>
    </section>
  );
}
