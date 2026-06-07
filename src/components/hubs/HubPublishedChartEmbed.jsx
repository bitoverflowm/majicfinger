"use client";

import { useEffect, useMemo, useState } from "react";
import { StateProviderV2, useMyStateV2 } from "@/context/stateContextV2";
import { ChartBuilderProvider, ChartCanvas } from "@/components/chartView";
import { RunForYourselfButton } from "@/components/runYourself/RunForYourselfButton";
import {
  HUB_CHART_EMBED_HEIGHT,
  HubChartEmbedSkeleton,
} from "@/components/publicEmbed/ChartEmbedSkeleton";
import { normalizeBuilderSnapshot } from "@/lib/chartBundle";
import { inferDefaultBuilderSnapshot } from "@/lib/inferDefaultBuilderSnapshot";
import { cn } from "@/lib/utils";

function DataSheetsLoader({ rows, dataSheets }) {
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

function HubChartEmbedBody({ chartPayload, username, slug }) {
  const rows = chartPayload?.rows ?? [];
  const dataSheets = chartPayload?.dataSheets ?? {};
  const chart = chartPayload?.chart;
  const rb =
    chart?.rechartsBuilder && chart.rechartsBuilder.v === 1
      ? chart.rechartsBuilder
      : inferDefaultBuilderSnapshot(rows);

  const chartSnapshot = useMemo(
    () => normalizeBuilderSnapshot(rb, rows, dataSheets),
    [rb, rows, dataSheets],
  );

  const hasRowsInAnySheet = Object.values(dataSheets || {}).some(
    (sheet) => Array.isArray(sheet?.data) && sheet.data.length > 0,
  );

  if (!rows.length && !hasRowsInAnySheet) {
    return (
      <div className={cn("flex items-center justify-center text-sm text-muted-foreground", HUB_CHART_EMBED_HEIGHT)}>
        Chart unavailable
      </div>
    );
  }

  const cp0 =
    Array.isArray(chart?.chart_properties) &&
    chart.chart_properties[0] &&
    typeof chart.chart_properties[0] === "object"
      ? chart.chart_properties[0]
      : {};

  return (
    <StateProviderV2 initialSettings={{ viewing: "charts", demo: false, rightPanelOpen: false }}>
      <div
        className={cn("relative", HUB_CHART_EMBED_HEIGHT)}
        style={{
          backgroundColor: cp0.bgColor || undefined,
          color: cp0.textColor || undefined,
        }}
      >
        <DataSheetsLoader rows={rows} dataSheets={dataSheets} />
        <ChartBuilderProvider demo={false} embedCompact initialBuilderSnapshot={chartSnapshot}>
          <div className="flex h-full min-h-0 w-full flex-col overflow-hidden p-2">
            <ChartCanvas />
          </div>
        </ChartBuilderProvider>
        <div className="pointer-events-auto absolute bottom-3 right-3 z-20">
          <RunForYourselfButton
            ownerHandle={username}
            chartSlug={slug}
            kind="chart"
            displayName={chart?.chart_name || slug}
            className="shadow-lg gap-1.5 rounded-full px-4 font-semibold"
          />
        </div>
      </div>
    </StateProviderV2>
  );
}

/**
 * @param {{ username: string; slug: string }} props
 */
export function HubPublishedChartEmbed({ username, slug }) {
  const [payload, setPayload] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    setPayload(null);

    fetch(`/api/public/charts/${encodeURIComponent(username)}/${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (!j?.success) {
          setErr(j?.message || "Chart not found");
          return;
        }
        setPayload(j.data);
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

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card/40">
      {loading ? <HubChartEmbedSkeleton /> : null}
      {!loading && err ? (
        <div className={cn("flex items-center justify-center px-6 text-center text-sm text-muted-foreground", HUB_CHART_EMBED_HEIGHT)}>
          {err}
        </div>
      ) : null}
      {!loading && payload ? (
        <HubChartEmbedBody chartPayload={payload} username={username} slug={slug} />
      ) : null}
    </article>
  );
}
