"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { StateProviderV2 } from "@/context/stateContextV2";
import { useMyStateV2 } from "@/context/stateContextV2";
import { ChartBuilderProvider, ChartCanvas } from "@/components/chartView";
import { Progress } from "@/components/ui/progress";
import { UserAvatar } from "@/components/ui/user-avatar";
import { normalizeBuilderSnapshot } from "@/lib/chartBundle";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://lycheedata.com";

function DataLoader({ rows }: { rows: unknown[] }) {
  const { setConnectedData } = useMyStateV2();
  useEffect(() => {
    setConnectedData?.(rows);
  }, [rows, setConnectedData]);
  return null;
}

function DataSheetsLoader({ rows, dataSheets }: { rows: unknown[]; dataSheets?: Record<string, any> }) {
  const { setDataSheets, setActiveSheetId, setConnectedData } = useMyStateV2();
  useEffect(() => {
    const incomingSheets =
      dataSheets && typeof dataSheets === "object" && Object.keys(dataSheets).length
        ? dataSheets
        : { "sheet-1": { name: "Sheet 1", data: Array.isArray(rows) ? rows : [], provenance: null } };
    setDataSheets?.(incomingSheets);
    const firstId = Object.keys(incomingSheets)[0] || "sheet-1";
    setActiveSheetId?.(firstId);
    const firstRows = Array.isArray(incomingSheets?.[firstId]?.data) ? incomingSheets[firstId].data : [];
    setConnectedData?.(firstRows.length ? firstRows : Array.isArray(rows) ? rows : []);
  }, [rows, dataSheets, setDataSheets, setActiveSheetId, setConnectedData]);
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
  const dataSheets = payload?.data?.dataSheets ?? {};
  const rb =
    payload?.data?.chart?.rechartsBuilder && payload.data.chart.rechartsBuilder.v === 1
      ? payload.data.chart.rechartsBuilder
      : undefined;
  const chartSnapshot = useMemo(
    () => normalizeBuilderSnapshot(rb, rows, dataSheets),
    [rb, rows, dataSheets],
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

  const hasRowsInAnySheet = Object.values(dataSheets || {}).some((sheet: any) => Array.isArray(sheet?.data) && sheet.data.length > 0);
  if (!payload || !payload.success || !payload.data || (!rows.length && !hasRowsInAnySheet)) {
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
  const ownerHandle = payload.data.owner_handle || username;
  const ownerName = payload.data.owner_name ?? null;
  const ownerProfilePic = payload.data.owner_profile_pic ?? null;
  const cp0 =
    Array.isArray(chart.chart_properties) && chart.chart_properties[0] && typeof chart.chart_properties[0] === "object"
      ? (chart.chart_properties[0] as Record<string, unknown>)
      : {};

  return (
    <StateProviderV2 initialSettings={{ viewing: "charts", demo: false, rightPanelOpen: false }}>
      <div
        className={`mx-auto flex w-full max-w-[1200px] flex-col ${
          isEmbedded ? "min-h-screen gap-1 px-2 py-2 md:px-3 md:py-3" : "min-h-screen gap-3 px-4 py-5 md:px-6 md:py-6"
        }`}
        style={{
          backgroundColor: (cp0.bgColor as string) || undefined,
          color: (cp0.textColor as string) || undefined,
        }}
      >
        <DataLoader rows={rows} />
        <DataSheetsLoader rows={rows} dataSheets={dataSheets} />
        <div className={`mt-0 flex flex-1 items-center justify-center ${isEmbedded ? "" : "md:mt-2"}`}>
          <ChartBuilderProvider demo={false} embedCompact initialBuilderSnapshot={chartSnapshot as never}>
            <div className="flex h-full min-h-0 w-full flex-1 items-center justify-center">
              <div className={`w-full ${isEmbedded ? "max-w-[980px]" : "max-w-[1040px]"}`}>
                <div
                  className={`flex w-full min-w-0 flex-col ${
                    isEmbedded ? "h-[calc(100dvh-96px)] min-h-[420px]" : "h-[420px] min-h-[320px] md:h-[750px]"
                  }`}
                >
                  <ChartCanvas />
                </div>
              </div>
            </div>
          </ChartBuilderProvider>
        </div>
        <footer className={`w-full border-t border-border/60 text-center text-xs text-muted-foreground ${isEmbedded ? "pt-2" : "mt-auto pt-3"}`}>
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
              <Link href={SITE} className="font-medium text-foreground underline">
                Lychee
              </Link>
              {!isEmbedded ? (
                <>
                  <span> · </span>
                  <Link
                    href={`${SITE}/${encodeURIComponent(username)}/charts/${encodeURIComponent(slug)}`}
                    className="underline"
                  >
                    Open chart
                  </Link>
                </>
              ) : null}
            </span>
          </div>
          {chart.chart_name ? <span className="block pt-1 opacity-80">{chart.chart_name}</span> : null}
        </footer>
      </div>
    </StateProviderV2>
  );
}
