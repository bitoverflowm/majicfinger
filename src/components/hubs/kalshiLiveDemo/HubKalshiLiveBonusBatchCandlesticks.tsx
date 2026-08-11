"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, LayoutDashboard } from "lucide-react";

import { MarketTickerSearch } from "@/components/connectData/MarketTickerSearch";
import { HubKalshiLiveDemoCandlesticksProfessionalChart } from "@/components/hubs/kalshiLiveDemo/HubKalshiLiveDemoCandlesticksProfessionalChart";
import { SafariBrowserFrame } from "@/components/hubs/kalshiLiveDemo/SafariBrowserFrame";
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
import { inferSeriesTickerFromEvent } from "@/lib/kalshiLive/eventCandlesticksCompose";
import {
  buildMarketCardCaption,
  impliedChancePctFromMarketRow,
} from "@/lib/kalshiLive/eventCandlesticksPowerMove";
import { fetchKalshiLiveEvent } from "@/lib/kalshiLive/fetchKalshiLiveEvent";
import { buildStaticCandlestickRows } from "@/lib/kalshiLive/staticBatchCandlesticks";
import { useUser } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const MAX_MARKETS = 12;

type EventSelection = {
  eventTicker: string;
  seriesTicker: string;
  title: string;
};

type BatchMarketCard = {
  marketTicker: string;
  title: string;
  caption: string;
  chancePct: number | null;
  candles: Record<string, unknown>[];
};

type BatchDashboard = {
  eventTicker: string;
  seriesTicker: string;
  title: string;
  markets: BatchMarketCard[];
};

function formatChancePct(pct: number | null): string {
  if (pct == null || !Number.isFinite(pct)) return "";
  const rounded1 = Math.round(pct * 10) / 10;
  if (Number.isInteger(rounded1)) return `${rounded1}%`;
  return `${rounded1.toFixed(1)}%`;
}

function marketTitleFromRow(row: Record<string, unknown>, ticker: string): string {
  const yes = String(row.yes_sub_title || "").trim();
  const subtitle = String(row.subtitle || row.sub_title || "").trim();
  const title = String(row.title || "").trim();
  return yes || subtitle || title || ticker;
}

type HubKalshiLiveBonusBatchCandlesticksProps = {
  className?: string;
};

/**
 * Bonus Features — Batch Candlesticks.
 * Semantic event search → static multi-market candlestick dashboard in a Safari mock dialog.
 */
export function HubKalshiLiveBonusBatchCandlesticks({
  className,
}: HubKalshiLiveBonusBatchCandlesticksProps) {
  const user = useUser();
  const username =
    String((user as { user_name?: string } | null)?.user_name || "")
      .trim()
      .replace(/^@/, "") || "you";

  const [tickersValue, setTickersValue] = useState("");
  const [selection, setSelection] = useState<EventSelection | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<BatchDashboard | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const addressUrl = useMemo(() => {
    if (!dashboard) return "lycheedata.com";
    const slug =
      normalizeChartEmbedSlug(dashboard.title) ||
      normalizeChartEmbedSlug(dashboard.eventTicker) ||
      "event";
    return `lycheedata.com/${username}/${slug}`;
  }, [dashboard, username]);

  const buildDashboard = useCallback(async (sel: EventSelection) => {
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    const requestId = ++requestIdRef.current;

    setLoading(true);
    setError(null);
    setDashboard(null);
    setModalOpen(false);

    try {
      const { event, markets: topMarkets } = await fetchKalshiLiveEvent({
        eventTicker: sel.eventTicker,
        withNestedMarkets: true,
        signal: ac.signal,
      });

      const nested = Array.isArray(event.markets) ? event.markets : [];
      const rawMarkets = (nested.length ? nested : topMarkets) as Record<
        string,
        unknown
      >[];

      const seriesTicker =
        String(event.series_ticker || "").trim().toUpperCase() ||
        sel.seriesTicker ||
        inferSeriesTickerFromEvent(sel.eventTicker);

      const title =
        String(event.title || event.sub_title || "").trim() || sel.title;

      const ranked = rawMarkets
        .map((row, order) => {
          const marketTicker = String(row.ticker || "").trim().toUpperCase();
          if (!marketTicker) return null;
          const chancePct = impliedChancePctFromMarketRow(row);
          return { row, marketTicker, chancePct, order };
        })
        .filter(Boolean) as Array<{
        row: Record<string, unknown>;
        marketTicker: string;
        chancePct: number | null;
        order: number;
      }>;

      ranked.sort((a, b) => {
        if (a.chancePct == null && b.chancePct == null) return a.order - b.order;
        if (a.chancePct == null) return 1;
        if (b.chancePct == null) return -1;
        if (b.chancePct !== a.chancePct) return b.chancePct - a.chancePct;
        return a.order - b.order;
      });

      const markets: BatchMarketCard[] = ranked.slice(0, MAX_MARKETS).map((m) => {
        const cardTitle = marketTitleFromRow(m.row, m.marketTicker);
        const caption =
          buildMarketCardCaption(
            {
              title: cardTitle,
              noSubTitle: String(m.row.no_sub_title || "").trim(),
              chancePct: m.chancePct,
              volume: Number(m.row.volume_fp) || null,
              volume24h: Number(m.row.volume_24h_fp) || null,
              openInterest: Number(m.row.open_interest_fp) || null,
              status: String(m.row.status || "").trim(),
              closeTime: String(m.row.close_time || "").trim(),
              lastPrice: Number(m.row.last_price_dollars) || null,
            },
            m.chancePct,
          ) || m.marketTicker;

        return {
          marketTicker: m.marketTicker,
          title: cardTitle,
          caption,
          chancePct: m.chancePct,
          candles: buildStaticCandlestickRows({
            marketTicker: m.marketTicker,
            periods: 48,
            periodSeconds: 3600,
            startPrice: m.chancePct != null ? m.chancePct / 100 : null,
          }),
        };
      });

      if (requestId !== requestIdRef.current) return;

      if (!markets.length) {
        setError("This event has no markets to chart.");
        setDashboard(null);
        return;
      }

      setDashboard({
        eventTicker: sel.eventTicker,
        seriesTicker,
        title,
        markets,
      });
      setModalOpen(true);
    } catch (e) {
      if (ac.signal.aborted || (e instanceof DOMException && e.name === "AbortError")) {
        return;
      }
      if (requestId !== requestIdRef.current) return;
      setError(
        e instanceof Error ? e.message : "Failed to load event markets.",
      );
      setDashboard(null);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleTickersChange = useCallback((next: string) => {
    setTickersValue(next);
    const hasSelection = next
      .split(",")
      .some((part) => Boolean(String(part || "").trim()));
    if (!hasSelection) {
      setSelection(null);
      setDashboard(null);
      setError(null);
      setModalOpen(false);
      abortRef.current?.abort();
      setLoading(false);
    }
  }, []);

  const handleSelectionsChange = useCallback(
    (
      selections: Array<{
        ticker?: string;
        title?: string;
        eventTicker?: string;
        seriesTicker?: string;
      }>,
    ) => {
      const s = selections?.[0];
      if (!s) return;

      const eventTicker = String(s.eventTicker || s.ticker || "")
        .trim()
        .toUpperCase();
      if (!eventTicker) return;

      const seriesTicker =
        String(s.seriesTicker || "").trim().toUpperCase() ||
        inferSeriesTickerFromEvent(eventTicker);
      const title = String(s.title || eventTicker).trim() || eventTicker;
      const next = { eventTicker, seriesTicker, title };

      setSelection((prev) => {
        if (
          prev &&
          prev.eventTicker === next.eventTicker &&
          prev.seriesTicker === next.seriesTicker
        ) {
          return prev;
        }
        return next;
      });
      void buildDashboard(next);
    },
    [buildDashboard],
  );

  return (
    <div className={cn("flex w-full flex-col gap-4", className)}>
      <div className="rounded-xl border border-border/70 bg-muted/15 px-4 py-3.5 sm:px-5">
        <p className="text-sm font-medium text-foreground">
          Batch candlestick dashboard
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground text-pretty">
          The ultimate tool to monitor the situation.
          <br />
          Search Kalshi event, then instantly plot all candlesticks for every
          market in that event.
        </p>
      </div>

      <div className="space-y-2">
        <MarketTickerSearch
          value={tickersValue}
          onChange={handleTickersChange}
          onSelectionsChange={handleSelectionsChange}
          maxTickers={1}
          dataSource="live"
          searchScope="events_semantic"
          showCutoffNotes={false}
          required={false}
          placeholder="Search events in natural language — e.g. Fed rate decision"
          className="w-full"
        />
        {selection ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{selection.title}</span>
            <span className="font-mono opacity-80">{selection.eventTicker}</span>
            {selection.seriesTicker ? (
              <span className="font-mono opacity-80">{selection.seriesTicker}</span>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Pick an event to generate a batch candlestick dashboard preview.
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex min-h-[12rem] flex-col items-center justify-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-6 py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Building candlestick dashboard…
          </p>
        </div>
      ) : null}

      {error && !loading ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      {dashboard && !loading ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 bg-muted/15 px-4 py-3">
          <p className="min-w-0 flex-1 text-sm text-muted-foreground text-pretty">
            Ready:{" "}
            <span className="font-medium text-foreground">{dashboard.title}</span>
            {" · "}
            {dashboard.markets.length} market
            {dashboard.markets.length === 1 ? "" : "s"}
          </p>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="shrink-0 gap-1.5"
            onClick={() => setModalOpen(true)}
          >
            <LayoutDashboard className="size-3.5" aria-hidden />
            Open dashboard
          </Button>
        </div>
      ) : null}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent
          className={cn(
            "flex max-h-[92vh] w-[min(100vw-1rem,90rem)] max-w-none flex-col gap-0 overflow-hidden border-0 bg-transparent p-0 shadow-none sm:rounded-xl",
            "[&>button]:right-2 [&>button]:top-2 [&>button]:z-20 [&>button]:rounded-full [&>button]:bg-background/90 [&>button]:p-1.5 [&>button]:opacity-100 [&>button]:shadow-sm",
          )}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>
              {dashboard?.title || "Batch candlestick dashboard"}
            </DialogTitle>
            <DialogDescription>
              Preview dashboard of event market candlesticks.
            </DialogDescription>
          </DialogHeader>

          {dashboard ? (
            <SafariBrowserFrame
              url={addressUrl}
              className="max-h-[92vh]"
              bodyClassName="max-h-[calc(92vh-52px)]"
            >
              <div className="px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                  <div className="min-w-0 space-y-1">
                    <h2 className="text-balance text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                      {dashboard.title}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {dashboard.markets.length} market
                      {dashboard.markets.length === 1 ? "" : "s"}
                      {dashboard.eventTicker
                        ? ` · ${dashboard.eventTicker}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1.5 border-emerald-500/40 bg-emerald-500/10 px-3 text-xs font-medium text-foreground hover:bg-emerald-500/15"
                      onClick={() => {
                        setModalOpen(false);
                        setUpgradeOpen(true);
                      }}
                    >
                      <span
                        className="size-2 shrink-0 animate-pulse rounded-full bg-emerald-500"
                        aria-hidden
                      />
                      Start live feed
                    </Button>
                    <Button type="button" size="sm" className="h-8 px-3 text-xs" asChild>
                      <Link
                        href="/#pricing"
                        onClick={() => setModalOpen(false)}
                      >
                        Get full access now
                      </Link>
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {dashboard.markets.map((market) => {
                    const chance = formatChancePct(market.chancePct);
                    return (
                      <article
                        key={market.marketTicker}
                        className="flex flex-col overflow-hidden rounded-lg border border-border/70 bg-card/40"
                      >
                        <div className="space-y-0.5 border-b border-border/50 px-3 py-2.5">
                          <h3 className="text-sm font-medium leading-snug text-foreground">
                            {market.title}
                            {chance ? (
                              <span className="font-normal text-muted-foreground">
                                {" "}
                                — {chance}
                              </span>
                            ) : null}
                          </h3>
                          {market.caption ? (
                            <p className="text-[11px] leading-snug text-muted-foreground">
                              {market.caption}
                            </p>
                          ) : null}
                        </div>
                        <HubKalshiLiveDemoCandlesticksProfessionalChart
                          candles={market.candles}
                          chartClassName="min-h-[14rem] border-0 rounded-none"
                          className="min-h-[14rem]"
                        />
                      </article>
                    );
                  })}
                </div>
              </div>
            </SafariBrowserFrame>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Unlock live feeds</DialogTitle>
            <DialogDescription>
              Upgrade to stream live candlesticks, build custom dashboards, run
              unlimited queries, and get full Kalshi market access—everything in
              this preview, kept live.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setUpgradeOpen(false)}
            >
              Close
            </Button>
            <Button type="button" asChild>
              <Link
                href="/#pricing"
                onClick={() => setUpgradeOpen(false)}
              >
                View pricing
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
