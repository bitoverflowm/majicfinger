"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StateProviderV2 } from "@/context/stateContextV2";
import { useMyStateV2 } from "@/context/stateContextV2";
import { ChartBuilderProvider, ChartCanvas } from "@/components/chartView";

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

export default function PublicChartEmbedClient({
  username,
  slug,
}: {
  username: string;
  slug: string;
}) {
  const [payload, setPayload] = useState<PublicPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPayload(null);
    setErr(null);
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

  if (!payload?.success || !payload.data?.rows?.length) {
    return (
      <div className="flex min-h-[240px] items-center justify-center p-6 text-sm text-muted-foreground">
        Loading chart…
      </div>
    );
  }

  const { chart, rows } = payload.data;
  const rb = chart.rechartsBuilder && chart.rechartsBuilder.v === 1 ? chart.rechartsBuilder : undefined;
  const cp0 =
    Array.isArray(chart.chart_properties) && chart.chart_properties[0] && typeof chart.chart_properties[0] === "object"
      ? (chart.chart_properties[0] as Record<string, unknown>)
      : {};

  return (
    <StateProviderV2 initialSettings={{ viewing: "charts", demo: false, rightPanelOpen: false }}>
      <div
        className="flex min-h-0 flex-col gap-3 p-4"
        style={{
          backgroundColor: (cp0.bgColor as string) || undefined,
          color: (cp0.textColor as string) || undefined,
        }}
      >
        <DataLoader rows={rows} />
        <ChartBuilderProvider demo={false} initialBuilderSnapshot={rb as never}>
          <div className="min-h-[320px] min-w-0 flex-1">
            <ChartCanvas />
          </div>
        </ChartBuilderProvider>
        <footer className="border-t border-border/60 pt-3 text-center text-xs text-muted-foreground">
          <span>Made with </span>
          <Link href={SITE} className="font-medium text-foreground underline">
            Lychee Data
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
