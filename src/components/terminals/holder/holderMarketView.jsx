"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { MarketCardSkeleton, MarketStatsCard } from "@/components/dashboardComposer/recipes/polymarketMarketSearch";
import { retryImport } from "@/lib/retryImport";
import { cn } from "@/lib/utils";
import { marketTradeSheet, sheetChartBlock } from "./holderTerminalSheets";
import { HolderFlagToggles, HolderHoldersTable, holderFlagCounts, useHolderFlags } from "./holderHoldersTable";
import { HolderEntryHistogram } from "./holderEntryHistogram";
import { HEATMAP_TILES, HolderHeatmap } from "./holderHeatmap";
import { HolderScoreDistribution } from "./holderScoreDistribution";
import { HolderSupplyPanels } from "./holderSupplyPanels";
import { HolderTradesTable, MergeOutcomesButton } from "./holderTradesTable";
import { useHolderDetails } from "./useHolderDetails";
import { useHolderSupply } from "./useHolderSupply";
import { useMarketHolders } from "./useMarketHolders";
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
  const holders = useMarketHolders(meta, rows, stats?.prices);
  const holderDetails = useHolderDetails(meta?.conditionId || "", meta?.tokenIds);
  const holderFlags = useHolderFlags();
  const supply = useHolderSupply(meta, rows, stats?.prices, holders.sides);
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

  const outcomes = [meta.outcomes?.[0] || "Yes", meta.outcomes?.[1] || "No"];
  return (
    <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex items-center justify-between gap-3 px-1">
        <LiveDot on={live && !meta.closed} label={meta.closed ? "Market closed" : live ? "Live" : "Connecting"} />
        {stats.lastTradeSec ? <span className="text-[11px] text-muted-foreground">Last trade {formatClock(stats.lastTradeSec)}</span> : null}
      </div>
      <div className="!mt-2 grid gap-4 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
        <MarketStatsCard meta={stats} />
        <section
          aria-label="Last traded price chart"
          data-block-type={chart?.type}
          data-source-sheet={chart?.sourceSheetId}
          className="flex h-[480px] min-w-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-background p-3 shadow-sm lg:h-auto lg:min-h-[480px]"
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

      <div className="max-w-3xl pt-8">
        <h3 className="text-[15px] font-semibold text-foreground">Who holds this market</h3>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Every wallet holding {outcomes[0]} on the left and {outcomes[1]} on the right, largest position first, with each
          holder&apos;s all-time leaderboard rank. Positions move live: trades update shares, entry price and realized PnL as they
          confirm, and the live price re-values every position. Pick a holder to open their holder analysis.
        </p>
      </div>
      <HolderFlagToggles
        enabled={holderFlags.enabled}
        onToggle={holderFlags.toggle}
        counts={holderFlagCounts(holders.sides, holderDetails.details)}
        outcomes={outcomes}
      />
      <HolderHoldersTable
        sides={holders.sides}
        outcomes={outcomes}
        loading={holders.loading}
        error={holders.error}
        details={holderDetails.details}
        onVisible={holderDetails.request}
        enabled={holderFlags.enabled}
        hasMore={holders.hasMore}
        loadingMore={holders.loadingMore}
        onLoadMore={holders.loadMore}
        onPickTrader={onPickTrader}
      />

      <div className="max-w-3xl pt-8">
        <h3 className="text-[15px] font-semibold text-foreground">Profit, loss and ownership</h3>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          The dollars each outcome&apos;s holders have in positions above and below the price they paid, how many holders are
          making or losing money, and how much of the supply the single largest holder and the rest of the top 10 own. Average
          entry is the price paid per share across the whole supply. Everything re-values live with the price.
        </p>
      </div>
      <HolderSupplyPanels sides={supply.sides} outcomes={outcomes} error={supply.error} />

      <div className="max-w-3xl pt-8">
        <h3 className="text-[15px] font-semibold text-foreground">Where the supply was bought</h3>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Every holder&apos;s position placed at the average price they paid, in one-cent buckets, with {outcomes[0]} and{" "}
          {outcomes[1]} stacked on the same axis. Tall bars are price levels where a lot of supply changed hands, and the dashed
          lines mark where each outcome trades now. An outcome&apos;s bars to the right of its own line paid more than today&apos;s
          price and are sitting on a loss, so they may sell if the price climbs back to their entry. Switch between shares, their value now, and what was paid. Bars move as holders
          trade and the lines move with the live price.
        </p>
      </div>
      <HolderEntryHistogram sides={supply.sides} outcomes={outcomes} loading={supply.loading} />

      <div className="max-w-3xl pt-8">
        <h3 className="text-[15px] font-semibold text-foreground">Holder heatmap</h3>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          The largest {HEATMAP_TILES} holders of each outcome as tiles, {outcomes[0]} on the left and {outcomes[1]} on the right.
          A tile&apos;s area is its share of the supply, and the grey strip is everyone else. Colour by position size to see who
          dominates, or by profit and loss to see who is up and who is underwater; both sides share one colour scale. Flags
          outline the tiles they mark, the same flags as the holders table. Tiles re-colour live and a click opens the
          holder&apos;s analysis.
        </p>
      </div>
      <HolderFlagToggles
        enabled={holderFlags.enabled}
        onToggle={holderFlags.toggle}
        counts={holderFlagCounts(
          holders.sides?.map((side) => ({ ...side, rows: side.rows.slice(0, HEATMAP_TILES) })),
          holderDetails.details,
        )}
        outcomes={outcomes}
      />
      <HolderHeatmap
        sides={holders.sides}
        outcomes={outcomes}
        loading={holders.loading}
        details={holderDetails.details}
        onVisible={holderDetails.request}
        enabled={holderFlags.enabled}
        onPickTrader={onPickTrader}
      />

      <div className="max-w-3xl pt-8">
        <h3 className="text-[15px] font-semibold text-foreground">Are better traders on {outcomes[0]} or {outcomes[1]}?</h3>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          Each of the top {HEATMAP_TILES} holders per side gets a Lychee trader score from how they did in markets that have
          finished. The aggregate score weights those by shares held, and the curves show how the scores spread across each
          side&apos;s supply against a typical trader. A side carried by proven traders sits to the right. Weights move live
          with positions.
        </p>
      </div>
      <HolderScoreDistribution sides={holders.sides} details={holderDetails.details} outcomes={outcomes} limit={HEATMAP_TILES} />
    </div>
  );
}
