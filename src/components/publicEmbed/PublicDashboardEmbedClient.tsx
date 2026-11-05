"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowUpRight, BarChart3, CandlestickChart, LineChart } from "lucide-react";
import {
  CHART_CARDS_GRID_STYLE,
  chartCardResponsiveSpanStyle,
  clampChartCardRowSpan,
  DASH_CARD_CELL_CLASS,
  DASH_CARDS_GRID_CLASS,
} from "@/lib/dashboardLayoutDefaults";
import { cn } from "@/lib/utils";
import { LazyPublicDashboardChart, useLoadedChart } from "@/components/publicEmbed/LazyPublicDashboardChart";
import { CardGridSkeleton } from "@/components/publicEmbed/ChartEmbedSkeleton";
import { VIEWER_CARD_CLASS } from "@/components/publicEmbed/PublicDashboardSkeletons";
import { DashboardLoadingProgress } from "@/components/publicEmbed/DashboardLoadingProgress";
import { viewerChartKind } from "@/components/publicEmbed/PublicViewerChart";
import {
  getPublicChartBatchLoader,
  type PublicChartBatchLoader,
} from "@/components/publicEmbed/publicChartBatchLoader";
import { CHART_CHUNK_SIZE, layoutChartIds } from "@/lib/publicDashboardChartChunks";
import { clampCardGridRowLimit } from "@/lib/dashboardCardGrid";
import { publicEmbedOutboundLinkProps } from "@/components/publicEmbed/publicEmbedOutboundLink";
import { DashboardCardGridSection } from "@/components/dashboardComposer/DashboardCardGridSection";
import { useTelegramContentTracker } from "@/hooks/useTelegramContentTracker";
import {
  isCompareNarrativeRow,
  isKalshiPolymarketCompareLayout,
  readComparePairFromLayout,
} from "@/lib/kalshiPolymarketCompareDashboard";
import { CompareLiveDashboardSession } from "@/components/hubs/polymarketLiveDemo/compareLiveDashboard/CompareLiveDashboardSession";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com";

type Column = {
  id?: string;
  chart_id?: string | null;
  colSpan?: number;
  rowSpan?: number;
  h2?: string;
  caption?: string;
  microtext?: string;
  link?: { mode?: string; url?: string };
};

type CardGridRow = {
  id?: string;
  type: "cardGrid";
  h2?: string;
  caption?: string;
  sheetId?: string;
  rowLimit?: number;
  fields?: Record<string, { column?: string | null; visible?: boolean }>;
  sheetRows?: unknown[];
};

type Row =
  | { id?: string; type: "text"; body?: string; textVariant?: "heading" | "paragraph" }
  | { id?: string; type: "cards"; columns?: Column[] }
  | CardGridRow;

type Payload = {
  success: boolean;
  data?: {
    page_heading?: string;
    dashboard_name?: string;
    layout?: { kind?: string; compare?: { pair?: unknown }; rows?: Row[] };
    owner_handle?: string;
    live_backed?: boolean;
    live_poll_interval_ms?: number | null;
  };
  message?: string;
};

type LiveTick = {
  charts: Record<string, { ticker: string; sheetId: string; rows: Record<string, unknown>[] }>;
  pollIntervalMs: number;
  periodInterval: number;
  fetchedAt: number | null;
};

/** Rows past the first screen skip layout/paint until scrolled near. */
const OFFSCREEN_ROW_STYLE: CSSProperties = { contentVisibility: "auto", containIntrinsicSize: "auto 480px" };

function resolveCardHref(col: Column, chartSlug: string | undefined, ownerHandle: string) {
  const mode = col.link?.mode || "none";
  if (mode === "custom" && col.link?.url?.trim()) return col.link.url.trim();
  if (mode === "chart_public" && chartSlug) {
    return `/${encodeURIComponent(ownerHandle)}/charts/${encodeURIComponent(chartSlug)}`;
  }
  return null;
}

const KIND_ICON = { candles: CandlestickChart, line: LineChart, bars: BarChart3, legacy: BarChart3 } as const;

function ViewerChartCard({
  col,
  loader,
  ownerHandle,
  slug,
  live,
  liveOverlay,
}: {
  col: Column;
  loader: PublicChartBatchLoader;
  ownerHandle: string;
  slug: string;
  live: boolean;
  liveOverlay: { sheetId: string; rows: Record<string, unknown>[]; periodInterval?: number } | null;
}) {
  const chartId = col.chart_id ? String(col.chart_id) : "";
  const entry = useLoadedChart(loader, chartId);
  const payload = entry?.chartPayload ?? null;
  const kind = useMemo(() => (payload ? viewerChartKind(payload) : null), [payload]);
  const Icon = KIND_ICON[kind || "legacy"];
  const chartName = (payload?.chart as { chart_name?: string } | undefined)?.chart_name;
  const title = col.h2?.trim() || chartName || "Chart";
  const href = resolveCardHref(col, entry?.chartLink?.slug, ownerHandle);
  const caption = col.caption?.trim();

  return (
    <div className={VIEWER_CARD_CLASS}>
      <div className="flex items-center gap-2 px-3 pb-1 pt-2">
        <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <h3 className="min-w-0 truncate text-[13px] font-semibold text-foreground" title={title}>
          {title}
        </h3>
        <span className="ml-auto flex shrink-0 items-center gap-2">
          {live ? <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">Live</span> : null}
          {href ? (
            <a
              href={href}
              className="rounded p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label={`Open ${title}`}
            >
              <ArrowUpRight className="size-3.5" aria-hidden />
            </a>
          ) : null}
        </span>
      </div>
      {caption ? <p className="line-clamp-2 px-3 pb-1 text-[12px] leading-snug text-muted-foreground">{caption}</p> : null}
      {chartId ? (
        <LazyPublicDashboardChart
          loader={loader}
          chartId={chartId}
          liveOverlay={liveOverlay}
          live={live}
          legacyProps={{ ownerHandle, layoutColumnKey: col.id, dashboardSlug: slug, chartTitle: title }}
        />
      ) : (
        <div className="mx-3 mb-3 flex min-h-[120px] flex-1 items-center justify-center rounded-lg border border-dashed border-border/70 text-[12px] text-muted-foreground">
          Chart unavailable
        </div>
      )}
      {col.microtext?.trim() ? (
        <p className="border-t border-border/60 px-3 py-1.5 text-[11px] leading-snug text-muted-foreground">{col.microtext}</p>
      ) : null}
    </div>
  );
}

/** Published dashboard body in the workspace card style; the page renders the header. */
export default function PublicDashboardEmbedClient({
  username,
  slug,
  initialPayload,
}: {
  username: string;
  slug: string;
  initialPayload: Payload;
}) {
  const [payload, setPayload] = useState<Payload>(initialPayload);
  const [cardGridLoading, setCardGridLoading] = useState(() =>
    (initialPayload?.data?.layout?.rows || []).some(
      (r) => r.type === "cardGrid" && !(Array.isArray(r.sheetRows) && r.sheetRows.length),
    ),
  );
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [liveTick, setLiveTick] = useState<LiveTick>({
    charts: {},
    pollIntervalMs: 60_000,
    periodInterval: 1,
    fetchedAt: null,
  });

  const d = payload?.data;
  const layout = d?.layout;
  const rows = useMemo(() => (Array.isArray(layout?.rows) ? layout.rows : []), [layout]);
  const live = !!d?.live_backed;
  const ownerHandle = d?.owner_handle || username;
  const dashboardName = d?.dashboard_name || d?.page_heading || slug;

  const chartIds = useMemo(() => layoutChartIds(layout), [layout]);
  const loader = useMemo(() => getPublicChartBatchLoader(username, slug, chartIds), [username, slug, chartIds]);
  const subscribe = useCallback((cb: () => void) => loader.subscribe(cb), [loader]);
  const getProgress = useCallback(() => loader.getProgress(), [loader]);
  const progress = useSyncExternalStore(subscribe, getProgress, getProgress);
  const aboveFold = Math.min(progress.total, CHART_CHUNK_SIZE);
  const showProgress = progress.total > 0 && progress.loaded < aboveFold;

  useTelegramContentTracker({
    contentType: "dashboard",
    name: dashboardName,
    path: `/${username}/dashboards/${slug}`,
    ownerHandle,
    enabled: !!payload?.success,
  });

  useEffect(() => setIsEmbedded(window.self !== window.top), []);

  // Above-the-fold group starts right away (the page preloads its URL), the next group follows it,
  // and the rest load as cards near the viewport.
  useEffect(() => {
    if (!chartIds[0]) return;
    const next = chartIds[CHART_CHUNK_SIZE];
    void loader.load(chartIds[0]).then(() => {
      if (next) void loader.load(next);
    });
  }, [loader, chartIds]);

  useEffect(() => {
    if (!cardGridLoading) return;
    let cancelled = false;
    fetch(`/api/public/dashboards/${encodeURIComponent(username)}/${encodeURIComponent(slug)}?part=cardGrids`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((j: Payload) => {
        if (cancelled || !j?.success || !j.data?.layout?.rows) return;
        const fetchedRows = j.data.layout.rows;
        setPayload((prev) => {
          const prevRows = prev?.data?.layout?.rows;
          if (!prev?.data || !prevRows) return prev;
          const nextRows = prevRows.map((row, i) => {
            const fetchedRow = fetchedRows[i];
            if (row.type !== "cardGrid" || fetchedRow?.type !== "cardGrid") return row;
            const sheetRows = Array.isArray(fetchedRow.sheetRows) ? fetchedRow.sheetRows : [];
            return sheetRows.length ? { ...row, sheetRows } : row;
          });
          return { ...prev, data: { ...prev.data, layout: { ...prev.data.layout, rows: nextRows } } };
        });
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setCardGridLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [username, slug, cardGridLoading]);

  // One shared Lychee→Kalshi live fetch for all charts (server-cached).
  const initialPollMs = d?.live_poll_interval_ms;
  useEffect(() => {
    if (!live) return;
    let cancelled = false;
    let timeoutId: number | null = null;
    const tick = () => {
      fetch(`/api/public/dashboards/${encodeURIComponent(username)}/${encodeURIComponent(slug)}/live`, {
        credentials: "include",
      })
        .then((r) => r.json())
        .then((j) => {
          if (cancelled || !j?.success || !j.data?.charts) return;
          const pollMs = Math.max(
            15_000,
            Math.floor(Number(j.data.pollIntervalMs)) || Math.floor(Number(initialPollMs)) || 60_000,
          );
          setLiveTick({
            charts: j.data.charts,
            pollIntervalMs: pollMs,
            periodInterval: Math.floor(Number(j.data.periodInterval)) || 1,
            fetchedAt: Number(j.data.fetchedAt) || Date.now(),
          });
          timeoutId = window.setTimeout(tick, pollMs);
        })
        .catch(() => {
          if (!cancelled) timeoutId = window.setTimeout(tick, 60_000);
        });
    };
    tick();
    return () => {
      cancelled = true;
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, [username, slug, live, initialPollMs]);

  const liveOverlays = useMemo(() => {
    const out: Record<string, { sheetId: string; rows: Record<string, unknown>[]; periodInterval: number }> = {};
    for (const [id, tick] of Object.entries(liveTick.charts)) {
      out[id] = { sheetId: tick.sheetId, rows: tick.rows, periodInterval: liveTick.periodInterval };
    }
    return out;
  }, [liveTick]);

  const isCompareLayout = isKalshiPolymarketCompareLayout(layout);
  const comparePair = readComparePairFromLayout(layout);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-14 pt-6 sm:px-6">
      {showProgress || (live && liveTick.fetchedAt) ? (
        <div className="mb-4 flex min-h-8 flex-wrap items-center justify-between gap-2">
          {showProgress ? <DashboardLoadingProgress progress={progress} /> : <span />}
          {live && liveTick.fetchedAt ? (
            <span className="text-[11px] text-muted-foreground">
              Refreshed {new Date(liveTick.fetchedAt).toLocaleTimeString()}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-6">
        {isCompareLayout ? (
          <CompareLiveDashboardSession
            initialPair={comparePair}
            handleUrl={`${String(SITE).replace(/^https?:\/\//, "").replace(/\/$/, "")}/${username}/dashboards/${slug}`}
            onUpgrade={() => {}}
            readOnly
            className="min-h-[min(72vh,56rem)] rounded-xl border-border/70"
          />
        ) : null}

        {rows.map((row, rowIndex) => {
          if (isCompareLayout && isCompareNarrativeRow(row)) return null;
          const rowStyle = rowIndex > 1 ? OFFSCREEN_ROW_STYLE : undefined;

          if (row.type === "cardGrid") {
            const sheetRows = Array.isArray(row.sheetRows) ? (row.sheetRows as object[]) : [];
            if (cardGridLoading && !sheetRows.length) {
              return (
                <div key={row.id || `cardGrid-${rowIndex}`} className="space-y-3" style={rowStyle}>
                  {row.h2?.trim() ? (
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">{row.h2}</h2>
                  ) : null}
                  <CardGridSkeleton count={Math.min(clampCardGridRowLimit(row.rowLimit), 4)} />
                </div>
              );
            }
            return (
              <div key={row.id || `cardGrid-${rowIndex}`} style={rowStyle}>
                <DashboardCardGridSection row={row} dataRows={sheetRows} />
              </div>
            );
          }

          if (row.type === "text") {
            const body = row.body || "";
            const key = row.id || `text-${rowIndex}`;
            return row.textVariant === "heading" ? (
              <h2 key={key} className="pt-2 text-lg font-semibold tracking-tight text-foreground">
                {body}
              </h2>
            ) : (
              <p key={key} className="max-w-3xl whitespace-pre-wrap text-[15px] leading-relaxed text-muted-foreground">
                {body}
              </p>
            );
          }

          if (row.type !== "cards" || !Array.isArray(row.columns)) return null;
          return (
            <div
              key={row.id || `cards-${rowIndex}`}
              className={cn("grid gap-4", DASH_CARDS_GRID_CLASS)}
              style={{ ...CHART_CARDS_GRID_STYLE, ...rowStyle }}
            >
              {row.columns.map((col, colIndex) => {
                const chartId = col.chart_id ? String(col.chart_id) : "";
                return (
                  <div
                    key={col.id || chartId || colIndex}
                    style={{
                      ...chartCardResponsiveSpanStyle(col.colSpan),
                      gridRow: `span ${clampChartCardRowSpan(col.rowSpan)}`,
                    }}
                    className={cn(DASH_CARD_CELL_CLASS, "h-full min-h-0 min-w-0")}
                  >
                    <ViewerChartCard
                      col={col}
                      loader={loader}
                      ownerHandle={ownerHandle}
                      slug={slug}
                      live={live}
                      liveOverlay={liveOverlays[chartId] || null}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <footer className="mt-12 flex items-center justify-center gap-1 border-t border-border/60 pt-4 text-[12px] text-muted-foreground">
        Made with
        <Link href={SITE} className="font-medium text-foreground hover:underline" {...publicEmbedOutboundLinkProps(isEmbedded)}>
          Lychee
        </Link>
      </footer>
    </div>
  );
}
