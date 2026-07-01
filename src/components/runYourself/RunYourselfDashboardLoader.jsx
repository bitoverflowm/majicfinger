"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useMyStateV2 } from "@/context/stateContextV2";
import { runConnectProjectLoad } from "@/lib/connectProjectLoad";

/**
 * Loads forked project from ?project=&chart=&runYourselfSession=1 query params.
 */
export function RunYourselfDashboardLoader({ userId }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const loadedRef = useRef(false);
  const ctx = useMyStateV2();

  useEffect(() => {
    const projectId = searchParams.get("project") || searchParams.get("runYourselfFork");
    if (!projectId || !userId || loadedRef.current) return;

    const chartId = searchParams.get("chart");
    const sessionActive = searchParams.get("runYourselfSession") === "1";

    loadedRef.current = true;
    if (sessionActive) {
      ctx.setRunYourselfSessionActive?.(true);
      ctx.setRunYourselfLocked?.(false);
    } else if (searchParams.get("runYourselfLocked") === "1") {
      ctx.setRunYourselfLocked?.(true);
    }

    (async () => {
      try {
        await runConnectProjectLoad({
          dataSetId: projectId,
          userId,
          projectName: "Forked analysis",
          preferredChartId: chartId || null,
          rightPanelTab: "charts",
          connectHomeCenterView: "chart",
          loadedDataMeta: ctx.loadedDataMeta,
          setConnectProjectLoadState: ctx.setConnectProjectLoadState,
          setDataSheets: ctx.setDataSheets,
          setActiveSheetId: ctx.setActiveSheetId,
          setConnectedData: ctx.setConnectedData,
          setConnectedCols: ctx.setConnectedCols,
          setDataTypes: ctx.setDataTypes,
          setLoadedDataMeta: ctx.setLoadedDataMeta,
          setLoadedDataId: ctx.setLoadedDataId,
          setSavedCharts: ctx.setSavedCharts,
          setChartSheets: ctx.setChartSheets,
          setActiveChartSheetId: ctx.setActiveChartSheetId,
          setLoadedChartMeta: ctx.setLoadedChartMeta,
          setLoadedChartBuilderSnapshot: ctx.setLoadedChartBuilderSnapshot,
          setRefetchChartDashboardsTick: ctx.setRefetchChartDashboardsTick,
          setViewing: ctx.setViewing,
          requestConnectWorkspace: ctx.requestConnectWorkspace,
          setConnectHomeAnalyzeActive: ctx.setConnectHomeAnalyzeActive,
          requestConnectAnalyzeScroll: ctx.requestConnectAnalyzeScroll,
          setConnectHomeCenterView: ctx.setConnectHomeCenterView,
          setRightPanelTab: ctx.setRightPanelTab,
          setRightPanelOpen: ctx.setRightPanelOpen,
          setChartDataOverride: ctx.setChartDataOverride,
          setChartDataOverrideMeta: ctx.setChartDataOverrideMeta,
          liveStreamActions: ctx.liveStreamActions,
          liveStreamState: ctx.liveStreamState,
        });

        router.replace("/dashboard", { scroll: false });
      } catch (e) {
        console.error("[RunYourselfDashboardLoader]", e);
        loadedRef.current = false;
      }
    })();
  }, [searchParams, userId, ctx, router]);

  return null;
}
