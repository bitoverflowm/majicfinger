"use client";

import { useEffect, useMemo } from "react";
import { StateProviderV2, useMyStateV2 } from "@/context/stateContextV2";
import { ChartBuilderProvider, ChartCanvas } from "@/components/chartView";
import { normalizeBuilderSnapshot } from "@/lib/chartBundle";
import { inferDefaultBuilderSnapshot } from "@/lib/inferDefaultBuilderSnapshot";

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

export function PublicDashboardChartBlock({ chartPayload }) {
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

  return (
    <StateProviderV2 initialSettings={{ viewing: "charts", demo: false, rightPanelOpen: false }}>
      <div
        className="w-full rounded-md border bg-card/50 p-2"
        style={{
          backgroundColor: cp0.bgColor || undefined,
          color: cp0.textColor || undefined,
        }}
      >
        <DataSheetsLoader rows={rows} dataSheets={dataSheets} />
        <ChartBuilderProvider demo={false} embedCompact initialBuilderSnapshot={chartSnapshot}>
          <div className="flex h-[280px] min-h-[220px] w-full flex-col">
            <ChartCanvas />
          </div>
        </ChartBuilderProvider>
      </div>
    </StateProviderV2>
  );
}
