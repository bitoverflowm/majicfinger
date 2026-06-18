"use client";

import { useLayoutEffect, useMemo } from "react";
import { StateProviderV2, useMyStateV2 } from "@/context/stateContextV2";
import { ChartBuilderProvider, ChartCanvas } from "@/components/chartView";
import { normalizeBuilderSnapshot } from "@/lib/chartBundle";
import { resolveEmbedActiveSheetId } from "@/lib/chartSnapshotDataDeps";
import { inferDefaultBuilderSnapshot } from "@/lib/inferDefaultBuilderSnapshot";
import { RunForYourselfButton } from "@/components/runYourself/RunForYourselfButton";

function DataSheetsLoader({ rows, dataSheets, chartSnapshot }) {
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

export function PublicDashboardChartBlock({
  chartPayload,
  ownerHandle,
  chartSlug,
  chartId,
  layoutColumnKey,
  dashboardSlug,
  dashboardRunnable = false,
  chartTitle,
}) {
  const rows = chartPayload?.rows ?? [];
  const dataSheets = chartPayload?.dataSheets ?? {};
  const chart = chartPayload?.chart;
  const cpRb =
    Array.isArray(chart?.chart_properties) &&
    chart.chart_properties[0] &&
    typeof chart.chart_properties[0] === "object" &&
    chart.chart_properties[0].rechartsBuilder?.v === 1
      ? chart.chart_properties[0].rechartsBuilder
      : null;
  const rb =
    chart?.rechartsBuilder && chart.rechartsBuilder.v === 1
      ? chart.rechartsBuilder
      : cpRb || inferDefaultBuilderSnapshot(rows);

  const chartSnapshot = useMemo(
    () => normalizeBuilderSnapshot(rb, rows, dataSheets),
    [rb, rows, dataSheets],
  );

  const hasRowsInAnySheet = Object.values(dataSheets || {}).some(
    (sheet) => Array.isArray(sheet?.data) && sheet.data.length > 0,
  );
  if (!rows.length && !hasRowsInAnySheet) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-md border bg-muted/20 text-xs text-muted-foreground">
        No chart data
      </div>
    );
  }

  const cp0 =
    Array.isArray(chart?.chart_properties) &&
    chart.chart_properties[0] &&
    typeof chart.chart_properties[0] === "object"
      ? chart.chart_properties[0]
      : {};

  const showRunCta = !!(ownerHandle && (chartSlug || (dashboardSlug && chartId)));

  const ariaLabel =
    chartTitle ||
    chart?.chart_name ||
    chartSlug ||
    "Interactive data chart";

  return (
    <StateProviderV2 initialSettings={{ viewing: "charts", demo: false, rightPanelOpen: false }}>
      <div
        role="img"
        aria-label={ariaLabel}
        className="relative flex min-h-0 w-full flex-1 flex-col rounded-md border bg-card/50 p-2"
        style={{
          backgroundColor: cp0.bgColor || undefined,
          color: cp0.textColor || undefined,
        }}
      >
        <DataSheetsLoader rows={rows} dataSheets={dataSheets} chartSnapshot={chartSnapshot} />
        <ChartBuilderProvider demo={false} embedCompact initialBuilderSnapshot={chartSnapshot}>
          <div className="flex min-h-0 w-full flex-1 flex-col overflow-auto">
            <ChartCanvas />
          </div>
        </ChartBuilderProvider>
        {showRunCta ? (
          <div className="pointer-events-auto absolute bottom-2 right-2 z-10">
            <RunForYourselfButton
              ownerHandle={ownerHandle}
              chartSlug={chartSlug || undefined}
              dashboardSlug={dashboardSlug}
              chartId={chartId}
              layoutColumnKey={layoutColumnKey}
              kind={chartSlug ? "chart" : "dashboard_chart"}
              displayName={chart?.chart_name || chartSlug || chartId}
              className="shadow-md gap-1 rounded-full px-3 py-2 text-xs font-semibold h-auto"
            />
          </div>
        ) : null}
      </div>
    </StateProviderV2>
  );
}
