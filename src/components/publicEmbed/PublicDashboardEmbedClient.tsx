"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DotPattern from "@/components/magicui/dot-pattern";
import { CHART_CARDS_GRID_STYLE, clampChartCardRowSpan } from "@/lib/dashboardLayoutDefaults";
import { cn } from "@/lib/utils";
import { PublicDashboardChartBlock } from "@/components/dashboardComposer/PublicDashboardChartBlock";
import { ChartSeoFallback } from "@/components/publicEmbed/ChartSeoFallback";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AnimatedThemeToggler } from "@/components/ui/animated-theme-toggler";
import {
  getChartCardHeadingPublicClassName,
  getChartCardHeadingPublicStyle,
  getChartCardMicrotextPublicClassName,
  getChartCardMicrotextPublicStyle,
  getChartCardSubheadingPublicClassName,
  getChartCardSubheadingPublicStyle,
} from "@/lib/chartCardTextTheme";
import {
  getPageTextBlockPublicClassName,
  getPageTextBlockPublicStyle,
  getPageTitlePublicClassName,
  getPageTitlePublicStyle,
} from "@/lib/pageTitleTheme";
import {
  getFreeTextRowPublicClassName,
  getFreeTextRowPublicStyle,
} from "@/lib/dashboardFreeTextTheme";
import { publicEmbedOutboundLinkProps } from "@/components/publicEmbed/publicEmbedOutboundLink";
import { DashboardCardGridSection } from "@/components/dashboardComposer/DashboardCardGridSection";
import { RunForYourselfButton } from "@/components/runYourself/RunForYourselfButton";
import { useTelegramContentTracker } from "@/hooks/useTelegramContentTracker";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com";

type ChartPayload = {
  chart?: {
    chart_name?: string;
    chart_properties?: unknown[];
    rechartsBuilder?: { v: number };
  };
  rows?: unknown[];
  dataSheets?: Record<string, unknown>;
};

type Column = {
  id?: string;
  chart_id?: string | null;
  colSpan?: number;
  rowSpan?: number;
  h2?: string;
  caption?: string;
  chartHeadingTheme?: Record<string, unknown>;
  chartSubheadingTheme?: Record<string, unknown>;
  chartMicrotextTheme?: Record<string, unknown>;
  microtext?: string;
  link?: { mode?: string; url?: string };
  chartPayload?: ChartPayload | null;
  chartLink?: { mode?: string; slug?: string } | null;
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
  | {
      id?: string;
      type: "text";
      body?: string;
      textVariant?: "heading" | "paragraph";
      textTheme?: Record<string, unknown>;
    }
  | { id?: string; type: "cards"; columns?: Column[] }
  | CardGridRow;

type Payload = {
  success: boolean;
  data?: {
    page_heading?: string;
    page_subheading?: string;
    dashboard_name?: string;
    theme?: { background?: string; background_color?: string };
    layout?: { rows?: Row[] };
    owner_handle?: string;
    owner_profile_pic?: string | null;
    tags?: string[];
  };
  message?: string;
};

const TAG_STYLES = [
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
  "bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30",
  "bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30",
  "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30",
  "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
  "bg-lime-500/15 text-lime-800 dark:text-lime-300 border-lime-500/30",
];

function resolveCardHref(col: Column, ownerHandle: string | undefined) {
  const mode = col.link?.mode || "none";
  if (mode === "custom" && col.link?.url?.trim()) return col.link.url.trim();
  if (mode === "chart_public" && col.chartLink?.slug && ownerHandle) {
    return `/${encodeURIComponent(ownerHandle)}/charts/${encodeURIComponent(col.chartLink.slug)}`;
  }
  return null;
}

export default function PublicDashboardEmbedClient({
  username,
  slug,
  initialPayload = null,
  clusterHref = null,
}: {
  username: string;
  slug: string;
  initialPayload?: Payload | null;
  clusterHref?: string | null;
}) {
  const [payload, setPayload] = useState<Payload | null>(() => initialPayload);
  const [err, setErr] = useState<string | null>(() => (initialPayload && !initialPayload.success ? initialPayload.message || "Not found" : null));
  const [isEmbedded, setIsEmbedded] = useState(
    () => typeof window !== "undefined" && window.self !== window.top,
  );

  const dashboardName =
    payload?.data?.dashboard_name ||
    payload?.data?.page_heading ||
    slug;
  const trackerReady = !!payload?.success && !!payload?.data;

  useTelegramContentTracker({
    contentType: "dashboard",
    name: dashboardName,
    path: `/${username}/dashboards/${slug}`,
    ownerHandle: payload?.data?.owner_handle || username,
    enabled: trackerReady,
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsEmbedded(window.self !== window.top);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (initialPayload) return () => { cancelled = true; };
    setErr(null);
    setPayload(null);
    fetch(`/api/public/dashboards/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((j: Payload) => {
        if (cancelled) return;
        if (!j?.success) {
          setErr(j?.message || "Not found");
          return;
        }
        setPayload(j);
      })
      .catch(() => {
        if (!cancelled) setErr("Failed to load dashboard");
      });
    return () => {
      cancelled = true;
    };
  }, [username, slug, initialPayload]);

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

  if (!payload?.success || !payload.data) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-3 p-6 text-sm text-muted-foreground">
        <p>Loading dashboard…</p>
        <Progress indeterminate className="h-2.5 w-full max-w-xs" indicatorClassName="bg-primary" />
      </div>
    );
  }

  const d = payload.data;
  const rows = Array.isArray(d.layout?.rows) ? d.layout.rows : [];
  const bg = d.theme?.background_color || "";
  const showDots = d.theme?.background === "dotPattern";
  const ownerHandle = d.owner_handle || username;
  const ownerPic = d.owner_profile_pic ? String(d.owner_profile_pic) : "";
  const tags = Array.isArray(d.tags) ? d.tags : [];

  return (
    <div className="relative w-full px-6 py-10 sm:px-10">
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <RunForYourselfButton
          ownerHandle={username}
          dashboardSlug={slug}
          kind="dashboard"
          variant="dashboard"
          displayName={dashboardName}
        />
        <AnimatedThemeToggler className="h-9 w-9 shrink-0 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex items-center justify-center" />
      </div>
      <div
        className="relative overflow-hidden rounded-lg p-8"
        style={{ backgroundColor: bg || undefined }}
      >
        {showDots ? (
          <DotPattern
            className={cn("[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]")}
          />
        ) : null}
        <div className="relative z-[1] mx-auto max-w-6xl space-y-8">
          <div className="space-y-3">
            <h1
              className={getPageTitlePublicClassName(d.theme)}
              style={getPageTitlePublicStyle(d.theme)}
            >
              {d.page_heading?.trim() || d.dashboard_name?.trim() || slug.replace(/-/g, " ")}
            </h1>
            {d.page_subheading?.trim() ? (
              <p
                className={getPageTextBlockPublicClassName(d.theme, "pageSubheading")}
                style={getPageTextBlockPublicStyle(d.theme, "pageSubheading")}
              >
                {d.page_subheading}
              </p>
            ) : null}

            {clusterHref ? (
              <p className="text-sm text-muted-foreground">
                Part of{" "}
                <Link
                  href={clusterHref}
                  className="font-medium text-foreground underline underline-offset-2"
                  {...publicEmbedOutboundLinkProps(isEmbedded)}
                >
                  {clusterHref.replace(/^\//, "").replace(/-/g, " ")}
                </Link>
                {" · "}
                <Link
                  href="/dashboards-gallery"
                  className="font-medium text-foreground underline underline-offset-2"
                  {...publicEmbedOutboundLinkProps(isEmbedded)}
                >
                  Browse all dashboards
                </Link>
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                <Link
                  href="/dashboards-gallery"
                  className="font-medium text-foreground underline underline-offset-2"
                  {...publicEmbedOutboundLinkProps(isEmbedded)}
                >
                  Browse all dashboards
                </Link>
                {" · "}
                <Link
                  href="/guides"
                  className="font-medium text-foreground underline underline-offset-2"
                  {...publicEmbedOutboundLinkProps(isEmbedded)}
                >
                  Data guides
                </Link>
              </p>
            )}

              <div className="flex flex-col gap-2 pt-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  {ownerPic ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ownerPic}
                      alt={`@${ownerHandle}`}
                      className="h-6 w-6 rounded-full object-cover ring-1 ring-border"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-muted ring-1 ring-border flex items-center justify-center text-[11px] font-semibold text-muted-foreground">
                      {(String(ownerHandle || "?")[0] || "?").toUpperCase()}
                    </div>
                  )}
                  <span>
                    Created by <span className="font-medium text-foreground">@{ownerHandle}</span> using{" "}
                    <Link
                      href={SITE}
                      className="font-medium text-foreground underline underline-offset-2"
                      {...publicEmbedOutboundLinkProps(isEmbedded)}
                    >
                      Lychee
                    </Link>
                  </span>
                </div>

                {tags.length ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] text-muted-foreground">Data sources</span>
                    <div className="flex flex-wrap gap-1.5">
                      {tags.slice(0, 8).map((t, i) => (
                        <Badge
                          key={`dash-tag-${t}-${i}`}
                          variant="secondary"
                          className={`border ${TAG_STYLES[i % TAG_STYLES.length]}`}
                        >
                          {t}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

          {rows.map((row) => {
            if (row.type === "cardGrid") {
              const sheetRows = Array.isArray(row.sheetRows)
                ? (row.sheetRows as object[])
                : [];
              return (
                <DashboardCardGridSection
                  key={row.id || "cardGrid"}
                  row={row}
                  dataRows={sheetRows}
                />
              );
            }
            if (row.type === "text") {
              const variant = row.textVariant === "heading" ? "heading" : "paragraph";
              const body = row.body || "";
              const rowForTheme = {
                textVariant: variant,
                textTheme: row.textTheme,
              };
              const key = row.id || `text-${body.slice(0, 8)}`;
              if (variant === "heading") {
                return (
                  <h2
                    key={key}
                    className={getFreeTextRowPublicClassName(rowForTheme)}
                    style={getFreeTextRowPublicStyle(rowForTheme)}
                  >
                    {body}
                  </h2>
                );
              }
              return (
                <p
                  key={key}
                  className={cn("whitespace-pre-wrap", getFreeTextRowPublicClassName(rowForTheme))}
                  style={getFreeTextRowPublicStyle(rowForTheme)}
                >
                  {body}
                </p>
              );
            }
            if (row.type !== "cards" || !Array.isArray(row.columns)) return null;
            return (
              <div key={row.id || "cards"} className="grid gap-4" style={CHART_CARDS_GRID_STYLE}>
                {row.columns.map((col) => {
                  const href = resolveCardHref(col, ownerHandle);
                  const span = Math.min(12, Math.max(1, col.colSpan ?? 12));
                  const rSpan = clampChartCardRowSpan(col.rowSpan);
                  const inner = (
                    <div className="flex h-full min-h-0 min-w-0 flex-col gap-2 overflow-y-auto rounded-lg bg-background/80 p-4 backdrop-blur-sm">
                      {col.h2 ? (
                        <h2
                          className={getChartCardHeadingPublicClassName(col)}
                          style={getChartCardHeadingPublicStyle(col)}
                        >
                          {col.h2}
                        </h2>
                      ) : null}
                      {col.caption ? (
                        <p
                          className={getChartCardSubheadingPublicClassName(col)}
                          style={getChartCardSubheadingPublicStyle(col)}
                        >
                          {col.caption}
                        </p>
                      ) : null}
                      {col.chartPayload ? (
                        <div className="flex min-h-0 flex-1 flex-col">
                          <ChartSeoFallback
                            title={col.h2 || col.chartPayload.chart?.chart_name || "Chart"}
                            chartPayload={col.chartPayload as Parameters<typeof ChartSeoFallback>[0]["chartPayload"]}
                            id={col.id || String(col.chart_id)}
                          />
                          <PublicDashboardChartBlock
                            chartPayload={col.chartPayload}
                            ownerHandle={ownerHandle}
                            chartSlug={col.chartLink?.slug}
                            chartId={col.chart_id ? String(col.chart_id) : undefined}
                            layoutColumnKey={col.id}
                            dashboardSlug={slug}
                            chartTitle={col.h2 || col.chartPayload.chart?.chart_name}
                          />
                        </div>
                      ) : (
                        <div className="flex min-h-[120px] flex-1 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
                          Chart unavailable
                        </div>
                      )}
                      {col.microtext ? (
                        <p
                          className={getChartCardMicrotextPublicClassName(col)}
                          style={getChartCardMicrotextPublicStyle(col)}
                        >
                          {col.microtext}
                        </p>
                      ) : null}
                    </div>
                  );
                  return (
                    <div
                      key={col.id || String(col.chart_id)}
                      style={{ gridColumn: `span ${span}`, gridRow: `span ${rSpan}` }}
                      className="min-h-0 min-w-0 h-full"
                    >
                      {href ? (
                        <a href={href} className="block h-full min-h-0 rounded-lg no-underline hover:opacity-95">
                          {inner}
                        </a>
                      ) : (
                        inner
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <footer className="mt-8 border-t border-border/60 pt-4 text-center text-xs text-muted-foreground">
        <span>Made with </span>
        <Link
          href={SITE}
          className="font-medium text-foreground underline"
          {...publicEmbedOutboundLinkProps(isEmbedded)}
        >
          Lychee
        </Link>
        {d.dashboard_name ? (
          <span className="block pt-1 opacity-80">{d.dashboard_name}</span>
        ) : null}
      </footer>
    </div>
  );
}
