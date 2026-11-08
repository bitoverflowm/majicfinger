"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { MarketCardSkeleton, MarketStatsCard } from "@/components/dashboardComposer/recipes/polymarketMarketSearch";
import { retryImport } from "@/lib/retryImport";
import { cn } from "@/lib/utils";
import { marketTradeSheet, sheetChartBlock } from "./holderTerminalSheets";
import { HolderTradesTable, MergeOutcomesButton } from "./holderTradesTable";
import { useFusedMarketTrades } from "./useFusedMarketTrades";
import { useLiveMarketMeta, useLiveMarketStats } from "./useLiveMarketMeta";
import { useMarketPriceHistory } from "./useMarketPriceHistory";

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

/**
 * One market: live stats, price chart and every trade from its first to now.
 * `onPickTrader({ address, title })` opens a trader from the trades table.
 */
export function HolderMarketView({ subject, onPickTrader }) {
  const { meta, error, quotes } = useLiveMarketMeta(subject.conditionId);
  const { rows, status } = useFusedMarketTrades(meta);
  const stats = useLiveMarketStats(meta, quotes, rows);
  const priceHistory = useMarketPriceHistory(meta, stats?.prices);
  const priceChart = useMemo(() => (priceHistory.sheet ? sheetChartBlock(priceHistory.sheet) : null), [priceHistory.sheet]);
  const [merged, setMerged] = useState(false);
  useEffect(() => setMerged(false), [subject.conditionId]);

  const sheet = useMemo(
    () => (meta ? marketTradeSheet(meta, rows, { truncated: status.truncated, label: status.label }) : null),
    [meta, rows, status.label, status.truncated],
  );
  const chart = useMemo(() => (sheet ? sheetChartBlock(sheet) : null), [sheet]);
  const live = status.socket === "open";
  const historyLoaded = status.phase === "live" && rows.length >= status.historyCount;

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
          aria-label="Last traded price chart"
          data-block-type={chart?.type}
          data-source-sheet={chart?.sourceSheetId}
          className="flex h-[420px] min-w-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-background p-3 shadow-sm"
        >
          {rows.length ? (
            <SheetBlockChart sheet={sheet} live={live} view={chart.chartView} />
          ) : (
            <PanelLoading label={status.phase === "history" ? "Waiting for trades" : "No trades yet"} />
          )}
        </section>
      </div>

      <div className="max-w-3xl pt-4">
        <h3 className="text-[15px] font-semibold text-foreground">Every trade in this market</h3>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Each fill on Polymarket,{" "}
          {merged
            ? `${meta.outcomes?.[0] || "Yes"} and ${meta.outcomes?.[1] || "No"} together in one list,`
            : `${meta.outcomes?.[0] || "Yes"} on the left and ${meta.outcomes?.[1] || "No"} on the right,`}{" "}
          from the market&apos;s first trade to now. New trades stream in at the top as they happen; the trader fills in
          once Polymarket confirms who made it. Pick a trader to open their holder analysis.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <MergeOutcomesButton
          merged={merged}
          outcomes={[meta.outcomes?.[0] || "Yes", meta.outcomes?.[1] || "No"]}
          onChange={setMerged}
        />
        <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
          <HistoryStatus status={status} count={rows.length} />
          <LiveDot on={live} label={live ? "Streaming" : "Offline"} />
        </div>
      </div>
      {status.error ? <p className="text-[12px] text-amber-700 dark:text-amber-300">{status.error}</p> : null}

      <div data-block-type={sheet.type}>
        <HolderTradesTable
          meta={meta}
          rows={rows}
          merged={merged}
          loading={status.phase === "history"}
          ready={historyLoaded}
          onPickTrader={onPickTrader}
        />
      </div>

      <div className="max-w-3xl pt-8">
        <h3 className="text-[15px] font-semibold text-foreground">Price chart</h3>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          The price Polymarket shows for {meta.outcomes?.[0] || "Yes"} and {meta.outcomes?.[1] || "No"}, from the day the market
          opened to now. It&apos;s the midpoint of the best bid and ask, or the last trade when the spread is wider than 10¢, so
          it moves with the order book even between trades.
          {meta.closed ? " The market has closed, so the line ends there." : " The line keeps extending live."}
        </p>
      </div>
      <section
        aria-label="Price chart"
        data-block-type={priceChart?.type}
        data-source-sheet={priceChart?.sourceSheetId}
        className="flex h-[440px] min-w-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-background p-3 shadow-sm"
      >
        {priceHistory.sheet ? (
          <SheetBlockChart sheet={priceHistory.sheet} live={live && !meta.closed} view={priceChart.chartView} />
        ) : priceHistory.error ? (
          <p className="flex h-full items-center justify-center text-[12px] text-muted-foreground">{priceHistory.error}</p>
        ) : (
          <PanelLoading label="Loading the price history" />
        )}
      </section>
    </div>
  );
}
