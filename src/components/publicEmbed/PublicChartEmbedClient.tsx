"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { StateProviderV2 } from "@/context/stateContextV2";
import { useMyStateV2 } from "@/context/stateContextV2";
import { ChartBuilderProvider, ChartCanvas } from "@/components/chartView";
import { PublicChartPageSkeleton } from "@/components/publicEmbed/ChartEmbedSkeleton";
import { UserAvatar } from "@/components/ui/user-avatar";
import { normalizeBuilderSnapshot } from "@/lib/chartBundle";
import { resolveEmbedActiveSheetId } from "@/lib/chartSnapshotDataDeps";
import { publicEmbedOutboundLinkProps } from "@/components/publicEmbed/publicEmbedOutboundLink";
import { RunForYourselfButton } from "@/components/runYourself/RunForYourselfButton";
import { useTelegramContentTracker } from "@/hooks/useTelegramContentTracker";
import { LYCHEE_CHART_EMBED_READY, LYCHEE_CHART_EMBED_RESIZE } from "@/lib/content/chart-embed-resize";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com";

function DataSheetsLoader({
  rows,
  dataSheets,
  chartSnapshot,
}: {
  rows: unknown[];
  dataSheets?: Record<string, any>;
  chartSnapshot?: Record<string, unknown> | null;
}) {
  const { setDataSheets, setActiveSheetId, setConnectedData } = useMyStateV2();
  useLayoutEffect(() => {
    const incomingSheets =
      dataSheets && typeof dataSheets === "object" && Object.keys(dataSheets).length
        ? dataSheets
        : { "sheet-1": { name: "Sheet 1", data: Array.isArray(rows) ? rows : [], provenance: null } };
    setDataSheets?.(incomingSheets);
    const activeId = resolveEmbedActiveSheetId(incomingSheets, chartSnapshot);
    setActiveSheetId?.(activeId);
    const activeRows = Array.isArray(incomingSheets?.[activeId]?.data) ? incomingSheets[activeId].data : [];
    setConnectedData?.(activeRows.length ? activeRows : Array.isArray(rows) ? rows : []);
  }, [rows, dataSheets, chartSnapshot, setDataSheets, setActiveSheetId, setConnectedData]);
  return null;
}

type PublicPayload = {
  success: boolean;
  data?: {
    chart: {
      chart_name?: string;
      chart_properties?: unknown[];
      rechartsBuilder?: { v: number };
    };
    rows: unknown[];
    dataSheets?: Record<string, any>;
    owner_handle?: string;
    owner_name?: string | null;
    owner_profile_pic?: string | null;
  };
  message?: string;
};

export default function PublicChartEmbedClient({
  username,
  slug,
  articleEmbed = false,
}: {
  username: string;
  slug: string;
  /** Loaded inside lychee_content MDX iframe (`?embed=1`). */
  articleEmbed?: boolean;
}) {
  const [payload, setPayload] = useState<PublicPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmbedded, setIsEmbedded] = useState(
    () => articleEmbed || (typeof window !== "undefined" && window.self !== window.top),
  );
  const rootRef = useRef<HTMLDivElement>(null);
  const rows = payload?.data?.rows ?? [];
  const dataSheets = payload?.data?.dataSheets ?? {};
  const chartFromPayload = payload?.data?.chart;
  const chartProps0: Record<string, unknown> =
    Array.isArray(chartFromPayload?.chart_properties) &&
    chartFromPayload.chart_properties[0] &&
    typeof chartFromPayload.chart_properties[0] === "object"
      ? (chartFromPayload.chart_properties[0] as Record<string, unknown>)
      : {};
  const chartPropsRb = chartProps0.rechartsBuilder as Record<string, unknown> | undefined;
  const chartSnapshot = useMemo(() => {
    const fromApi =
      chartFromPayload?.rechartsBuilder && chartFromPayload.rechartsBuilder.v === 1
        ? chartFromPayload.rechartsBuilder
        : chartPropsRb?.v === 1
          ? chartPropsRb
          : undefined;
    if (fromApi) return fromApi as Record<string, unknown>;
    return normalizeBuilderSnapshot(undefined, rows, dataSheets);
  }, [chartFromPayload?.rechartsBuilder, chartPropsRb, rows, dataSheets]);
  const chartName = payload?.data?.chart?.chart_name || slug;
  const ownerHandleForTracker = payload?.data?.owner_handle || username;
  const trackerReady =
    !!payload?.success &&
    !!payload?.data &&
    (rows.length > 0 ||
      Object.values(dataSheets || {}).some(
        (sheet: any) => Array.isArray(sheet?.data) && sheet.data.length > 0,
      ));

  useTelegramContentTracker({
    contentType: "chart",
    name: chartName,
    path: `/${username}/charts/${slug}`,
    ownerHandle: ownerHandleForTracker,
    enabled: trackerReady,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsEmbedded(articleEmbed || window.self !== window.top);
  }, [articleEmbed]);

  useEffect(() => {
    if (!articleEmbed || !rootRef.current) return;
    const el = rootRef.current;
    const reportHeight = () => {
      const height = Math.ceil(el.getBoundingClientRect().height);
      if (height > 0) {
        window.parent.postMessage(
          { type: LYCHEE_CHART_EMBED_RESIZE, height },
          window.location.origin,
        );
      }
    };
    reportHeight();
    const observer = new ResizeObserver(reportHeight);
    observer.observe(el);
    return () => observer.disconnect();
  }, [articleEmbed, loading, payload, err]);

  useEffect(() => {
    if (!articleEmbed || loading || err || !payload?.success || !payload.data) return;
    window.parent.postMessage({ type: LYCHEE_CHART_EMBED_READY }, window.location.origin);
  }, [articleEmbed, loading, err, payload]);

  useEffect(() => {
    let cancelled = false;
    setPayload(null);
    setErr(null);
    setLoading(true);
    fetch(
      `/api/public/charts/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`,
    )
      .then((r) => r.json())
      .then((j: PublicPayload) => {
        if (cancelled) return;
        if (!j?.success) {
          setErr(j?.message || "Not found");
          return;
        }
        setPayload(j);
      })
      .catch(() => {
        if (!cancelled) setErr("Failed to load chart");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [username, slug]);

  if (loading || !payload?.success || !payload.data) {
    if (err) {
      return (
        <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
          <p>{err}</p>
          <Link
            href={SITE}
            className="text-foreground underline"
            {...publicEmbedOutboundLinkProps(isEmbedded)}
          >
            Lychee Data
          </Link>
        </div>
      );
    }
    return <PublicChartPageSkeleton />;
  }

  const hasRowsInAnySheet = Object.values(dataSheets || {}).some(
    (sheet: { data?: unknown[] }) => Array.isArray(sheet?.data) && sheet.data.length > 0,
  );
  if (!rows.length && !hasRowsInAnySheet) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
        <p>Chart unavailable</p>
      </div>
    );
  }

  const chart = chartFromPayload!;
  const ownerHandle = payload.data.owner_handle || username;
  const ownerName = payload.data.owner_name ?? null;
  const ownerProfilePic = payload.data.owner_profile_pic ?? null;

  return (
    <StateProviderV2 initialSettings={{ viewing: "charts", demo: false, rightPanelOpen: false }}>
      <div
        ref={rootRef}
        className={`mx-auto flex w-full max-w-[1200px] flex-col ${
          isEmbedded
            ? "h-auto min-h-0 gap-0 bg-white px-0 py-0"
            : "min-h-screen gap-3 px-4 py-5 md:px-6 md:py-6"
        }`}
        style={{
          backgroundColor: isEmbedded ? "#ffffff" : (chartProps0.bgColor as string) || undefined,
          color: (chartProps0.textColor as string) || undefined,
        }}
      >
        <DataSheetsLoader rows={rows} dataSheets={dataSheets} chartSnapshot={chartSnapshot} />
        <div
          className={`relative mt-0 shrink-0 ${
            isEmbedded ? "" : "flex flex-1 items-center justify-center md:mt-2"
          }`}
        >
          <ChartBuilderProvider
            demo={false}
            embedCompact
            embedInArticle={isEmbedded}
            initialBuilderSnapshot={chartSnapshot as never}
          >
            <div className={isEmbedded ? "w-full" : "flex h-full min-h-0 w-full flex-1 items-center justify-center"}>
              <div className={`w-full ${isEmbedded ? "max-w-full" : "max-w-[1040px]"}`}>
                <div
                  className={`flex w-full min-w-0 flex-col ${
                    isEmbedded ? "" : "h-[420px] min-h-[320px] md:h-[750px]"
                  }`}
                >
                  <ChartCanvas />
                </div>
              </div>
            </div>
          </ChartBuilderProvider>
          <div className="pointer-events-auto absolute bottom-3 right-3 z-20">
            <RunForYourselfButton
              ownerHandle={username}
              chartSlug={slug}
              kind="chart"
              displayName={chart.chart_name || slug}
            />
          </div>
        </div>
        <footer
          className={`w-full shrink-0 text-center text-xs text-muted-foreground ${
            isEmbedded ? "border-0 bg-transparent pb-2 pt-1" : "mt-auto border-t border-border/60 pt-3"
          }`}
        >
          <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-2">
            <UserAvatar
              src={ownerProfilePic || undefined}
              handle={ownerHandle}
              name={ownerName || undefined}
              size={22}
              className="shrink-0 ring-1 ring-border/60"
            />
            <span className="min-w-0 text-center">
              <span>{`Made by @${ownerHandle} with `}</span>
              <Link
                href={SITE}
                className="font-medium text-foreground underline"
                {...publicEmbedOutboundLinkProps(isEmbedded)}
              >
                Lychee
              </Link>
              <>
                <span> · </span>
                <Link
                  href={`${SITE}/${encodeURIComponent(username)}/charts/${encodeURIComponent(slug)}`}
                  className="underline"
                  {...publicEmbedOutboundLinkProps(isEmbedded)}
                >
                  {isEmbedded ? "Open chart in new tab" : "Open chart"}
                </Link>
              </>
            </span>
          </div>
          {chart.chart_name ? <span className="block pt-1 opacity-80">{chart.chart_name}</span> : null}
        </footer>
      </div>
    </StateProviderV2>
  );
}
