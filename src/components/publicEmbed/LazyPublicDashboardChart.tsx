"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ChartEmbedSkeleton } from "@/components/publicEmbed/ChartEmbedSkeleton";
import { applyLiveCandleOverlay } from "@/lib/liveFeeds/applyLiveCandleOverlay";

const PublicDashboardChartBlock = dynamic(
  () =>
    import("@/components/dashboardComposer/PublicDashboardChartBlock").then(
      (m) => m.PublicDashboardChartBlock,
    ),
  { loading: () => <ChartEmbedSkeleton className="min-h-[200px]" /> },
);

type ChartPayload = {
  chart?: {
    chart_name?: string;
    chart_properties?: unknown[];
    rechartsBuilder?: {
      v: number;
      selChartType?: string;
      candlestickSheetId?: string;
      candlestickOhlcSetId?: string;
      titleHidden?: boolean;
      subTitleHidden?: boolean;
      selX?: string | null;
      selY?: string[];
    };
  };
  rows?: unknown[];
  dataSheets?: Record<string, unknown>;
};

type ChartLink = { mode?: string; slug?: string } | null;

type LiveCandleOverlay = {
  sheetId: string;
  rows: Record<string, unknown>[];
  periodInterval?: number;
} | null;

function chartPayloadHasData(chartPayload: ChartPayload | null | undefined): boolean {
  if (!chartPayload) return false;
  if (Array.isArray(chartPayload.rows) && chartPayload.rows.length > 0) return true;
  return Object.values(chartPayload.dataSheets || {}).some(
    (s) => Array.isArray((s as { data?: unknown[] })?.data) && (s as { data: unknown[] }).data.length > 0,
  );
}

export { applyLiveCandleOverlay };

export function LazyPublicDashboardChart({
  username,
  slug,
  chartId,
  initialPayload,
  ownerHandle,
  layoutColumnKey,
  chartTitle,
  chartSlug: initialChartSlug,
  liveOverlay = null,
}: {
  username: string;
  slug: string;
  chartId: string;
  initialPayload?: ChartPayload | null;
  ownerHandle?: string;
  layoutColumnKey?: string;
  dashboardSlug?: string;
  chartTitle?: string;
  chartSlug?: string;
  liveOverlay?: LiveCandleOverlay;
}) {
  const [basePayload, setBasePayload] = useState<ChartPayload | null>(() =>
    initialPayload && chartPayloadHasData(initialPayload) ? initialPayload : null,
  );
  const [chartSlug, setChartSlug] = useState<string | undefined>(initialChartSlug);
  const [failed, setFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fetchedRef = useRef(!!chartPayloadHasData(initialPayload));
  const liveOverlayRef = useRef(liveOverlay);
  liveOverlayRef.current = liveOverlay;

  const payload = useMemo(
    () => applyLiveCandleOverlay(basePayload, liveOverlay),
    [basePayload, liveOverlay],
  );

  useEffect(() => {
    if (initialPayload && chartPayloadHasData(initialPayload)) {
      setBasePayload(initialPayload);
      fetchedRef.current = true;
    }
  }, [initialPayload]);

  useEffect(() => {
    if (initialChartSlug) setChartSlug(initialChartSlug);
  }, [initialChartSlug]);

  // Live overlay alone is enough to render when progressive fetch is still pending
  useEffect(() => {
    if (liveOverlay?.rows?.length) {
      setFailed(false);
    }
  }, [liveOverlay]);

  useEffect(() => {
    if (fetchedRef.current || !chartId) return;
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;

    const loadChart = () => {
      if (fetchedRef.current || cancelled) return;
      fetchedRef.current = true;
      fetch(
        `/api/public/dashboards/${encodeURIComponent(username)}/${encodeURIComponent(slug)}/charts/${encodeURIComponent(chartId)}`,
        { credentials: "include" },
      )
        .then((r) => r.json())
        .then((j) => {
          if (cancelled) return;
          if (!j?.success || !j?.data?.chartPayload) {
            // Live overlay may still render the candles
            if (!liveOverlayRef.current?.rows?.length) setFailed(true);
            return;
          }
          setBasePayload(j.data.chartPayload);
          if (j.data.chartLink?.slug) setChartSlug(j.data.chartLink.slug);
        })
        .catch(() => {
          if (!cancelled && !liveOverlayRef.current?.rows?.length) setFailed(true);
        });
    };

    if (typeof IntersectionObserver === "undefined") {
      loadChart();
      return () => {
        cancelled = true;
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          loadChart();
        }
      },
      { rootMargin: "200px 0px", threshold: 0.01 },
    );
    observer.observe(el);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [username, slug, chartId]);

  if (failed && !chartPayloadHasData(payload)) {
    return (
      <div className="flex min-h-[120px] flex-1 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
        Chart unavailable
      </div>
    );
  }

  // Prefer rendering as soon as live rows (or base rows) exist — don't wait on structure fetch.
  if (!payload || !chartPayloadHasData(payload)) {
    return (
      <div ref={containerRef} className="flex min-h-0 flex-1 flex-col">
        <ChartEmbedSkeleton className="min-h-[200px]" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex min-h-0 flex-1 flex-col">
      <PublicDashboardChartBlock
        chartPayload={payload}
        ownerHandle={ownerHandle}
        chartSlug={chartSlug}
        chartId={chartId}
        layoutColumnKey={layoutColumnKey}
        dashboardSlug={slug}
        chartTitle={chartTitle}
      />
    </div>
  );
}

export type { ChartPayload, ChartLink, LiveCandleOverlay };
