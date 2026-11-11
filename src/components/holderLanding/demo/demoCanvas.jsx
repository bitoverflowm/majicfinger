"use client";

import { createContext, memo, useContext, useEffect, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { formatUsd } from "@/components/dashboardComposer/recipes/polymarketMarketSearch";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { Skeleton } from "@/components/ui/skeleton";
import { PanelSizing, TerminalPanelFrame } from "@/components/terminals/terminalPanelFrame";
import {
  MarketEntryPanel,
  MarketHeatmapPanel,
  MarketHoldersPanel,
  MarketLastPricePanel,
  MarketPricePanel,
  MarketScoresPanel,
  MarketStatsPanel,
  MarketSupplyPanel,
} from "@/components/terminals/holder/holderMarketView";
import { useHolderSession } from "@/components/terminals/holder/holderSession";
import { HolderTradesTable, MergeOutcomesButton } from "@/components/terminals/holder/holderTradesTable";
import {
  TraderCategoryChartPanel,
  TraderCategoryTablePanel,
  TraderFinishedPanel,
  TraderHoldingEdgePanel,
  TraderMarketFocusPanel,
  TraderPeriodPanel,
  TraderPnlChartPanel,
  TraderPnlQuestionPanel,
  TraderPositionsPanel,
  TraderStatsPanel,
  TraderTradesPanel,
} from "@/components/terminals/holder/holderTraderView";
import { LiveDot } from "@/components/terminals/holder/liveDot";
import { MarketPriceNews } from "@/components/terminals/holder/marketPriceNews";
import { SteadyMarketSession } from "./demoSession";
import { cn } from "@/lib/utils";

/** What each panel answers, shown over it while the demo is paused. */
export const PANEL_COPY = {
  search: ["Search", "Type a market, event or trader in plain English, or paste a Polymarket link. Pick one and the whole terminal fills in."],
  "market.stats": ["Market stats", "The live price, best bid and ask, 24-hour volume, total volume and liquidity, updating as trades print."],
  "market.lastPrice": ["Last traded price", "Every fill as a point on the chart, so you can see exactly where and when size traded."],
  "market.trades": ["Every trade", "Each fill as it happens, Yes and No side by side or merged into one list. Click a trader to open their record."],
  "market.price": ["Price chart", "Polymarket's price for both outcomes from the day the market opened, extending live."],
  "market.priceNews": ["Price and news", "Headlines placed where they broke, with coverage bars under the price, so you can see what moved the odds."],
  "market.holders": ["Who holds this market", "Every wallet on Yes and No, largest first, with leaderboard rank, P&L and flags for new wallets and two-sided holders."],
  "market.supply": ["Profit, loss and ownership", "How much each side is up or down, how many holders are underwater, and how much the top 10 own."],
  "market.entry": ["Where the supply was bought", "Every position at the price its holder paid. Bars past today's line are sitting on a loss."],
  "market.heatmap": ["Holder heatmap", "The largest holders as tiles sized by their share of supply. Colour by size, profit and loss, or skill."],
  "market.scores": ["Holder skill by side", "Each top holder's Lychee Skill Score from finished markets, weighted by size, so you can see which side proven traders back."],
  "trader.stats": ["Trader stats", "Realized and open P&L, volume, biggest win, and the Lychee Skill Score for the whole wallet."],
  "trader.pnl": ["P&L over time", "The wallet's cumulative profit and loss, day by day, from its first trade."],
  "trader.trades": ["Trades", "Every trade the wallet makes, live, with the market and the price paid."],
  "trader.positions": ["Active positions", "What the wallet still holds: shares, average cost, value now and open P&L."],
  "trader.finished": ["Finished bets", "Every closed or resolved position as a win or a loss, with return on cost."],
  "trader.pnlQuestion": ["P&L by question", "The markets that made and lost the wallet money, biggest first."],
  "trader.pnlCategory": ["P&L by category", "Politics, sports, crypto and more: where the wallet's edge actually is."],
  "trader.pnlPeriod": ["P&L by period", "Results by week and month, to see whether the edge is steady or one lucky run."],
  "trader.categoryTable": ["Category breakdown", "Win rate, average win and loss, and return for every category and sub-category."],
  "trader.holdEdge": ["Edge by holding time", "Whether the wallet makes its money on quick flips or on long holds."],
  "trader.marketFocus": ["Market specific", "Every buy and sell the wallet made in one market, on the price line, next to the headlines of the day."],
};

/** The panel a canvas opened on. It lands first, whatever its place in the layout. */
const LeadPanelContext = createContext(null);

/** Grows in like a block landing on the dashboard canvas, with a skeleton until its panel is ready. */
function DemoCard({ id, span = 24, height, fit = true, order: listed = 0, hovered, children }) {
  const order = useContext(LeadPanelContext) === id ? 0 : listed;
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 260 + order * 140);
    return () => window.clearTimeout(timer);
  }, [order]);
  const copy = PANEL_COPY[id];
  return (
    <div
      data-demo-panel={id}
      className={cn(
        "relative flex min-w-0 flex-col overflow-hidden rounded-xl border bg-background shadow-sm transition-[border-color,box-shadow] duration-300",
        hovered === id ? "border-[#0d99ff] ring-2 ring-[#0d99ff]/25" : "border-border/70",
        span === 8 && "col-span-2",
        span === 12 && "col-span-3",
        span === 16 && "col-span-4",
        span === 24 && "col-span-6",
      )}
      style={{
        height,
        animation: `hd-arrive 520ms cubic-bezier(0.22, 1, 0.36, 1) ${order * 90}ms both`,
        // Off-screen panels skip layout and paint; the whole terminal is mounted at once.
        contentVisibility: "auto",
        containIntrinsicSize: `auto ${height || 640}px`,
      }}
    >
      {ready ? (
        <PanelSizing fit={fit}>
          <div data-terminal-panel={id} className="flex min-h-0 min-w-0 flex-1 flex-col">
            <ErrorBoundary name={`demo:${id}`} fallback={null}>
              {children}
            </ErrorBoundary>
          </div>
        </PanelSizing>
      ) : (
        <div className="space-y-3 p-4">
          <Skeleton className="h-4 w-48 bg-black/[0.06]" />
          <Skeleton className="h-3 w-80 bg-black/[0.05]" />
          <Skeleton className="h-40 w-full rounded-lg bg-black/[0.04]" />
        </div>
      )}
      {copy && hovered === id ? (
        <div className="pointer-events-none absolute right-3 top-3 z-20 w-[300px] rounded-xl bg-slate-900/95 p-3.5 text-white shadow-2xl animate-in fade-in zoom-in-95 duration-200">
          <p className="text-[13px] font-semibold">{copy[0]}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-white/75">{copy[1]}</p>
        </div>
      ) : null}
    </div>
  );
}

function DemoTradesPanel() {
  const { meta, tradeRows, live, merged, setMerged, outcomes, historyLoaded, actions } = useHolderSession();
  return (
    <TerminalPanelFrame
      title="Every trade in this market"
      description={`Each fill on Polymarket, ${merged ? `${outcomes[0]} and ${outcomes[1]} together in one list` : `${outcomes[0]} on the left and ${outcomes[1]} on the right`}. New trades stream in at the top as they happen.`}
    >
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <span data-demo="merge">
            <MergeOutcomesButton merged={merged} outcomes={outcomes} onChange={setMerged} />
          </span>
          <div className="flex items-center gap-3">
            <span className="text-[12px] text-muted-foreground">Newest trades first</span>
            <LiveDot on={live} label="Streaming" />
          </div>
        </div>
        <div key={merged ? "merged" : "split"} style={{ animation: "hd-swap 420ms cubic-bezier(0.22, 1, 0.36, 1) both" }}>
          <HolderTradesTable meta={meta} rows={tradeRows} merged={merged} loading={false} ready={historyLoaded} onPickTrader={actions?.pickTrader} />
        </div>
      </div>
    </TerminalPanelFrame>
  );
}

function DemoPriceNewsPanel() {
  const { meta, stats } = useHolderSession();
  return (
    <TerminalPanelFrame
      title="Price and news over the market's life"
      description="Each headline sits where it broke and the bars underneath show how much coverage there was, so a burst of news next to a jump in the odds stands out."
    >
      <MarketPriceNews meta={meta} livePrices={stats.prices} part="chart" />
    </TerminalPanelFrame>
  );
}

/** The canvas grid. `lead` is kept from the first render, so the panel the canvas opened on lands first. */
function CanvasGrid({ lead, children }) {
  const [first] = useState(lead);
  return (
    <LeadPanelContext.Provider value={first}>
      <div className="grid grid-cols-6 gap-3">{children}</div>
    </LeadPanelContext.Provider>
  );
}

export const MarketCanvas = memo(function MarketCanvas({ hovered, lead }) {
  return (
    <CanvasGrid lead={lead}>
      <DemoCard id="market.stats" span={8} height={470} order={0} hovered={hovered}>
        <MarketStatsPanel />
      </DemoCard>
      <DemoCard id="market.lastPrice" span={16} height={470} fit={false} order={1} hovered={hovered}>
        <MarketLastPricePanel />
      </DemoCard>
      <DemoCard id="market.trades" order={2} hovered={hovered}>
        <DemoTradesPanel />
      </DemoCard>
      <SteadyMarketSession>
        <DemoCard id="market.price" order={3} hovered={hovered}>
          <MarketPricePanel />
        </DemoCard>
        <DemoCard id="market.priceNews" order={4} hovered={hovered}>
          <DemoPriceNewsPanel />
        </DemoCard>
        <DemoCard id="market.holders" order={5} hovered={hovered}>
          <MarketHoldersPanel />
        </DemoCard>
        <DemoCard id="market.supply" order={6} hovered={hovered}>
          <MarketSupplyPanel />
        </DemoCard>
        <DemoCard id="market.entry" order={7} hovered={hovered}>
          <MarketEntryPanel />
        </DemoCard>
        <DemoCard id="market.heatmap" order={8} hovered={hovered}>
          <MarketHeatmapPanel />
        </DemoCard>
        <DemoCard id="market.scores" order={9} hovered={hovered}>
          <MarketScoresPanel />
        </DemoCard>
      </SteadyMarketSession>
    </CanvasGrid>
  );
});

export const TraderCanvas = memo(function TraderCanvas({ hovered, lead }) {
  return (
    <CanvasGrid lead={lead}>
      <DemoCard id="trader.stats" span={8} height={500} order={0} hovered={hovered}>
        <TraderStatsPanel />
      </DemoCard>
      <DemoCard id="trader.pnl" span={16} height={500} fit={false} order={1} hovered={hovered}>
        <TraderPnlChartPanel />
      </DemoCard>
      <DemoCard id="trader.trades" order={2} hovered={hovered}>
        <TraderTradesPanel />
      </DemoCard>
      <DemoCard id="trader.positions" order={3} hovered={hovered}>
        <TraderPositionsPanel />
      </DemoCard>
      <DemoCard id="trader.finished" order={4} hovered={hovered}>
        <TraderFinishedPanel />
      </DemoCard>
      <DemoCard id="trader.pnlQuestion" order={5} hovered={hovered}>
        <TraderPnlQuestionPanel />
      </DemoCard>
      <DemoCard id="trader.pnlCategory" span={12} order={6} hovered={hovered}>
        <TraderCategoryChartPanel />
      </DemoCard>
      <DemoCard id="trader.pnlPeriod" span={12} order={6} hovered={hovered}>
        <TraderPeriodPanel />
      </DemoCard>
      <DemoCard id="trader.categoryTable" order={7} hovered={hovered}>
        <TraderCategoryTablePanel />
      </DemoCard>
      <DemoCard id="trader.holdEdge" order={8} hovered={hovered}>
        <TraderHoldingEdgePanel />
      </DemoCard>
      <DemoCard id="trader.marketFocus" order={9} hovered={hovered}>
        <TraderMarketFocusPanel />
      </DemoCard>
    </CanvasGrid>
  );
});

/** Looks like the terminal's search, driven by the demo instead of the keyboard. */
export function DemoSearchPanel({ mode = "market", query, typed, focused, open, highlight, suggestions, hovered }) {
  const loading = focused && typed.length === query.length && !open;
  const traders = mode === "trader";
  const tab = (active) => cn("rounded-md px-3 py-1 font-medium transition-colors duration-200", active ? "bg-background text-foreground shadow-sm" : "text-muted-foreground");
  return (
    <div
      data-demo-panel="search"
      className={cn(
        "relative rounded-xl border bg-background px-4 pb-4 pt-3 shadow-sm transition-[border-color,box-shadow] duration-300",
        hovered === "search" ? "border-[#0d99ff] ring-2 ring-[#0d99ff]/25" : "border-border/70",
      )}
    >
      <div className="max-w-3xl">
        <div className="mb-2 inline-flex rounded-lg bg-muted p-0.5 text-[12px]">
          <span className={tab(!traders)}>Search market</span>
          <span data-demo="trader-tab" className={tab(traders)}>
            Search trader
          </span>
        </div>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 flex size-4 -translate-y-1/2 items-center justify-center text-muted-foreground">
            {loading ? <Loader2 className="size-4 animate-spin text-primary" aria-hidden /> : <Search className="size-4" aria-hidden />}
          </span>
          <div
            data-demo="search-input"
            className={cn(
              "flex h-9 w-full items-center rounded-lg border border-border bg-background pl-9 pr-3 text-xs",
              focused && "ring-2 ring-ring ring-offset-2 ring-offset-background",
            )}
          >
            {typed ? (
              <span className="text-foreground">{typed}</span>
            ) : (
              <span className="text-muted-foreground">
                {traders ? "Search a username or paste a wallet address" : "Search markets, events or series in plain English, or paste a link"}
              </span>
            )}
            {focused && typed.length < query.length ? <span className="ml-px h-4 w-px bg-foreground" style={{ animation: "hd-caret 1s steps(1) infinite" }} /> : null}
          </div>
          {open ? (
            <ul className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-border bg-popover py-1 shadow-md animate-in fade-in slide-in-from-top-1 duration-200">
              {suggestions.map((item, index) => (
                <li
                  key={item.title}
                  data-demo={index === 0 ? "suggestion" : undefined}
                  className={cn("flex flex-col gap-1 px-3 py-2 transition-colors duration-200", highlight && index === 0 && "bg-accent")}
                  style={{ animation: `hd-arrive 260ms ease-out ${index * 50}ms both` }}
                >
                  <span className="flex items-center gap-2">
                    {item.icon ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.icon} alt="" className={cn("size-5 shrink-0 object-cover", traders ? "rounded-full" : "rounded")} />
                    ) : null}
                    <span className="min-w-0 text-sm font-medium text-foreground">{item.title}</span>
                    {item.handle ? <span className="text-xs text-muted-foreground">{item.handle}</span> : null}
                  </span>
                  <span className="flex items-center gap-1.5 pl-7 text-[10px] text-muted-foreground">
                    {traders ? (
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[0.65rem] font-medium text-emerald-700 dark:text-emerald-300">trader</span>
                    ) : (
                      <span className="rounded bg-sky-500/10 px-1.5 py-0.5 font-mono text-[0.65rem] font-medium text-sky-700 dark:text-sky-300">market</span>
                    )}
                    {item.volume ? <span>vol {formatUsd(item.volume)}</span> : null}
                    {item.pnl != null ? <span>realized P&amp;L {formatUsd(item.pnl)}</span> : null}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** The empty terminal before a market is picked: the welcome, the search, and the canvas waiting below. */
export function HomeCanvas({ search }) {
  return (
    <div className="space-y-3">
      <header className="max-w-3xl px-2 pb-1 pt-3">
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Lychee Holder Terminal: Polymarket</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
          Pick a market to see its trades, headlines and largest holders, or a trader to see which positions made or lost them money.
        </p>
      </header>
      {search}
      <div className="grid grid-cols-6 gap-3 opacity-60">
        <div className="col-span-2 h-[300px] rounded-xl border border-dashed border-border bg-background/60" />
        <div className="col-span-4 h-[300px] rounded-xl border border-dashed border-border bg-background/60" />
        <div className="col-span-6 h-[220px] rounded-xl border border-dashed border-border bg-background/60" />
      </div>
    </div>
  );
}
