"use client";

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { applyLiveCandleOverlay } from "@/lib/liveFeeds/applyLiveCandleOverlay";
import { applyLiveOverlay } from "@/lib/liveFeeds/applyLiveOverlay";
import { sheetDataLooksLikeTrades } from "@/lib/liveFeeds/merge/kalshiTradesUpsert";
import { ChartPaneSkeleton } from "@/components/publicEmbed/PublicDashboardSkeletons";
import { PublicViewerChart } from "@/components/publicEmbed/PublicViewerChart";
import type { PublicChartBatchLoader } from "@/components/publicEmbed/publicChartBatchLoader";
import type { ViewerChartPayload } from "@/lib/publicChartViewerPayload";

type LiveCandleOverlay = {
  sheetId: string;
  rows: Record<string, unknown>[];
  periodInterval?: number;
} | null;

function chartPayloadHasData(chartPayload: ViewerChartPayload | null | undefined): boolean {
  if (!chartPayload) return false;
  if (Array.isArray(chartPayload.rows) && chartPayload.rows.length > 0) return true;
  return Object.values(chartPayload.dataSheets || {}).some((s) => Array.isArray(s?.data) && s.data.length > 0);
}

export function useLoadedChart(loader: PublicChartBatchLoader, chartId: string) {
  const subscribe = useCallback((cb: () => void) => loader.subscribe(cb), [loader]);
  const getEntry = useCallback(() => loader.get(chartId), [loader, chartId]);
  return useSyncExternalStore(subscribe, getEntry, getEntry);
}

/**
 * Chart body for a published dashboard card. Data comes from the shared batch loader:
 * the request fires when the card nears the viewport (or immediately when the server
 * already inlined it), and live rows overlay the published snapshot.
 */
export function LazyPublicDashboardChart({
  loader,
  chartId,
  liveOverlay = null,
  live = false,
  legacyProps,
}: {
  loader: PublicChartBatchLoader;
  chartId: string;
  liveOverlay?: LiveCandleOverlay;
  live?: boolean;
  legacyProps: {
    ownerHandle?: string;
    layoutColumnKey?: string;
    dashboardSlug?: string;
    chartTitle?: string;
  };
}) {
  const entry = useLoadedChart(loader, chartId);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (entry !== undefined) return;
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      void loader.load(chartId);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          void loader.load(chartId);
        }
      },
      { rootMargin: "1200px 0px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [entry, loader, chartId]);

  const basePayload = entry?.chartPayload ?? null;
  const payload = useMemo(() => {
    if (!liveOverlay?.sheetId || !Array.isArray(liveOverlay.rows) || !liveOverlay.rows.length) {
      return basePayload;
    }
    if (sheetDataLooksLikeTrades(liveOverlay.rows)) {
      return applyLiveOverlay(basePayload, {
        overlayKind: "sheet_rows",
        sheets: { [liveOverlay.sheetId]: liveOverlay.rows },
        params: { periodInterval: liveOverlay.periodInterval },
      });
    }
    return applyLiveCandleOverlay(basePayload, liveOverlay);
  }, [basePayload, liveOverlay]) as ViewerChartPayload | null;

  if (entry === null && !chartPayloadHasData(payload)) {
    return (
      <div className="mx-3 mb-3 flex min-h-[120px] flex-1 items-center justify-center rounded-lg border border-dashed border-border/70 text-[12px] text-muted-foreground">
        Chart unavailable
      </div>
    );
  }

  if (!payload || !chartPayloadHasData(payload)) {
    return (
      <div ref={containerRef} className="flex min-h-0 flex-1 flex-col">
        <ChartPaneSkeleton />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1 flex-col">
      <PublicViewerChart payload={payload} live={live} legacyProps={{ ...legacyProps, chartId }} />
    </div>
  );
}

export type { LiveCandleOverlay };
