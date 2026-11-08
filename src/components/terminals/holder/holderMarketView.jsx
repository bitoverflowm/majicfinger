"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { DashboardSheetGrid } from "@/components/dashboardComposer/dashboardSheetGrid";
import { MarketCardSkeleton, MarketStatsCard } from "@/components/dashboardComposer/recipes/polymarketMarketSearch";
import { retryImport } from "@/lib/retryImport";
import { cn } from "@/lib/utils";
import { marketTradeSheet, outcomeTokens, sheetChartBlock, TRADE_GRID_COLUMNS } from "./holderTerminalSheets";
import { useFusedMarketTrades } from "./useFusedMarketTrades";
import { useLiveMarketMeta, useLiveMarketStats } from "./useLiveMarketMeta";

const SheetBlockChart = dynamic(
  () => retryImport(() => import("@/components/dashboardComposer/sheetBlockChart")).then((m) => m.SheetBlockChart),
  { ssr: false, loading: () => <PanelLoading label="Loading chart" /> },
);

function PanelLoading({ label }) {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-[12px] text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

export function LiveDot({ on, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
      <span className="relative flex size-2">
        {on ? <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" /> : null}
        <span className={cn("relative inline-flex size-2 rounded-full", on ? "bg-emerald-500" : "bg-neutral-300 dark:bg-neutral-600")} />
      </span>
      {label}
    </span>
  );
}

function OutcomeToggle({ meta, value, onChange }) {
  const [first = "Yes", second = "No"] = meta.outcomes || [];
  const options = [
    { id: "both", label: `${first} + ${second}` },
    { id: "yes", label: first },
    { id: "no", label: second },
  ];
  return (
    <div role="radiogroup" aria-label="Outcomes" className="inline-flex rounded-lg bg-muted p-0.5 text-[12px]">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            "rounded-md px-3 py-1 font-medium transition-colors",
            value === option.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function formatClock(sec) {
  return sec ? new Date(sec * 1000).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" }) : "";
}

function HistoryStatus({ status, count }) {
  if (status.phase === "history") {
    return (
      <span className="inline-flex min-w-0 items-center gap-1.5 text-[12px] text-muted-foreground">
        <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
        <span className="truncate">{status.progress || "Reading the trade history"}</span>
      </span>
    );
  }
  return (
    <span className="min-w-0 truncate text-[12px] text-muted-foreground">
      {count.toLocaleString()} trades, first to latest
      {status.label ? ` · ${status.label}` : ""}
      {status.truncated ? " · capped at the row limit" : ""}
    </span>
  );
}

/** One market: live stats, price chart and every trade from its first to now. */
export function HolderMarketView({ subject }) {
  const { meta, error, quotes } = useLiveMarketMeta(subject.conditionId);
  const { rows, status } = useFusedMarketTrades(meta);
  const stats = useLiveMarketStats(meta, quotes, rows);
  const [outcome, setOutcome] = useState("both");
  const [widths, setWidths] = useState({});
  useEffect(() => setOutcome("both"), [subject.conditionId]);

  const shown = useMemo(() => {
    if (!meta || outcome === "both") return rows;
    const keep = new Set(outcomeTokens(meta, outcome).map(String));
    return rows.filter((row) => keep.has(String(row.token_id)));
  }, [meta, outcome, rows]);

  const sheet = useMemo(
    () => (meta ? marketTradeSheet(meta, shown, { outcome, truncated: status.truncated, label: status.label }) : null),
    [meta, outcome, shown, status.label, status.truncated],
  );
  const chart = useMemo(() => (sheet ? sheetChartBlock(sheet) : null), [sheet]);
  const gridBlock = useMemo(
    () =>
      sheet
        ? {
            ...sheet,
            columns: TRADE_GRID_COLUMNS.map((column) =>
              widths[column.id] ? { ...column, width: widths[column.id] } : column,
            ),
          }
        : null,
    [sheet, widths],
  );
  const live = status.socket === "open";

  if (error && !meta) {
    return <p className="mt-8 rounded-xl border border-border/70 px-4 py-6 text-[13px] text-muted-foreground">{error}</p>;
  }
  if (!meta || !stats) {
    return (
      <div className="mt-8 max-w-md">
        <MarketCardSkeleton selected={{ title: subject.title || "Loading market", slug: subject.slug, conditionId: subject.conditionId }} />
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="grid gap-4 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <LiveDot on={live && !meta.closed} label={meta.closed ? "Market closed" : live ? "Live" : "Connecting"} />
            {stats.lastTradeSec ? <span className="text-[11px] text-muted-foreground">Last trade {formatClock(stats.lastTradeSec)}</span> : null}
          </div>
          <MarketStatsCard meta={stats} />
        </div>
        <section
          aria-label="Price chart"
          data-block-type={chart?.type}
          data-source-sheet={chart?.sourceSheetId}
          className="flex h-[420px] min-w-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-background p-3 shadow-sm"
        >
          {shown.length ? (
            <SheetBlockChart sheet={sheet} live={live} view={chart.chartView} />
          ) : (
            <PanelLoading label={status.phase === "history" ? "Waiting for trades" : "No trades yet"} />
          )}
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <OutcomeToggle meta={meta} value={outcome} onChange={setOutcome} />
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
          <HistoryStatus status={status} count={shown.length} />
          <LiveDot on={live} label={live ? "Streaming" : "Offline"} />
        </div>
      </div>
      {status.error ? <p className="text-[12px] text-amber-700 dark:text-amber-300">{status.error}</p> : null}

      <section
        aria-label="Trade history"
        data-block-type={sheet.type}
        className="flex h-[560px] flex-col overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm"
      >
        <DashboardSheetGrid
          block={gridBlock}
          readOnly
          onChange={(patch) => {
            if (!patch?.columns) return;
            setWidths(Object.fromEntries(patch.columns.filter((column) => column.id).map((column) => [column.id, column.width])));
          }}
        />
      </section>
    </div>
  );
}
