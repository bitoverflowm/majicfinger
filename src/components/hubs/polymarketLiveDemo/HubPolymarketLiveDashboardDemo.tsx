"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { LayoutDashboard, Loader2, PanelsTopLeft, Rows3 } from "lucide-react";

import { HubInPageLink } from "@/components/hubs/HubCtaButton";
import { SafariBrowserFrame } from "@/components/hubs/kalshiLiveDemo/SafariBrowserFrame";
import { HubPolymarketLiveCandlesticksDemo } from "@/components/hubs/polymarketLiveDemo/HubPolymarketLiveCandlesticksDemo";
import { HubPolymarketLiveHoldersDemo } from "@/components/hubs/polymarketLiveDemo/HubPolymarketLiveHoldersDemo";
import { HubPolymarketLiveOrderbookDemo } from "@/components/hubs/polymarketLiveDemo/HubPolymarketLiveOrderbookDemo";
import { HubPolymarketLivePricesDemo } from "@/components/hubs/polymarketLiveDemo/HubPolymarketLivePricesDemo";
import { useHubPolymarketLiveDemo } from "@/components/hubs/polymarketLiveDemo/HubPolymarketLiveDemoSelection";
import { HubPolymarketLiveSpreadDemo } from "@/components/hubs/polymarketLiveDemo/HubPolymarketLiveSpreadDemo";
import { HubPolymarketLiveTradesDemo } from "@/components/hubs/polymarketLiveDemo/HubPolymarketLiveTradesDemo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { normalizeChartEmbedSlug } from "@/lib/chartEmbedSlug";
import { useUser } from "@/lib/hooks";
import { cn } from "@/lib/utils";

type DashboardLayout = "one_view" | "separate_tabs";

type AnalyticsPanelId =
  | "prices-liveline"
  | "prices-history"
  | "spread-best-bid"
  | "spread-best-ask"
  | "spread-spread"
  | "spread-liquidity"
  | "spread-orderbook"
  | "orderbook-live"
  | "orderbook-snapshot"
  | "trades"
  | "candlesticks"
  | "holders";

const SEARCH_HREF = "#find-polymarket-markets";

const LAYOUT_OPTIONS: {
  id: DashboardLayout;
  label: string;
  description: string;
  icon: typeof Rows3;
}[] = [
  {
    id: "one_view",
    label: "Place all analytics into 1 view",
    description:
      "Stack every live chart on one scrolling page — no nested tabs inside each view.",
    icon: Rows3,
  },
  {
    id: "separate_tabs",
    label: "Place all analytics into separate tabs",
    description:
      "Give each chart its own tab so you can jump between prices, liquidity, trades, and holders.",
    icon: PanelsTopLeft,
  },
];

const ANALYTICS_PANELS: {
  id: AnalyticsPanelId;
  title: string;
  description: string;
}[] = [
  {
    id: "prices-liveline",
    title: "Real-time price",
    description: "Live last-trade prices as they print.",
  },
  {
    id: "prices-history",
    title: "Full price history",
    description: "Complete price path from Polymarket history.",
  },
  {
    id: "spread-best-bid",
    title: "Best bid",
    description: "Highest price buyers are offering.",
  },
  {
    id: "spread-best-ask",
    title: "Best ask",
    description: "Lowest price sellers are offering.",
  },
  {
    id: "spread-spread",
    title: "Spread",
    description: "Gap between best ask and best bid.",
  },
  {
    id: "spread-liquidity",
    title: "Liquidity",
    description: "Size available at the top of book.",
  },
  {
    id: "spread-orderbook",
    title: "Order book depth",
    description: "Bid and ask depth from the CLOB book.",
  },
  {
    id: "orderbook-live",
    title: "Live order book",
    description: "Bids, asks, and depth over websocket.",
  },
  {
    id: "orderbook-snapshot",
    title: "Order book snapshot",
    description: "Point-in-time book from REST.",
  },
  {
    id: "trades",
    title: "Recent trades",
    description: "Executed prints with live tape and filters.",
  },
  {
    id: "candlesticks",
    title: "Candlesticks",
    description: "Live OHLC bars from trade activity.",
  },
  {
    id: "holders",
    title: "Holders & positions",
    description: "Top holders, market P&L, and leaderboard rank.",
  },
];

function AnalyticsPanelBody({ id }: { id: AnalyticsPanelId }) {
  switch (id) {
    case "prices-liveline":
      return <HubPolymarketLivePricesDemo panelMode lockedTab="liveline" />;
    case "prices-history":
      return <HubPolymarketLivePricesDemo panelMode lockedTab="history" />;
    case "spread-best-bid":
      return <HubPolymarketLiveSpreadDemo panelMode lockedTab="best-bid" />;
    case "spread-best-ask":
      return <HubPolymarketLiveSpreadDemo panelMode lockedTab="best-ask" />;
    case "spread-spread":
      return <HubPolymarketLiveSpreadDemo panelMode lockedTab="spread" />;
    case "spread-liquidity":
      return <HubPolymarketLiveSpreadDemo panelMode lockedTab="liquidity" />;
    case "spread-orderbook":
      return <HubPolymarketLiveSpreadDemo panelMode lockedTab="orderbook" />;
    case "orderbook-live":
      return <HubPolymarketLiveOrderbookDemo panelMode lockedTab="live" />;
    case "orderbook-snapshot":
      return <HubPolymarketLiveOrderbookDemo panelMode lockedTab="snapshot" />;
    case "trades":
      return <HubPolymarketLiveTradesDemo panelMode />;
    case "candlesticks":
      return <HubPolymarketLiveCandlesticksDemo panelMode />;
    case "holders":
      return <HubPolymarketLiveHoldersDemo panelMode />;
    default:
      return null;
  }
}

export function HubPolymarketLiveDashboardDemo({
  heading,
  helper,
  placeholder,
}: {
  heading?: string;
  helper?: string;
  placeholder?: string;
}) {
  const selection = useHubPolymarketLiveDemo();
  const markets = selection?.markets ?? [];
  const hasSelection = markets.length > 0;
  const user = useUser();
  const username =
    String((user as { user_name?: string } | null)?.user_name || "")
      .trim()
      .replace(/^@/, "") || "you";

  const [layout, setLayout] = useState<DashboardLayout>("one_view");
  const [generating, setGenerating] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<AnalyticsPanelId>("prices-liveline");
  const [generatedLayout, setGeneratedLayout] = useState<DashboardLayout>("one_view");

  const marketTitle = useMemo(() => {
    if (!markets.length) return "";
    return markets
      .map((market) => String(market.title || market.slug || market.id || "Market").trim())
      .filter(Boolean)
      .join(" · ");
  }, [markets]);

  const addressUrl = useMemo(() => {
    const slug =
      normalizeChartEmbedSlug(marketTitle) ||
      normalizeChartEmbedSlug(String(markets[0]?.slug || "")) ||
      "polymarket-live";
    return `lycheedata.com/${username}/${slug}`;
  }, [marketTitle, markets, username]);

  const generateDashboard = () => {
    if (!hasSelection || generating) return;
    setGenerating(true);
    setGeneratedLayout(layout);
    setActivePanel("prices-liveline");
    window.setTimeout(() => {
      setGenerating(false);
      setModalOpen(true);
    }, 450);
  };

  const openUpgrade = () => {
    setModalOpen(false);
    setUpgradeOpen(true);
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
      <div className="shrink-0 space-y-1">
        {heading ? (
          <h3 className="text-lg font-semibold tracking-tight text-foreground">{heading}</h3>
        ) : null}
        {helper ? (
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground">{helper}</p>
        ) : null}
      </div>

      {!hasSelection ? (
        <div className="flex min-h-[16rem] flex-1 flex-col items-center justify-center gap-2 px-4 text-center">
          <p className="text-sm text-muted-foreground">
            {placeholder || "Search for a Polymarket market to load this view."}
          </p>
          <HubInPageLink
            href={SEARCH_HREF}
            className="text-sm font-medium text-foreground underline underline-offset-4 hover:text-primary"
          >
            Select a market above
          </HubInPageLink>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="rounded-xl border border-border/70 bg-muted/15 px-4 py-3.5 sm:px-5">
            <p className="text-sm font-medium text-foreground">Ready to assemble</p>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">
              We’ll lay out every live chart from this page as a flat dashboard for{" "}
              <span className="font-medium text-foreground">{marketTitle}</span>
              {markets.length > 1 ? ` (${markets.length} markets)` : ""} — no nested tabs inside
              each view.
            </p>
          </div>

          <section className="space-y-2">
            <div>
              <h4 className="text-xs font-semibold text-foreground">Choose dashboard layout</h4>
              <p className="text-[11px] text-muted-foreground">
                Decide how the analytics should be organized when the dashboard opens.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {LAYOUT_OPTIONS.map((option) => {
                const checked = layout === option.id;
                const Icon = option.icon;
                return (
                  <label
                    key={option.id}
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 rounded-lg border p-3 transition-colors",
                      checked
                        ? "border-secondary/35 bg-secondary/10"
                        : "border-border/60 bg-background hover:bg-muted/30",
                    )}
                  >
                    <input
                      type="radio"
                      name="polymarket-hub-dashboard-layout"
                      value={option.id}
                      checked={checked}
                      onChange={() => setLayout(option.id)}
                      className="mt-0.5 size-4 accent-secondary"
                    />
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5 text-[11px] font-medium text-foreground">
                        <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        {option.label}
                      </span>
                      <span className="mt-0.5 block text-[10px] leading-snug text-muted-foreground">
                        {option.description}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          <div className="rounded-xl border border-border/70 bg-muted/10 px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Included analytics
            </p>
            <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
              {ANALYTICS_PANELS.map((panel) => (
                <li
                  key={panel.id}
                  className="rounded-md border border-border/50 bg-background/70 px-2.5 py-2"
                >
                  <p className="text-xs font-medium text-foreground">{panel.title}</p>
                  <p className="text-[10px] leading-snug text-muted-foreground">
                    {panel.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
            <p className="text-[11px] text-muted-foreground">
              Preview is free. Sign up to keep the dashboard live and save it.
            </p>
            <Button
              type="button"
              className="gap-1.5"
              disabled={generating}
              onClick={generateDashboard}
            >
              {generating ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <LayoutDashboard className="size-3.5" aria-hidden />
              )}
              {generating ? "Generating…" : "Generate a dashboard now for this market"}
            </Button>
          </div>
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent
          className={cn(
            "flex max-h-[92vh] w-[min(100vw-1rem,90rem)] max-w-none flex-col gap-0 overflow-hidden border-0 bg-transparent p-0 shadow-none sm:rounded-xl",
            "[&>button]:right-2 [&>button]:top-2 [&>button]:z-20 [&>button]:rounded-full [&>button]:bg-background/90 [&>button]:p-1.5 [&>button]:opacity-100 [&>button]:shadow-sm",
          )}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{marketTitle || "Polymarket live dashboard"}</DialogTitle>
            <DialogDescription>
              Preview dashboard combining live Polymarket analytics for the selected market.
            </DialogDescription>
          </DialogHeader>

          <SafariBrowserFrame
            url={addressUrl}
            className="max-h-[92vh]"
            bodyClassName="max-h-[calc(92vh-52px)]"
          >
            <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
              <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0 space-y-1">
                  <h2 className="text-balance text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                    {marketTitle || "Polymarket live dashboard"}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {ANALYTICS_PANELS.length} live charts
                    {generatedLayout === "separate_tabs"
                      ? " · separate tabs"
                      : " · single scrolling view"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 border-emerald-500/40 bg-emerald-500/10 px-3 text-xs font-medium text-foreground hover:bg-emerald-500/15"
                    onClick={openUpgrade}
                  >
                    <span
                      className="size-2 shrink-0 animate-pulse rounded-full bg-emerald-500"
                      aria-hidden
                    />
                    Start live feed
                  </Button>
                  <Button type="button" size="sm" className="h-8 px-3 text-xs" asChild>
                    <Link href="#polymarket-live-pricing" onClick={() => setModalOpen(false)}>
                      Get full access now
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 px-3 text-xs"
                    onClick={openUpgrade}
                  >
                    Customize Dashboard
                  </Button>
                </div>
              </div>

              {generatedLayout === "separate_tabs" ? (
                <div className="flex min-h-0 flex-col gap-3">
                  <div
                    className="flex flex-wrap gap-1.5 rounded-lg border border-border/60 bg-muted/20 p-1.5"
                    role="tablist"
                    aria-label="Dashboard analytics"
                  >
                    {ANALYTICS_PANELS.map((panel) => {
                      const selected = activePanel === panel.id;
                      return (
                        <button
                          key={panel.id}
                          type="button"
                          role="tab"
                          aria-selected={selected}
                          onClick={() => setActivePanel(panel.id)}
                          className={cn(
                            "rounded-md px-2.5 py-1.5 text-[11px] font-medium transition-colors",
                            selected
                              ? "bg-background text-foreground shadow-sm ring-1 ring-border/70"
                              : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                          )}
                        >
                          {panel.title}
                        </button>
                      );
                    })}
                  </div>
                  <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/10">
                    <div className="h-[min(34rem,70vh)] overflow-hidden">
                      <AnalyticsPanelBody id={activePanel} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  {ANALYTICS_PANELS.map((panel) => (
                    <section
                      key={panel.id}
                      className="overflow-hidden rounded-xl border border-border/70 bg-muted/10"
                    >
                      <div className="border-b border-border/50 px-4 py-2.5">
                        <h3 className="text-sm font-semibold text-foreground">{panel.title}</h3>
                        <p className="text-[11px] text-muted-foreground">{panel.description}</p>
                      </div>
                      <div className="h-[min(30rem,62vh)] overflow-hidden">
                        <AnalyticsPanelBody id={panel.id} />
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </div>
          </SafariBrowserFrame>
        </DialogContent>
      </Dialog>

      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unlock live Polymarket dashboards</DialogTitle>
            <DialogDescription>
              Upgrade to customize this dashboard, keep every chart live, save the layout, and add
              more markets anytime. Full access also unlocks continuous refresh and publishing.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setUpgradeOpen(false)}>
              Close
            </Button>
            <Button type="button" asChild>
              <Link href="#polymarket-live-pricing" onClick={() => setUpgradeOpen(false)}>
                View pricing
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
