"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StateProviderV2 } from "@/context/stateContextV2";
import { useMyStateV2 } from "@/context/stateContextV2";
import { ChartBuilderProvider, ChartCanvas } from "@/components/chartView";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

  if (!payload?.success || !rows.length) {
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
        className="mx-auto flex min-h-screen w-full max-w-[1200px] flex-col gap-3 px-4 py-5 md:px-6 md:py-6"
        style={{
          backgroundColor: (cp0.bgColor as string) || undefined,
          color: (cp0.textColor as string) || undefined,
        }}
      >
        <DataLoader rows={rows} />
        <div className="rounded-lg border bg-background/70 p-2 text-xs text-muted-foreground">
          {`Rows: ${rows.length} · Columns: ${
            rows[0] && typeof rows[0] === "object" ? Object.keys(rows[0] as Record<string, unknown>).length : 0
          } · ChartType: ${chartSnapshot?.selChartType || "n/a"} · X: ${chartSnapshot?.selX || "n/a"} · Y: ${
            Array.isArray(chartSnapshot?.selY) ? chartSnapshot.selY.join(", ") : "n/a"
          }`}
        </div>
        <Tabs defaultValue="chart" className="flex w-full flex-1 flex-col">
          <TabsList className="h-9 w-auto self-center">
            <TabsTrigger value="chart" className="text-xs">Chart</TabsTrigger>
            <TabsTrigger value="data" className="text-xs">Data</TabsTrigger>
          </TabsList>
          <TabsContent value="chart" className="mt-2 flex flex-1 items-center justify-center">
            <ChartBuilderProvider className="py-0" demo={false} embedCompact initialBuilderSnapshot={chartSnapshot as never}>
              <div className="flex h-full min-h-0 w-full items-center justify-center">
                <div className="w-full max-w-[1040px]">
                  <div className="flex h-[420px] min-h-[320px] w-full min-w-0 flex-col md:h-[750px]">
                    <ChartCanvas />
                  </div>
                </div>
              </div>
            </ChartBuilderProvider>
          </TabsContent>
          <TabsContent value="data" className="mt-2">
            <div className="max-h-[520px] overflow-auto rounded-md border">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                  <tr>
                    {Object.keys((rows[0] as Record<string, unknown>) || {}).map((k) => (
                      <th key={k} className="border-b px-2 py-1 font-semibold">{k}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 200).map((row, idx) => (
                    <tr key={idx} className="odd:bg-muted/20">
                      {Object.keys((rows[0] as Record<string, unknown>) || {}).map((k) => (
                        <td key={`${idx}-${k}`} className="border-b px-2 py-1 align-top">
                          {String((row as Record<string, unknown>)?.[k] ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
        <footer className="mt-auto w-full border-t border-border/60 pt-3 text-center text-xs text-muted-foreground">
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
