"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { StateProviderV2, useMyStateV2 } from "@/context/stateContextV2";
import { ChartBuilderProvider, ChartCanvas } from "@/components/chartView";
import { buildPublicChartBundle } from "@/lib/chartBundle";
import { getChartWorkspaceDependencyState } from "@/lib/chartSnapshotDataDeps";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { mapSavedChartsToPickerOptions } from "@/lib/dashboardChartPickerLabels";

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

const PLACEHOLDER_FRAME =
  "flex min-h-0 w-full flex-1 items-center justify-center gap-1.5 rounded-md border border-dashed bg-muted/20 px-3 text-xs text-muted-foreground";

/** Scroll inside the slot so the card grid row height stays bounded (see CHART_CARDS_GRID_ROW_PX). */
const CHART_SLOT_INNER = "flex min-h-0 w-full flex-1 flex-col overflow-y-auto overflow-x-hidden";

/**
 * Nested StateProviderV2 so ChartBuilderProvider reads isolated connectedData / dataSheets.
 * @param {{ chartId?: string | null; workspaceDataSheets?: Record<string, unknown> | null; savedCharts?: unknown[]; savedDataSets?: unknown[]; loadedDataMeta?: unknown; onSelectChart?: (chartId: string) => void }} props
 */
export function IsolatedChartPreview({
  chartId,
  workspaceDataSheets = null,
  savedCharts = [],
  savedDataSets = [],
  loadedDataMeta = null,
  onSelectChart,
}) {
  const [err, setErr] = useState(null);
  const [bundle, setBundle] = useState(null);
  const [chartLean, setChartLean] = useState(null);
  const appliedBundleSigRef = useRef("");

  const chartOptions = useMemo(
    () => mapSavedChartsToPickerOptions(savedCharts, savedDataSets, loadedDataMeta),
    [savedCharts, savedDataSets, loadedDataMeta],
  );

  const chartDeps = useMemo(() => {
    if (!chartLean) return { sig: "", ready: false, sheetIds: [] };
    const hasWorkspace =
      workspaceDataSheets &&
      typeof workspaceDataSheets === "object" &&
      Object.keys(workspaceDataSheets).length > 0;
    if (!hasWorkspace) return { sig: "", ready: false, sheetIds: [] };
    return getChartWorkspaceDependencyState(chartLean, workspaceDataSheets);
  }, [chartLean, workspaceDataSheets]);

  useEffect(() => {
    let cancelled = false;
    if (!chartId) {
      setChartLean(null);
      setBundle(null);
      setErr(null);
      appliedBundleSigRef.current = "";
      return undefined;
    }

    setChartLean(null);
    setBundle(null);
    setErr(null);
    appliedBundleSigRef.current = "";

    (async () => {
      try {
        const cr = await fetch(`/api/charts/chart/${chartId}`);
        const cj = await cr.json();
        const chart = cj?.data;
        if (!chart?.data_set_id) {
          if (!cancelled) setErr("Chart not found");
          return;
        }
        if (!cancelled) setChartLean(chart);
      } catch {
        if (!cancelled) setErr("Failed to load");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chartId]);

  useEffect(() => {
    let cancelled = false;
    if (!chartId || !chartLean) return undefined;

    const hasWorkspace =
      workspaceDataSheets &&
      typeof workspaceDataSheets === "object" &&
      Object.keys(workspaceDataSheets).length > 0;

    if (hasWorkspace) {
      if (!chartDeps.ready) return undefined;
      const sig = `workspace:${chartId}:${chartDeps.sig}`;
      if (sig === appliedBundleSigRef.current) return undefined;
      try {
        const b = buildPublicChartBundle(chartLean, {
          data_sheets: workspaceDataSheets,
          data: [],
        });
        if (!cancelled) {
          appliedBundleSigRef.current = sig;
          setErr(null);
          setBundle(b);
        }
      } catch {
        if (!cancelled) setErr("Failed to load chart data");
      }
      return undefined;
    }

    const sig = `bundle-api:${chartId}`;
    if (sig === appliedBundleSigRef.current) return undefined;

    (async () => {
      try {
        const br = await fetch(`/api/charts/chart/${chartId}/bundle`);
        const bj = await br.json();
        if (!bj?.success || !bj?.data) {
          if (!cancelled) setErr(bj?.message || "Failed to load chart");
          return;
        }
        if (!cancelled) {
          appliedBundleSigRef.current = sig;
          setErr(null);
          setBundle(bj.data);
        }
      } catch {
        if (!cancelled) setErr("Failed to load");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [chartId, chartLean, chartDeps.ready, chartDeps.sig, workspaceDataSheets]);

  const chartSnapshot = useMemo(() => {
    if (!bundle?.rechartsBuilder || bundle.rechartsBuilder.v !== 1) return undefined;
    return bundle.rechartsBuilder;
  }, [bundle]);

  if (!chartId) {
    const canPick = typeof onSelectChart === "function";
    return (
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            disabled={!canPick}
            className={cn(
              PLACEHOLDER_FRAME,
              "h-full min-h-[96px] shrink-0 whitespace-normal font-normal hover:bg-muted/35",
              !canPick && "pointer-events-none opacity-80",
            )}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <span className="text-center leading-snug">Select a chart</span>
            {canPick ? <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" aria-hidden /> : null}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className="z-[560] w-56 max-h-72 p-0"
          side="top"
          align="center"
          sideOffset={6}
          collisionPadding={{ top: 8, bottom: 8, left: 16, right: 16 }}
          avoidCollisions
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="max-h-72 overflow-y-auto overflow-x-hidden p-1">
            <DropdownMenuLabel className="px-2 py-1.5 text-[11px] font-normal text-muted-foreground">
              Your charts
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {chartOptions.length === 0 ? (
              <div className="px-2 py-2 text-xs text-muted-foreground">No saved charts yet.</div>
            ) : (
              chartOptions.map((opt) => (
                <DropdownMenuItem
                  key={opt.id}
                  className="cursor-pointer"
                  onClick={() => onSelectChart?.(opt.id)}
                >
                  {opt.name}
                </DropdownMenuItem>
              ))
            )}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }
  if (err) {
    return (
      <div className={`${PLACEHOLDER_FRAME} min-h-[96px] border-destructive/30 bg-destructive/5 text-destructive`}>
        {err}
      </div>
    );
  }
  if (!bundle) {
    return <div className={`${PLACEHOLDER_FRAME} min-h-[96px] border bg-muted/10`}>Loading…</div>;
  }

  return (
    <StateProviderV2 initialSettings={{ viewing: "charts", demo: false, rightPanelOpen: false }}>
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        <DataSheetsLoader rows={bundle.rows} dataSheets={bundle.dataSheets} />
        <ChartBuilderProvider demo={false} embedCompact initialBuilderSnapshot={chartSnapshot}>
          <div className={CHART_SLOT_INNER}>
            <ChartCanvas />
          </div>
        </ChartBuilderProvider>
      </div>
    </StateProviderV2>
  );
}
