"use client";

import { useEffect, useMemo, useState } from "react";
import { StateProviderV2, useMyStateV2 } from "@/context/stateContextV2";
import { ChartBuilderProvider, ChartCanvas } from "@/components/chartView";
import { buildPublicChartBundle } from "@/lib/chartBundle";

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

const PLACEHOLDER_FRAME = "min-h-0 w-full h-[220px] min-h-[220px]";
const CHART_INNER = "flex h-[260px] min-h-[220px] w-full flex-col";

/**
 * Nested StateProviderV2 so ChartBuilderProvider reads isolated connectedData / dataSheets.
 */
export function IsolatedChartPreview({ chartId }) {
  const [err, setErr] = useState(null);
  const [bundle, setBundle] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!chartId) {
      setBundle(null);
      setErr(null);
      return undefined;
    }
    setErr(null);
    setBundle(null);
    (async () => {
      try {
        const cr = await fetch(`/api/charts/chart/${chartId}`);
        const cj = await cr.json();
        const chart = cj?.data;
        if (!chart?.data_set_id) {
          if (!cancelled) setErr("Chart not found");
          return;
        }
        const dr = await fetch(`/api/dataSets/dataSet/${chart.data_set_id}`);
        const dj = await dr.json();
        const ds = dj?.data;
        if (!ds) {
          if (!cancelled) setErr("Dataset not found");
          return;
        }
        const b = buildPublicChartBundle(chart, ds);
        if (!cancelled) setBundle(b);
      } catch {
        if (!cancelled) setErr("Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chartId]);

  const chartSnapshot = useMemo(() => {
    if (!bundle?.rechartsBuilder || bundle.rechartsBuilder.v !== 1) return undefined;
    return bundle.rechartsBuilder;
  }, [bundle]);

  if (!chartId) {
    return (
      <div
        className={`flex items-center justify-center rounded-md border border-dashed bg-muted/20 text-xs text-muted-foreground ${PLACEHOLDER_FRAME}`}
      >
        Select a chart
      </div>
    );
  }
  if (err) {
    return (
      <div
        className={`flex items-center justify-center rounded-md border border-destructive/30 bg-destructive/5 text-xs text-destructive ${PLACEHOLDER_FRAME}`}
      >
        {err}
      </div>
    );
  }
  if (!bundle) {
    return (
      <div
        className={`flex items-center justify-center rounded-md border bg-muted/10 text-xs text-muted-foreground ${PLACEHOLDER_FRAME}`}
      >
        Loading…
      </div>
    );
  }

  return (
    <StateProviderV2 initialSettings={{ viewing: "charts", demo: false, rightPanelOpen: false }}>
      <div className="min-h-0 w-full">
        <DataSheetsLoader rows={bundle.rows} dataSheets={bundle.dataSheets} />
        <ChartBuilderProvider demo={false} embedCompact initialBuilderSnapshot={chartSnapshot}>
          <div className={CHART_INNER}>
            <ChartCanvas />
          </div>
        </ChartBuilderProvider>
      </div>
    </StateProviderV2>
  );
}
