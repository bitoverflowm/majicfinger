"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";
import { MarketStatsCard } from "@/components/dashboardComposer/recipes/polymarketMarketSearch";
import { Skeleton } from "@/components/ui/skeleton";
import { retryImport } from "@/lib/retryImport";
import { cn } from "@/lib/utils";
import { TerminalPanelFrame, usePanelFill } from "../terminalPanelFrame";
import { HolderFlagToggles, HolderHoldersTable, holderFlagCounts } from "./holderHoldersTable";
import { HolderEntryHistogram } from "./holderEntryHistogram";
import { HEATMAP_TILES, HolderHeatmap } from "./holderHeatmap";
import { HolderScoreDistribution } from "./holderScoreDistribution";
import { clockTime, useHolderSession } from "./holderSession";
import { HolderSupplyPanels } from "./holderSupplyPanels";
import { HolderTradesTable, MergeOutcomesButton } from "./holderTradesTable";
import { LiveDot } from "./liveDot";
import { MarketPriceNews } from "./marketPriceNews";

const SheetBlockChart = dynamic(
  () => retryImport(() => import("@/components/dashboardComposer/sheetBlockChart")).then((m) => m.SheetBlockChart),
  { ssr: false, loading: () => <PanelLoading label="Loading chart" /> },
);

function PanelLoading({ label, className }) {
  return (
    <div className={cn("flex h-full min-h-40 items-center justify-center gap-2 text-[12px] text-muted-foreground", className)}>
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

/** Until the market's details arrive every panel waits; a market that can't load says why. */
function useMarketWaiting() {
  const { meta, stats, error } = useHolderSession();
  if (error && !meta) return <p className="flex min-h-40 items-center justify-center px-6 text-center text-[13px] text-muted-foreground">{error}</p>;
  if (!meta || !stats) return <PanelLoading label="Loading the market" />;
  return null;
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

export function MarketStatsPanel() {
  const { subject, meta, stats, live, error } = useHolderSession();
  if (!meta || !stats) {
    return (
      <div className="px-4 py-3">
        <p className="text-[15px] font-semibold leading-snug text-foreground">{subject.title || "Loading market"}</p>
        {error ? (
          <p className="mt-2 text-[12px] text-muted-foreground">{error}</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-[66px] rounded-lg bg-black/[0.06] dark:bg-white/[0.08]" />
            ))}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 px-4 pt-3 pr-9">
        <LiveDot on={live && !meta.closed} label={meta.closed ? "Market closed" : live ? "Live" : "Connecting"} />
        {stats.lastTradeSec ? <span className="text-[11px] text-muted-foreground">Last trade {clockTime(stats.lastTradeSec * 1000)}</span> : null}
      </div>
      <MarketStatsCard meta={stats} bare />
    </div>
  );
}

export function MarketLastPricePanel() {
  const { tradeRows, status, sheet, chart, live } = useHolderSession();
  const waiting = useMarketWaiting();
  const fill = usePanelFill("h-[440px]");
  return (
    <section
      aria-label="Last traded price chart"
      data-block-type={chart?.type}
      data-source-sheet={chart?.sourceSheetId}
      className={cn("flex min-w-0 flex-col p-3 pr-8", fill)}
    >
      {waiting ||
        (tradeRows.length ? (
          <SheetBlockChart sheet={sheet} live={live} view={chart.chartView} />
        ) : (
          <PanelLoading label={status.phase === "history" ? "Waiting for trades" : "No trades yet"} />
        ))}
    </section>
  );
}

export function MarketTradesPanel() {
  const { meta, tradeRows, status, live, merged, setMerged, outcomes, historyLoaded, sheet, actions } = useHolderSession();
  const waiting = useMarketWaiting();
  return (
    <TerminalPanelFrame
      title="Every trade in this market"
      description={`Each fill on Polymarket, ${
        merged ? `${outcomes[0]} and ${outcomes[1]} together in one list,` : `${outcomes[0]} on the left and ${outcomes[1]} on the right,`
      } from the market's first trade to now. New trades stream in at the top as they happen; the trader fills in once Polymarket confirms who made it. Pick a trader to open their holder analysis.`}
    >
      {waiting || (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <MergeOutcomesButton merged={merged} outcomes={outcomes} onChange={setMerged} />
            <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
              <HistoryStatus status={status} count={tradeRows.length} />
              <LiveDot on={live} label={live ? "Streaming" : "Offline"} />
            </div>
          </div>
          {status.error ? <p className="text-[12px] text-amber-700 dark:text-amber-300">{status.error}</p> : null}
          <div data-block-type={sheet.type}>
            <HolderTradesTable
              meta={meta}
              rows={tradeRows}
              merged={merged}
              loading={status.phase === "history"}
              ready={historyLoaded}
              onPickTrader={actions?.pickTrader}
            />
          </div>
        </div>
      )}
    </TerminalPanelFrame>
  );
}

export function MarketPricePanel() {
  const { meta, live, priceHistory, priceChart, outcomes } = useHolderSession();
  const waiting = useMarketWaiting();
  const fill = usePanelFill("h-[400px]");
  return (
    <TerminalPanelFrame
      title="Price chart"
      description={
        meta
          ? `The price Polymarket shows for ${outcomes[0]} and ${outcomes[1]}, from the day the market opened to now. It's the midpoint of the best bid and ask, or the last trade when the spread is wider than 10¢, so it moves with the order book even between trades.${
              meta.closed ? " The market has closed, so the line ends there." : " The line keeps extending live."
            }`
          : null
      }
    >
      {waiting || (
        <section aria-label="Price chart" data-block-type={priceChart?.type} data-source-sheet={priceChart?.sourceSheetId} className={cn("flex min-w-0 flex-col", fill)}>
          {priceHistory.sheet ? (
            <SheetBlockChart sheet={priceHistory.sheet} live={live && !meta.closed} view={priceChart.chartView} />
          ) : priceHistory.error ? (
            <p className="flex h-full items-center justify-center text-[12px] text-muted-foreground">{priceHistory.error}</p>
          ) : (
            <PanelLoading label="Loading the price history" />
          )}
        </section>
      )}
    </TerminalPanelFrame>
  );
}

export function MarketPriceNewsPanel() {
  const { meta, stats } = useHolderSession();
  const waiting = useMarketWaiting();
  return (
    <TerminalPanelFrame
      title="Price and news over the market's life"
      description={
        meta
          ? `We put the news right on top of the price so you can see what moved this market. Each headline sits where it broke, and the bars underneath show how much coverage there was, so a burst of news next to a jump in the odds stands out. Click a bar to read what came out then. The words below decide which stories count; they start from the market's title, and you can change them for this market.${
              meta.closed ? "" : " New headlines show up within a few minutes."
            }`
          : null
      }
    >
      {waiting || <MarketPriceNews meta={meta} livePrices={stats.prices} />}
    </TerminalPanelFrame>
  );
}

export function MarketHoldersPanel() {
  const { holders, holderDetails, holderFlags, outcomes, actions } = useHolderSession();
  const waiting = useMarketWaiting();
  return (
    <TerminalPanelFrame
      title="Who holds this market"
      description={`Every wallet holding ${outcomes[0]} on the left and ${outcomes[1]} on the right, largest position first, with each holder's all-time leaderboard rank. Positions move live: trades update shares, entry price and realized PnL as they confirm, and the live price re-values every position. Pick a holder to open their holder analysis.`}
    >
      {waiting || (
        <div className="space-y-3">
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
            onPickTrader={actions?.pickTrader}
          />
        </div>
      )}
    </TerminalPanelFrame>
  );
}

export function MarketSupplyPanel() {
  const { supply, outcomes } = useHolderSession();
  const waiting = useMarketWaiting();
  return (
    <TerminalPanelFrame
      title="Profit, loss and ownership"
      description="The dollars each outcome's holders have in positions above and below the price they paid, how many holders are making or losing money, and how much of the supply the single largest holder and the rest of the top 10 own. Average entry is the price paid per share across the whole supply. Everything re-values live with the price."
    >
      {waiting || <HolderSupplyPanels sides={supply.sides} outcomes={outcomes} error={supply.error} />}
    </TerminalPanelFrame>
  );
}

export function MarketEntryPanel() {
  const { supply, outcomes } = useHolderSession();
  const waiting = useMarketWaiting();
  return (
    <TerminalPanelFrame
      title="Where the supply was bought"
      description={`Every holder's position placed at the average price they paid, in one-cent buckets, with ${outcomes[0]} and ${outcomes[1]} stacked on the same axis. Tall bars are price levels where a lot of supply changed hands, and the dashed lines mark where each outcome trades now. An outcome's bars to the right of its own line paid more than today's price and are sitting on a loss, so they may sell if the price climbs back to their entry. Switch between shares, their value now, and what was paid. Bars move as holders trade and the lines move with the live price.`}
    >
      {waiting || <HolderEntryHistogram sides={supply.sides} outcomes={outcomes} loading={supply.loading} />}
    </TerminalPanelFrame>
  );
}

export function MarketHeatmapPanel() {
  const { holders, holderDetails, holderFlags, outcomes, actions } = useHolderSession();
  const waiting = useMarketWaiting();
  return (
    <TerminalPanelFrame
      title="Holder heatmap"
      description={`Up to the largest ${HEATMAP_TILES} holders of each outcome as tiles, ${outcomes[0]} on the left and ${outcomes[1]} on the right. A tile's area is its share of the supply, and the grey tile is everyone too small to draw. Colour by position size to see who dominates, or by profit and loss to see who is up and who is underwater; both sides share one colour scale. Flags outline the tiles they mark, the same flags as the holders table. Tiles re-colour live and a click opens the holder's analysis.`}
    >
      {waiting || (
        <div className="space-y-3">
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
            onPickTrader={actions?.pickTrader}
          />
        </div>
      )}
    </TerminalPanelFrame>
  );
}

export function MarketScoresPanel() {
  const { holders, holderDetails, outcomes } = useHolderSession();
  const waiting = useMarketWaiting();
  return (
    <TerminalPanelFrame
      title={`Are better traders on ${outcomes[0]} or ${outcomes[1]}?`}
      description={`Each of the top ${HEATMAP_TILES} holders per side gets a Lychee Skill Score from how they did in markets that have finished. The aggregate score weights those by shares held, and the curves show how the scores spread across each side's supply against a typical trader. A side carried by proven traders sits to the right. Weights move live with positions.`}
    >
      {waiting || <HolderScoreDistribution sides={holders.sides} details={holderDetails.details} outcomes={outcomes} limit={HEATMAP_TILES} />}
    </TerminalPanelFrame>
  );
}
