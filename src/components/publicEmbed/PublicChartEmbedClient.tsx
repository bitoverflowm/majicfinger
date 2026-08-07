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
import { applyLiveOverlay } from "@/lib/liveFeeds/applyLiveOverlay";

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
    live_backed?: boolean;
    live_poll_interval_ms?: number | null;
    live_overlay_kind?: string | null;
  };
  message?: string;
};

type LiveTick = {
  overlayKind: string;
  pollIntervalMs: number;
  sheets: Record<string, Record<string, unknown>[]>;
  params?: { periodInterval?: number };
  fetchedAt: number | null;
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
  const [liveTick, setLiveTick] = useState<LiveTick | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEmbedded, setIsEmbedded] = useState(
    () => articleEmbed || (typeof window !== "undefined" && window.self !== window.top),
  );
  const rootRef = useRef<HTMLDivElement>(null);

  const displayPayload = useMemo(() => {
    if (!payload?.success || !payload.data) return payload;
    if (!payload.data.live_backed || !liveTick) return payload;
    const base = {
      chart: payload.data.chart,
      rows: payload.data.rows,
      dataSheets: payload.data.dataSheets,
    };
    const overlaid = applyLiveOverlay(base, liveTick);
    if (!overlaid) return payload;
    return {
      ...payload,
      data: {
        ...payload.data,
        chart: overlaid.chart ?? payload.data.chart,
        rows: overlaid.rows ?? payload.data.rows,
        dataSheets: overlaid.dataSheets ?? payload.data.dataSheets,
      },
    };
  }, [payload, liveTick]);

  const rows = displayPayload?.data?.rows ?? [];
  const dataSheets = displayPayload?.data?.dataSheets ?? {};
  const chartFromPayload = displayPayload?.data?.chart;
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
  const chartName = displayPayload?.data?.chart?.chart_name || slug;
  const ownerHandleForTracker = displayPayload?.data?.owner_handle || username;
  const trackerReady =
    !!displayPayload?.success &&
    !!displayPayload?.data &&
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
  }, [articleEmbed, loading, displayPayload, err]);

  useEffect(() => {
    if (!articleEmbed || loading || err || !displayPayload?.success || !displayPayload.data) return;
    window.parent.postMessage({ type: LYCHEE_CHART_EMBED_READY }, window.location.origin);
  }, [articleEmbed, loading, err, displayPayload]);

  useEffect(() => {
    let cancelled = false;
    setPayload(null);
    setLiveTick(null);
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

  // On-demand live poll (same pattern as public dashboards).
  useEffect(() => {
    if (!payload?.success || !payload.data?.live_backed) return undefined;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const pollMs = Math.max(
      15_000,
      Math.floor(Number(payload.data.live_poll_interval_ms)) || 60_000,
    );

    const tick = async () => {
      try {
        const res = await fetch(
          `/api/public/charts/${encodeURIComponent(username)}/${encodeURIComponent(slug)}/live`,
        );
        const json = await res.json().catch(() => ({}));
        if (cancelled || !res.ok || !json?.success || !json?.data) return;
        setLiveTick({
          overlayKind: String(json.data.overlayKind || payload.data?.live_overlay_kind || "sheet_rows"),
          pollIntervalMs: Math.floor(Number(json.data.pollIntervalMs)) || pollMs,
          sheets: json.data.sheets && typeof json.data.sheets === "object" ? json.data.sheets : {},
          params: json.data.params || {},
          fetchedAt: json.data.fetchedAt || Date.now(),
        });
      } catch {
        // Keep last tick; retry on next interval.
      } finally {
        if (!cancelled) {
          timer = setTimeout(tick, pollMs);
        }
      }
    };

    void tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [
    payload?.success,
    payload?.data?.live_backed,
    payload?.data?.live_poll_interval_ms,
    payload?.data?.live_overlay_kind,
    username,
    slug,
  ]);

  if (loading || !displayPayload?.success || !displayPayload.data) {
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
  const ownerHandle = displayPayload.data.owner_handle || username;
  const ownerName = displayPayload.data.owner_name ?? null;
  const ownerProfilePic = displayPayload.data.owner_profile_pic ?? null;
  const isLive = !!displayPayload.data.live_backed;

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
          {isLive ? (
            <div className="pointer-events-none absolute right-2 top-2 z-10 rounded-md bg-emerald-600/90 px-1.5 py-0.5 text-[10px] font-medium text-white">
              Live
            </div>
          ) : null}
          <ChartBuilderProvider
            key={slug}
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
              <span>{`Created by @${ownerHandle} with `}</span>
              <Link
                href={SITE}
                className="font-medium text-foreground underline"
                {...publicEmbedOutboundLinkProps(isEmbedded)}
              >
                Lychee
              </Link>
            </span>
          </div>
          <RunForYourselfButton
            ownerHandle={username}
            chartSlug={slug}
            kind="chart"
            presentation="promo"
            promoVariant="subtle"
            displayName={chart.chart_name || slug}
          />
        </footer>
      </div>
    </StateProviderV2>
  );
}
