"use client";

import { useEffect, useRef, useState } from "react";
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
    rechartsBuilder?: { v: number };
  };
  rows?: unknown[];
  dataSheets?: Record<string, unknown>;
};

type ChartLink = { mode?: string; slug?: string } | null;

function chartPayloadHasData(chartPayload: ChartPayload | null | undefined): boolean {
  if (!chartPayload) return false;
  if (Array.isArray(chartPayload.rows) && chartPayload.rows.length > 0) return true;
  return Object.values(chartPayload.dataSheets || {}).some(
    (s) => Array.isArray((s as { data?: unknown[] })?.data) && (s as { data: unknown[] }).data.length > 0,
  );
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
}) {
  const [payload, setPayload] = useState<ChartPayload | null>(() =>
    initialPayload && chartPayloadHasData(initialPayload) ? initialPayload : null,
  );
  const [chartSlug, setChartSlug] = useState<string | undefined>(initialChartSlug);
  const [loading, setLoading] = useState(() => !chartPayloadHasData(initialPayload));
  const [failed, setFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const fetchedRef = useRef(!!chartPayloadHasData(initialPayload));

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
            setFailed(true);
            return;
          }
          setPayload(j.data.chartPayload);
          if (j.data.chartLink?.slug) setChartSlug(j.data.chartLink.slug);
        })
        .catch(() => {
          if (!cancelled) setFailed(true);
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
  }, [username, slug, chartId]);

  if (failed) {
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

export type { ChartPayload, ChartLink };
