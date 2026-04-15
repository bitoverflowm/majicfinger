"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StateProviderV2 } from "@/context/stateContextV2";
import { useMyStateV2 } from "@/context/stateContextV2";
import { ChartBuilderProvider, ChartCanvas } from "@/components/chartView";
import { Progress } from "@/components/ui/progress";
import { inferDefaultBuilderSnapshot } from "@/lib/inferDefaultBuilderSnapshot";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com";

function DataLoader({ rows }: { rows: unknown[] }) {
  const { setConnectedData } = useMyStateV2();
  useEffect(() => {
    setConnectedData(rows as never[]);
  }, [rows, setConnectedData]);
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
  };
  message?: string;
};

function normalizeSnapshotForRows(snapshot: any, rows: unknown[]) {
  const fallback = inferDefaultBuilderSnapshot(rows as any[]);
  const s = snapshot && typeof snapshot === "object" ? { ...snapshot } : { ...fallback };
  const first = Array.isArray(rows) && rows[0] && typeof rows[0] === "object" ? (rows[0] as Record<string, unknown>) : null;
  const keys = first ? Object.keys(first) : [];
  if (!keys.length) return fallback;

  const allowedTypes = new Set(["area", "bar", "line", "pie", "treemap", "liveline"]);
  const deScope = (k: unknown) => {
    const raw = String(k || "");
    const idx = raw.indexOf("::");
    return idx > -1 ? raw.slice(idx + 2) : raw;
  };

  const t = String(s.selChartType || "").trim();
  s.selChartType = allowedTypes.has(t) ? t : fallback.selChartType;

  const normalizedX = deScope(s.selX);
  s.selX = keys.includes(normalizedX) ? normalizedX : fallback.selX;

  const normalizedY = (Array.isArray(s.selY) ? s.selY : [])
    .map((k: unknown) => deScope(k))
    .filter((k: string) => keys.includes(k));
  s.selY = normalizedY.length ? [...new Set(normalizedY)] : fallback.selY;

  if (s.lineColorOverrides && typeof s.lineColorOverrides === "object") {
    const nextOverrides: Record<string, string> = {};
    for (const [rawKey, color] of Object.entries(s.lineColorOverrides as Record<string, unknown>)) {
      const key = deScope(rawKey);
      if (keys.includes(key) && typeof color === "string" && color.trim()) {
        nextOverrides[key] = color;
      }
    }
    s.lineColorOverrides = nextOverrides;
  }

  if (s.chartConfig && typeof s.chartConfig === "object") {
    const nextCfg: Record<string, unknown> = {};
    for (const [rawKey, cfg] of Object.entries(s.chartConfig as Record<string, unknown>)) {
      const key = deScope(rawKey);
      if (keys.includes(key) && cfg && typeof cfg === "object") {
        nextCfg[key] = cfg;
      }
    }
    s.chartConfig = nextCfg;
  }

  if (!s.selX || !Array.isArray(s.selY) || s.selY.length === 0) {
    return fallback;
  }
  return s;
}

export default function PublicChartEmbedClient({
  username,
  slug,
}: {
  username: string;
  slug: string;
}) {
  const [payload, setPayload] = useState<PublicPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState(8);
  const [loadStage, setLoadStage] = useState("Preparing data");
  const [isEmbedded, setIsEmbedded] = useState(false);
  const rows = payload?.data?.rows ?? [];
  const rb =
    payload?.data?.chart?.rechartsBuilder && payload.data.chart.rechartsBuilder.v === 1
      ? payload.data.chart.rechartsBuilder
      : undefined;
  const chartSnapshot = useMemo(
    () => normalizeSnapshotForRows(rb, rows),
    [rb, rows],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsEmbedded(window.self !== window.top);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setPayload(null);
    setErr(null);
    setLoadProgress(12);
    setLoadStage("Preparing data");
    fetch(
      `/api/public/charts/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`,
    )
      .then(async (r) => {
        if (!cancelled) {
          setLoadProgress(48);
          setLoadStage("Pulling chart properties");
        }
        return r.json();
      })
      .then((j: PublicPayload) => {
        if (cancelled) return;
        setLoadProgress(82);
        setLoadStage("Constructing chart");
        if (!j?.success) {
          setErr(j?.message || "Not found");
          return;
        }
        setLoadProgress(100);
        setPayload(j);
      })
      .catch(() => {
        if (!cancelled) setErr("Failed to load chart");
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

  if (!payload || !payload.success || !payload.data || !rows.length) {
    return (
      <div className="flex min-h-[260px] flex-col items-center justify-center gap-3 p-6 text-sm text-muted-foreground">
        <p className="text-center text-sm font-medium">{loadStage}</p>
        <div className="w-full max-w-sm space-y-1">
          <Progress value={loadProgress} className="h-2 w-full" />
          <p className="text-center text-xs text-muted-foreground">{Math.max(1, Math.min(100, loadProgress))}%</p>
        </div>
      </div>
    );
  }

  const chart = payload.data.chart;
  const cp0 =
    Array.isArray(chart.chart_properties) && chart.chart_properties[0] && typeof chart.chart_properties[0] === "object"
      ? (chart.chart_properties[0] as Record<string, unknown>)
      : {};

  return (
    <StateProviderV2 initialSettings={{ viewing: "charts", demo: false, rightPanelOpen: false }}>
      <div
        className={`mx-auto flex w-full max-w-[1200px] flex-col ${
          isEmbedded ? "min-h-0 gap-1 px-3 py-2 md:px-4 md:py-3" : "min-h-screen gap-3 px-4 py-5 md:px-6 md:py-6"
        }`}
        style={{
          backgroundColor: (cp0.bgColor as string) || undefined,
          color: (cp0.textColor as string) || undefined,
        }}
      >
        <DataLoader rows={rows} />
        <div className={`flex ${isEmbedded ? "mt-0 items-center justify-center" : "mt-2 flex-1 items-center justify-center"}`}>
          <ChartBuilderProvider demo={false} embedCompact initialBuilderSnapshot={chartSnapshot as never}>
            <div className="flex h-full min-h-0 w-full items-center justify-center">
              <div className={`w-full ${isEmbedded ? "max-w-[980px]" : "max-w-[1040px]"}`}>
                <div
                  className={`flex w-full min-w-0 flex-col ${
                    isEmbedded ? "h-[400px] min-h-[360px] md:h-[460px]" : "h-[420px] min-h-[320px] md:h-[750px]"
                  }`}
                >
                  <ChartCanvas />
                </div>
              </div>
            </div>
          </ChartBuilderProvider>
        </div>
        <footer className={`w-full border-t border-border/60 text-center text-xs text-muted-foreground ${isEmbedded ? "pt-2" : "mt-auto pt-3"}`}>
          <span>{`Made by @${username} with `}</span>
          <Link href={SITE} className="font-medium text-foreground underline">
            Lychee
          </Link>
          <span> · </span>
          <Link
            href={`${SITE}/${encodeURIComponent(username)}/charts/${encodeURIComponent(slug)}`}
            className="underline"
          >
            Open chart
          </Link>
          {chart.chart_name ? <span className="block pt-1 opacity-80">{chart.chart_name}</span> : null}
        </footer>
      </div>
    </StateProviderV2>
  );
}
