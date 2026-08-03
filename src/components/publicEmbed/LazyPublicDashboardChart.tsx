"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { ChartEmbedSkeleton } from "@/components/publicEmbed/ChartEmbedSkeleton";

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
    rechartsBuilder?: { v: number; candlestickSheetId?: string };
  };
  rows?: unknown[];
  dataSheets?: Record<string, unknown>;
};

type ChartLink = { mode?: string; slug?: string } | null;

type LiveCandleOverlay = {
  sheetId: string;
  rows: Record<string, unknown>[];
} | null;

function chartPayloadHasData(chartPayload: ChartPayload | null | undefined): boolean {
  if (!chartPayload) return false;
  if (Array.isArray(chartPayload.rows) && chartPayload.rows.length > 0) return true;
  return Object.values(chartPayload.dataSheets || {}).some(
    (s) => Array.isArray((s as { data?: unknown[] })?.data) && (s as { data: unknown[] }).data.length > 0,
  );
}

function resolveCandleSheetId(payload: ChartPayload | null | undefined, preferred?: string): string {
  const preferredId = String(preferred || "").trim();
  if (preferredId) return preferredId;
  const rb =
    payload?.chart?.rechartsBuilder ||
    (Array.isArray(payload?.chart?.chart_properties) &&
    payload.chart.chart_properties[0] &&
    typeof payload.chart.chart_properties[0] === "object"
      ? (payload.chart.chart_properties[0] as { rechartsBuilder?: { candlestickSheetId?: string } })
          .rechartsBuilder
      : null);
  return String(rb?.candlestickSheetId || "").trim();
}

/**
 * Overlay on-demand live candle rows onto a published chart payload (no Mongo write).
 */
export function applyLiveCandleOverlay(
  base: ChartPayload | null | undefined,
  overlay: LiveCandleOverlay,
): ChartPayload | null {
  if (!base) return null;
  if (!overlay?.rows?.length) return base;
  const sheetId = resolveCandleSheetId(base, overlay.sheetId);
  if (!sheetId) return base;

  const prevSheets =
    base.dataSheets && typeof base.dataSheets === "object" ? { ...base.dataSheets } : {};
  const prevSheet =
    prevSheets[sheetId] && typeof prevSheets[sheetId] === "object"
      ? (prevSheets[sheetId] as Record<string, unknown>)
      : { name: sheetId };

  prevSheets[sheetId] = {
    ...prevSheet,
    data: overlay.rows,
    rowCount: overlay.rows.length,
    fullRowCount: overlay.rows.length,
  };

  return {
    ...base,
    rows: overlay.rows,
    dataSheets: prevSheets,
  };
}

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
  const [loading, setLoading] = useState(() => !chartPayloadHasData(initialPayload));
  const [failed, setFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fetchedRef = useRef(!!chartPayloadHasData(initialPayload));

  const payload = useMemo(
    () => applyLiveCandleOverlay(basePayload, liveOverlay),
    [basePayload, liveOverlay],
  );

  useEffect(() => {
    if (initialPayload && chartPayloadHasData(initialPayload)) {
      setBasePayload(initialPayload);
      setLoading(false);
      fetchedRef.current = true;
    }
  }, [initialPayload]);

  useEffect(() => {
    if (initialChartSlug) setChartSlug(initialChartSlug);
  }, [initialChartSlug]);

  // Live overlay alone is enough to render when progressive fetch is still pending
  useEffect(() => {
    if (liveOverlay?.rows?.length && !basePayload) {
      setLoading(false);
    }
  }, [liveOverlay, basePayload]);

  useEffect(() => {
    if (fetchedRef.current || !chartId) return;
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;

    const loadChart = () => {
      if (fetchedRef.current || cancelled) return;
      fetchedRef.current = true;
      setLoading(true);
      fetch(
        `/api/public/dashboards/${encodeURIComponent(username)}/${encodeURIComponent(slug)}/charts/${encodeURIComponent(chartId)}`,
      )
        .then((r) => r.json())
        .then((j) => {
          if (cancelled) return;
          if (!j?.success || !j?.data?.chartPayload) {
            // Live overlay may still render the candles
            if (!liveOverlay?.rows?.length) setFailed(true);
            return;
          }
          setBasePayload(j.data.chartPayload);
          if (j.data.chartLink?.slug) setChartSlug(j.data.chartLink.slug);
        })
        .catch(() => {
          if (!cancelled && !liveOverlay?.rows?.length) setFailed(true);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
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
  }, [username, slug, chartId, liveOverlay?.rows?.length]);

  if (failed && !chartPayloadHasData(payload)) {
    return (
      <div className="flex min-h-[120px] flex-1 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
        Chart unavailable
      </div>
    );
  }

  if (loading || !payload || !chartPayloadHasData(payload)) {
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
