"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFeatureTipDismissal } from "@/components/ui/feature-tip";
import { useMyStateV2 } from "@/context/stateContextV2";
import { useUser } from "@/lib/hooks";
import { siteConfig } from "@/lib/site";
import { cn } from "@/lib/utils";
import { exploreFromTerminal, nameTerminalSubject, placeTerminalSubjects } from "../openTerminalTab";
import { PanelSizing } from "../terminalPanelFrame";
import { MovedViewTip, currentViewTip, setViewTip, useViewTip } from "../terminalViewTip";
import { HolderBrowse } from "./browse/holderBrowse";
import {
  MarketEntryPanel,
  MarketHeatmapPanel,
  MarketHoldersPanel,
  MarketLastPricePanel,
  MarketPriceNewsPanel,
  MarketPricePanel,
  MarketScoresPanel,
  MarketStatsPanel,
  MarketSupplyPanel,
  MarketTradesPanel,
} from "./holderMarketView";
import { HolderSessionProvider, useHolderSession } from "./holderSession";
import { HolderTerminalSearch } from "./holderTerminalSearch";
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
} from "./holderTraderView";

function HolderIntroPanel() {
  return (
    <header className="max-w-3xl px-6 pb-5 pt-6 pr-10">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Lychee Holder Terminal: Polymarket</h2>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        Welcome to the terminal. Kash here (
        <a href={siteConfig.links.twitter} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline-offset-4 hover:underline">
          @misterrpink
        </a>
        ). I used all my technical, quant, data engineering and research methodology knowledge to answer one question: what
        would my dream whale-tracking research station look like? Lychee Holder Terminal is what I came up with. Hope you enjoy.
      </p>
    </header>
  );
}

function HolderSearchPanel() {
  const { subject, actions } = useHolderSession();
  return <HolderTerminalSearch onPick={actions.pick} onExplore={subject ? actions.explore : undefined} className="max-w-3xl px-4 pb-4 pt-3 pr-10" />;
}

function HolderBrowsePanel() {
  const { actions } = useHolderSession();
  return <HolderBrowse onPick={actions.pick} className="px-4 pb-4 pt-3" />;
}

/**
 * Every panel the Holder Terminal can put on a tab. `view` limits a panel to one kind of
 * subject; `rows(session)` is the raw data a table panel exports; `overflow` lets a panel's
 * popovers (the search results) spill over the panels below it.
 */
export const HOLDER_PANELS = {
  intro: { title: "Lychee Holder Terminal", Component: HolderIntroPanel },
  search: { title: "Search markets and traders", Component: HolderSearchPanel, overflow: true },
  browse: { title: "Explore markets", view: "browse", Component: HolderBrowsePanel },
  "market.stats": { title: "Market stats", view: "market", Component: MarketStatsPanel },
  "market.lastPrice": { title: "Last traded price", view: "market", Component: MarketLastPricePanel },
  "market.trades": { title: "Every trade in this market", view: "market", Component: MarketTradesPanel, rows: (session) => session.rows },
  "market.price": { title: "Price chart", view: "market", Component: MarketPricePanel },
  "market.priceNews": { title: "Price and news", view: "market", Component: MarketPriceNewsPanel },
  "market.holders": {
    title: "Who holds this market",
    view: "market",
    Component: MarketHoldersPanel,
    rows: (session) => (session.holders.sides || []).flatMap((side, index) => side.rows.map((row) => ({ outcome: session.outcomes[index], ...row }))),
  },
  "market.supply": { title: "Profit, loss and ownership", view: "market", Component: MarketSupplyPanel },
  "market.entry": { title: "Where the supply was bought", view: "market", Component: MarketEntryPanel },
  "market.heatmap": { title: "Holder heatmap", view: "market", Component: MarketHeatmapPanel },
  "market.scores": { title: "Holder skill by side", view: "market", Component: MarketScoresPanel },
  "trader.stats": { title: "Trader stats", view: "trader", Component: TraderStatsPanel },
  "trader.pnl": { title: "PnL over time", view: "trader", Component: TraderPnlChartPanel },
  "trader.trades": { title: "Trades", view: "trader", Component: TraderTradesPanel, rows: (session) => session.activity.rows },
  "trader.positions": { title: "Active positions", view: "trader", Component: TraderPositionsPanel, rows: (session) => session.positions.rows },
  "trader.finished": { title: "Finished bets", view: "trader", Component: TraderFinishedPanel, rows: (session) => session.finishedBets },
  "trader.pnlQuestion": { title: "PnL by question", view: "trader", Component: TraderPnlQuestionPanel },
  "trader.pnlCategory": { title: "PnL by category", view: "trader", Component: TraderCategoryChartPanel },
  "trader.pnlPeriod": { title: "PnL by period", view: "trader", Component: TraderPeriodPanel },
  "trader.categoryTable": { title: "PnL by category and sub-category", view: "trader", Component: TraderCategoryTablePanel },
  "trader.holdEdge": { title: "Edge by holding duration", view: "trader", Component: TraderHoldingEdgePanel },
  "trader.marketFocus": { title: "Market specific", view: "trader", Component: TraderMarketFocusPanel },
};

/**
 * Where each view's panels start: `span` of the 24 canvas columns and a starting height. `fit`
 * panels grow to their content until the user resizes them. Bump the version and give new
 * panels `since: <version>` to add them to tabs laid out before; panels a user removed stay removed.
 */
export const HOLDER_BLUEPRINT_VERSION = 1;

const HEAD = [
  { panel: "intro", span: 24, h: 180, fit: true },
  { panel: "search", span: 24, h: 96, fit: true },
];

export const HOLDER_BLUEPRINT = {
  browse: [...HEAD, { panel: "browse", span: 24, h: 900, fit: true }],
  market: [
    ...HEAD,
    { panel: "market.stats", span: 8, h: 540, fit: true },
    { panel: "market.lastPrice", span: 16, h: 540 },
    { panel: "market.trades", span: 24, h: 760, fit: true },
    { panel: "market.price", span: 24, h: 520, fit: true },
    { panel: "market.priceNews", span: 24, h: 900, fit: true },
    { panel: "market.holders", span: 24, h: 760, fit: true },
    { panel: "market.supply", span: 24, h: 420, fit: true },
    { panel: "market.entry", span: 24, h: 560, fit: true },
    { panel: "market.heatmap", span: 24, h: 640, fit: true },
    { panel: "market.scores", span: 24, h: 560, fit: true },
  ],
  trader: [
    ...HEAD,
    { panel: "trader.stats", span: 8, h: 520, fit: true },
    { panel: "trader.pnl", span: 16, h: 520 },
    { panel: "trader.trades", span: 24, h: 680, fit: true },
    { panel: "trader.positions", span: 24, h: 640, fit: true },
    { panel: "trader.finished", span: 24, h: 1000, fit: true },
    { panel: "trader.pnlQuestion", span: 24, h: 520, fit: true },
    { panel: "trader.pnlCategory", span: 12, h: 400, fit: true },
    { panel: "trader.pnlPeriod", span: 12, h: 400, fit: true },
    { panel: "trader.categoryTable", span: 24, h: 480, fit: true },
    { panel: "trader.holdEdge", span: 24, h: 360, fit: true },
    { panel: "trader.marketFocus", span: 24, h: 760, fit: true },
  ],
};

export function useHolderSessionView() {
  return useHolderSession()?.view || "";
}

/** The tab a pick just opened. It starts at the top instead of the scroll the old tab left behind. */
let openedTabId = "";

/**
 * Runs one Holder Terminal tab: its data, and what picking a market or trader does. A tab the
 * user has `customized` is their dashboard, so picks and Explore open other tabs instead of
 * changing this one. `onTop` scrolls back to the top after this tab's subject changes, or when a
 * pick has just opened it.
 */
export function HolderHost({ tab, customized = false, onTop, selectTab, children }) {
  const ctx = useMyStateV2();
  const user = useUser();
  const subject = tab?.terminalSubject || null;
  const sharedTip = useViewTip();
  const tip = tab?.id && sharedTip?.hostId === tab.id ? sharedTip : null;
  const movedTip = useFeatureTipDismissal("holder-terminal-moved-tab");
  const latest = useRef(null);
  latest.current = { ctx, accountId: user?.userId || "", tab, subject, customized, onTop, selectTab };

  useEffect(() => {
    if (!tab?.id || openedTabId !== tab.id) return;
    openedTabId = "";
    onTop?.();
  }, [tab?.id, onTop]);

  const actions = useMemo(() => {
    const pick = (subjects) => {
      const { ctx: state, accountId, tab: host, customized: keepHost, onTop: toTop, selectTab: select } = latest.current;
      if (!host?.id) return;
      if (currentViewTip()?.hostId === host.id) setViewTip(null);
      const ids = placeTerminalSubjects({ ctx: state, tabId: host.id, subjects, accountId, keepHost });
      if (keepHost) {
        if (ids[0]) {
          openedTabId = ids[0];
          select?.(ids[0]);
        }
      } else {
        toTop?.();
      }
    };
    return {
      pick,
      pickMarket: (market) => pick([market]),
      pickTrader: ({ address, title }) => {
        const from = latest.current.subject;
        pick([
          {
            kind: "trader",
            address,
            title,
            ...(from?.kind === "market" ? { fromMarket: { conditionId: from.conditionId, title: from.title, slug: from.slug } } : {}),
          },
        ]);
      },
      nameSubject: (title) => {
        const { ctx: state, accountId, tab: host } = latest.current;
        if (host?.id) nameTerminalSubject({ ctx: state, tabId: host.id, accountId, title });
      },
      explore: () => {
        const { ctx: state, accountId, tab: host, subject: shown, customized: keepHost, onTop: toTop, selectTab: select } = latest.current;
        if (!host?.id || !shown) return;
        const result = exploreFromTerminal({ ctx: state, tabId: host.id, accountId, keepHost });
        if (!result) return;
        const moved = result.exploreId === host.id;
        setViewTip({ hostId: result.exploreId, tabId: result.viewId, kind: shown.kind, moved });
        if (moved) toTop?.();
        else {
          openedTabId = result.exploreId;
          select?.(result.exploreId);
        }
      },
    };
  }, []);

  const openTab = (id) => {
    setViewTip(null);
    latest.current.selectTab?.(id);
  };
  const closeTip = useRef(() => setViewTip(null)).current;
  const spendTip = () => {
    movedTip.dismiss();
    if (currentViewTip() === tip) setViewTip(null);
  };

  return (
    <HolderSessionProvider subject={subject} actions={actions}>
      {children}
      {tip && movedTip.dismissed === false ? (
        <MovedViewTip tabId={tip.tabId} kind={tip.kind} moved={tip.moved} onOpen={() => openTab(tip.tabId)} onClose={closeTip} onSpent={spendTip} />
      ) : null}
    </HolderSessionProvider>
  );
}

/** The blueprint as one page, for the landing demo, where the terminal isn't a dashboard to rearrange. */
export function HolderPanelStack() {
  const view = useHolderSessionView();
  const entries = HOLDER_BLUEPRINT[view] || [];
  return (
    <PanelSizing fit>
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(24, minmax(0, 1fr))" }}>
        {entries.map((entry) => {
          const spec = HOLDER_PANELS[entry.panel];
          if (!spec) return null;
          const Panel = spec.Component;
          return (
            <section
              key={entry.panel}
              data-terminal-panel={entry.panel}
              aria-label={spec.title}
              className={cn(
                "flex min-w-0 flex-col rounded-xl border border-border/70 bg-background shadow-sm",
                spec.overflow ? "relative z-10" : "overflow-hidden",
                entry.span < 24 ? "max-lg:!col-span-full" : "",
              )}
              style={{ gridColumn: `span ${entry.span} / span ${entry.span}` }}
            >
              <Panel />
            </section>
          );
        })}
      </div>
    </PanelSizing>
  );
}
