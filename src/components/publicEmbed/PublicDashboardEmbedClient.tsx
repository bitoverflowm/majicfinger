"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import DotPattern from "@/components/magicui/dot-pattern";
import { cn } from "@/lib/utils";
import { PublicDashboardChartBlock } from "@/components/dashboardComposer/PublicDashboardChartBlock";
import { Progress } from "@/components/ui/progress";
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

type Row =
  | { id?: string; type: "text"; body?: string }
  | { id?: string; type: "cards"; columns?: Column[] };

type Payload = {
  success: boolean;
  data?: {
    page_heading?: string;
    page_subheading?: string;
    dashboard_name?: string;
    theme?: { background?: string; background_color?: string };
    layout?: { rows?: Row[] };
    owner_handle?: string;
  };
  message?: string;
};

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
}: {
  username: string;
  slug: string;
}) {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
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
  }, [username, slug]);

  if (err) {
    return (
      <div className="flex min-h-[240px] flex-col items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
        <p>{err}</p>
        <Link href={SITE} className="text-foreground underline">
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

  return (
    <div className="w-full px-6 py-10 sm:px-10">
      <div
        className="relative overflow-hidden rounded-lg border p-8 shadow-sm"
        style={{ backgroundColor: bg || undefined }}
      >
        {showDots ? (
          <DotPattern
            className={cn("[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]")}
          />
        ) : null}
        <div className="relative z-[1] mx-auto max-w-6xl space-y-8">
          {d.page_heading?.trim() || d.page_subheading?.trim() ? (
            <div className="space-y-3">
              {d.page_heading?.trim() ? (
                <h1
                  className={getPageTitlePublicClassName(d.theme)}
                  style={getPageTitlePublicStyle(d.theme)}
                >
                  {d.page_heading}
                </h1>
              ) : null}
              {d.page_subheading?.trim() ? (
                <p
                  className={getPageTextBlockPublicClassName(d.theme, "pageSubheading")}
                  style={getPageTextBlockPublicStyle(d.theme, "pageSubheading")}
                >
                  {d.page_subheading}
                </p>
              ) : null}
            </div>
          ) : null}

          {rows.map((row) => {
            if (row.type === "text") {
              return (
                <div
                  key={row.id || `text-${row.body?.slice(0, 8)}`}
                  className="prose prose-sm max-w-none text-foreground dark:prose-invert"
                >
                  <p className="whitespace-pre-wrap">{row.body || ""}</p>
                </div>
              );
            }
            if (row.type !== "cards" || !Array.isArray(row.columns)) return null;
            return (
              <div
                key={row.id || "cards"}
                className="grid gap-4"
                style={{ gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}
              >
                {row.columns.map((col) => {
                  const href = resolveCardHref(col, ownerHandle);
                  const span = Math.min(12, Math.max(1, col.colSpan ?? 12));
                  const rSpan = Math.max(1, col.rowSpan ?? 1);
                  const inner = (
                    <div className="flex h-full min-w-0 flex-col gap-2 rounded-lg border border-border/70 bg-background/80 p-4 shadow-sm backdrop-blur-sm">
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
                        <PublicDashboardChartBlock chartPayload={col.chartPayload} />
                      ) : (
                        <div className="flex h-[120px] items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
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
                      className="min-w-0"
                    >
                      {href ? (
                        <a href={href} className="block h-full rounded-lg no-underline hover:opacity-95">
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
        <Link href={SITE} className="font-medium text-foreground underline">
          Lychee Data
        </Link>
        <span> · </span>
        <Link
          href={`${SITE}/${encodeURIComponent(username)}/dashboards/${encodeURIComponent(slug)}`}
          className="underline"
        >
          Open dashboard
        </Link>
        {d.dashboard_name ? (
          <span className="block pt-1 opacity-80">{d.dashboard_name}</span>
        ) : null}
      </footer>
    </div>
  );
}
