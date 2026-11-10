"use client";

import { Loader2 } from "lucide-react";
import { TerminalPanelFrame } from "@/components/terminals/terminalPanelFrame";
import {
  MarketEntryPanel,
  MarketHeatmapPanel,
  MarketHoldersPanel,
  MarketScoresPanel,
  MarketStatsPanel,
  MarketSupplyPanel,
  MarketTradesPanel,
} from "@/components/terminals/holder/holderMarketView";
import {
  TraderCategoryChartPanel,
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
import { chosenName, shortWallet, useHolderSession } from "@/components/terminals/holder/holderSession";
import { MarketPriceNews } from "@/components/terminals/holder/marketPriceNews";
import { cn } from "@/lib/utils";
import { useTraderHolders } from "./traderHolders";

function Waiting({ label }) {
  return (
    <div className="flex min-h-40 items-center justify-center gap-2 text-[12px] text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

function MarketGate({ children }) {
  const { meta, stats, error } = useHolderSession();
  if (error && !meta) return <p className="flex min-h-40 items-center justify-center px-6 text-center text-[13px] text-muted-foreground">{error}</p>;
  if (!meta || !stats) return <Waiting label="Loading the market" />;
  return children;
}

function PriceChartPanel({ story }) {
  const { meta, stats } = useHolderSession();
  return (
    <TerminalPanelFrame title="Price and news over the market's life">
      <MarketGate>
        {meta && stats ? (
          <MarketPriceNews meta={meta} livePrices={stats.prices} part="chart" focusArticle={story.focusArticle} onNews={story.onNews} />
        ) : null}
      </MarketGate>
    </TerminalPanelFrame>
  );
}

function HeadlinesPanel({ story }) {
  const { meta, stats } = useHolderSession();
  return (
    <TerminalPanelFrame title="Latest headlines">
      <MarketGate>
        {meta && stats ? (
          <MarketPriceNews meta={meta} livePrices={stats.prices} part="headlines" onShowArticle={story.showOnChart} onNews={story.onNews} />
        ) : null}
      </MarketGate>
    </TerminalPanelFrame>
  );
}

function money(value) {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(value);
}

/** The largest holders on each side as buttons, for picking the wallet to follow next. */
function PickHolderPanel() {
  const { holders, actions } = useHolderSession();
  const sides = useTraderHolders(holders.sides);
  return (
    <TerminalPanelFrame title="Choose a holder to investigate">
      <MarketGate>
        {!sides ? (
          <Waiting label="Loading the holders" />
        ) : (
          <div data-tour="pick-holder" className="grid gap-3 sm:grid-cols-2">
            {sides.map((side, index) => (
              <section key={side.outcome} aria-label={`Largest ${side.outcome} holders`} className="rounded-xl border border-border/70 bg-background p-2 shadow-sm">
                <p className={cn("px-2 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide", index ? "text-rose-600" : "text-emerald-600")}>
                  {side.outcome}
                </p>
                <ul className="space-y-1">
                  {side.rows.map((row) => {
                    const name = chosenName(row.name) || row.pseudonym || shortWallet(row.wallet);
                    return (
                      <li key={row.wallet}>
                        <button
                          type="button"
                          onClick={() => actions?.pickTrader?.({ address: row.wallet, title: name })}
                          className="flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                        >
                          {row.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={row.image} alt="" className="size-7 shrink-0 rounded-full object-cover" />
                          ) : (
                            <span className="size-7 shrink-0 rounded-full bg-gradient-to-br from-sky-400 to-violet-500" aria-hidden />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium text-foreground">{name}</span>
                            <span className="block text-[11.5px] tabular-nums text-muted-foreground">
                              {Math.round(row.amount).toLocaleString()} shares{row.value != null ? ` · ${money(row.value)}` : ""}
                              {row.supplyPct != null ? ` · ${row.supplyPct.toFixed(1)}% of supply` : ""}
                            </span>
                          </span>
                          <span className="shrink-0 text-[12px] text-secondary" aria-hidden>
                            Investigate →
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </MarketGate>
    </TerminalPanelFrame>
  );
}

function TraderPatternsPanel() {
  return (
    <div className="divide-y divide-border/60">
      <TraderCategoryChartPanel />
      <TraderPeriodPanel />
      <TraderHoldingEdgePanel />
    </div>
  );
}

const PANELS = {
  priceChart: PriceChartPanel,
  headlines: HeadlinesPanel,
  stats: MarketStatsPanel,
  trades: MarketTradesPanel,
  heatmap: MarketHeatmapPanel,
  holders: MarketHoldersPanel,
  supply: MarketSupplyPanel,
  entry: MarketEntryPanel,
  scores: MarketScoresPanel,
  pickHolder: PickHolderPanel,
  traderStats: TraderStatsPanel,
  traderPnl: TraderPnlChartPanel,
  traderQuestions: TraderPnlQuestionPanel,
  traderPositions: TraderPositionsPanel,
  traderFinished: TraderFinishedPanel,
  traderPatterns: TraderPatternsPanel,
  traderTrades: TraderTradesPanel,
  traderFocus: TraderMarketFocusPanel,
};

/** One step's live terminal panel. `story` carries the page-level hooks some panels need. */
export function LandingPanel({ panel, story }) {
  const session = useHolderSession();
  const Panel = PANELS[panel];
  if (!Panel || !session?.subject) return null;
  return <Panel story={story} />;
}
