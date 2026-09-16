"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import { PolymarketLiveSearch } from "@/components/connectData/polymarketLive/PolymarketLiveSearch";
import {
  featuredPolymarketMarketToDemoMarket,
  type HubPolymarketLiveDemoMarket,
} from "@/components/hubs/polymarketLiveDemo/HubPolymarketLiveDemoSelection";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPolymarketVolume } from "@/lib/polymarketLive/polymarketPublicSearch";
import { findKalshiLiveMatchesForPolymarket } from "@/lib/predictionMarkets/matchPolymarketToKalshiLive";
import { findPolymarketLiveMatchesForKalshi } from "@/lib/predictionMarkets/matchKalshiToPolymarketLive";
import {
  polymarketRealtimeMarketFromSuggestion,
  polymarketRealtimeMarketKey,
  polymarketRealtimeMarketsFromEventSuggestion,
} from "@/lib/polymarketLive/polymarketRealtimeCompose";
import { cn } from "@/lib/utils";

import { KALSHI_GREEN, POLYMARKET_BLUE, type DashboardPair } from "./types";

type FeaturedPoly = {
  id: string;
  slug?: string;
  conditionId: string;
  title: string;
  volume24h: number | null;
  imageUrl?: string;
  featured?: boolean;
  outcomes: { tokenId: string; outcome: string; lastPrice: number | null }[];
};

type FeaturedKalshi = {
  ticker: string;
  title: string;
  lastPriceDollars: number | null;
  volume24h: number | null;
  imageUrl?: string;
};

function formatCents(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value * 100)}¢`;
}

function formatKalshiVol(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function DashboardGate({
  pair,
  onKeep,
  onNewSearch,
}: {
  pair: DashboardPair;
  onKeep: () => void;
  onNewSearch: () => void;
}) {
  const [choice, setChoice] = useState<"keep" | "new">("keep");
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-10 text-center">
      <div className="space-y-2">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-secondary">
          Live dashboard
        </p>
        <h2 className="text-balance text-2xl font-semibold tracking-tight text-foreground">
          Use the markets you already have open?
        </h2>
        <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
          You’re already comparing these contracts. Open them as a live workspace, or start a
          fresh search.
        </p>
      </div>
      <div className="grid w-full gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setChoice("keep")}
          className={cn(
            "rounded-2xl border p-4 text-left transition-colors",
            choice === "keep"
              ? "border-secondary/40 bg-secondary/10"
              : "border-border/70 bg-background hover:bg-muted/40",
          )}
        >
          <p className="text-sm font-medium text-foreground">Keep this comparison</p>
          <p className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
            {pair.kalshiTitle}
          </p>
          <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-muted-foreground">
            {pair.polyTitle}
          </p>
        </button>
        <button
          type="button"
          onClick={() => setChoice("new")}
          className={cn(
            "rounded-2xl border p-4 text-left transition-colors",
            choice === "new"
              ? "border-secondary/40 bg-secondary/10"
              : "border-border/70 bg-background hover:bg-muted/40",
          )}
        >
          <p className="text-sm font-medium text-foreground">Make a new search</p>
          <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
            Pick another Kalshi or Polymarket market and we’ll match the other venue.
          </p>
        </button>
      </div>
      <Button
        type="button"
        className="h-10 rounded-full px-6"
        onClick={() => (choice === "keep" ? onKeep() : onNewSearch())}
      >
        Continue
      </Button>
    </div>
  );
}

export function DashboardSearch({
  onReady,
}: {
  onReady: (pair: DashboardPair) => void;
}) {
  const [error, setError] = useState("");
  const [matching, setMatching] = useState(false);
  const [polyFeatured, setPolyFeatured] = useState<FeaturedPoly[]>([]);
  const [kalshiFeatured, setKalshiFeatured] = useState<FeaturedKalshi[]>([]);
  const [polyLoading, setPolyLoading] = useState(true);
  const [kalshiLoading, setKalshiLoading] = useState(true);
  const [eventMarkets, setEventMarkets] = useState<HubPolymarketLiveDemoMarket[] | null>(null);
  const [kalshiChoices, setKalshiChoices] = useState<
    { ticker: string; title: string; score: number }[] | null
  >(null);
  const [pendingPoly, setPendingPoly] = useState<HubPolymarketLiveDemoMarket | null>(null);

  const loadPoly = useCallback(async () => {
    setPolyLoading(true);
    try {
      const res = await fetch("/api/integrations/polymarket-live/markets/featured?limit=12", {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const body = await res.json().catch(() => ({}));
      const parsed = (Array.isArray(body?.markets) ? body.markets : [])
        .map((row: Record<string, unknown>) => {
          const outcomes = Array.isArray(row.outcomes)
            ? row.outcomes
                .map((item) => {
                  if (!item || typeof item !== "object") return null;
                  const tokenId = String((item as { tokenId?: string }).tokenId || "").trim();
                  if (!tokenId) return null;
                  return {
                    tokenId,
                    outcome: String((item as { outcome?: string }).outcome || "Yes"),
                    lastPrice:
                      (item as { lastPrice?: number }).lastPrice != null
                        ? Number((item as { lastPrice?: number }).lastPrice)
                        : null,
                  };
                })
                .filter(Boolean)
            : [];
          const id = String(row.id || row.conditionId || row.slug || "").trim();
          const title = String(row.title || "").trim() || id;
          if (!id || !title || !outcomes.length) return null;
          return {
            id,
            slug: String(row.slug || "") || undefined,
            conditionId: String(row.conditionId || id),
            title,
            volume24h: Number.isFinite(Number(row.volume24h)) ? Number(row.volume24h) : null,
            imageUrl: String(row.imageUrl || "") || undefined,
            featured: row.featured === true,
            outcomes,
          } satisfies FeaturedPoly;
        })
        .filter(Boolean) as FeaturedPoly[];
      setPolyFeatured(parsed.slice(0, 6));
    } catch {
      setPolyFeatured([]);
    } finally {
      setPolyLoading(false);
    }
  }, []);

  const loadKalshi = useCallback(async () => {
    setKalshiLoading(true);
    try {
      const res = await fetch(
        "/api/integrations/kalshi-live/markets/featured?limit=6&source=discovery&v=3",
        { credentials: "same-origin", headers: { Accept: "application/json" } },
      );
      const body = await res.json().catch(() => ({}));
      const parsed = (Array.isArray(body?.markets) ? body.markets : [])
        .map((row: Record<string, unknown>) => {
          const ticker = String(row.ticker || "").trim().toUpperCase();
          const title = String(row.title || row.subtitle || ticker).trim();
          if (!ticker || !title) return null;
          return {
            ticker,
            title,
            lastPriceDollars: Number.isFinite(Number(row.lastPriceDollars))
              ? Number(row.lastPriceDollars)
              : null,
            volume24h: Number.isFinite(Number(row.volume24h)) ? Number(row.volume24h) : null,
            imageUrl: String(row.imageUrl || "") || undefined,
          } satisfies FeaturedKalshi;
        })
        .filter(Boolean) as FeaturedKalshi[];
      setKalshiFeatured(parsed.slice(0, 6));
    } catch {
      setKalshiFeatured([]);
    } finally {
      setKalshiLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPoly();
    void loadKalshi();
  }, [loadKalshi, loadPoly]);

  const finishPoly = useCallback(
    async (market: HubPolymarketLiveDemoMarket) => {
      setMatching(true);
      setError("");
      try {
        const result = await findKalshiLiveMatchesForPolymarket(market);
        const listed = result.candidates.filter((row) => row.market.marketTicker);
        if (result.preselected?.market.marketTicker) {
          onReady({
            kalshiTicker: result.preselected.market.marketTicker,
            kalshiTitle: result.preselected.market.title,
            polyMarket: market,
            polyTitle: String(market.title || market.slug || "Polymarket"),
            childSide: "yes",
            matchFromKalshi: false,
          });
          return;
        }
        if (listed.length) {
          setPendingPoly(market);
          setKalshiChoices(
            listed.slice(0, 4).map((row) => ({
              ticker: row.market.marketTicker,
              title: row.market.title,
              score: row.score,
            })),
          );
          return;
        }
        setPendingPoly(market);
        setError("No automatic Kalshi match. Pick a Kalshi market on the right to pair it.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Match search failed");
      } finally {
        setMatching(false);
      }
    },
    [onReady],
  );

  const finishKalshi = useCallback(
    async (ticker: string, title: string) => {
      if (pendingPoly) {
        onReady({
          kalshiTicker: ticker,
          kalshiTitle: title,
          polyMarket: pendingPoly,
          polyTitle: String(pendingPoly.title || pendingPoly.slug || "Polymarket"),
          childSide: "yes",
          matchFromKalshi: false,
        });
        return;
      }
      setMatching(true);
      setError("");
      try {
        const result = await findPolymarketLiveMatchesForKalshi({ ticker, title });
        const pick = result.preselected?.market || result.candidates[0]?.market;
        if (!pick || typeof pick !== "object") {
          setError(result.emptyMessage || "No Polymarket match yet. Try another market.");
          return;
        }
        const asRecord = pick as Record<string, unknown>;
        const demo =
          featuredPolymarketMarketToDemoMarket(asRecord) ||
          (Array.isArray(asRecord.tokenIds) && asRecord.tokenIds.length
            ? (asRecord as HubPolymarketLiveDemoMarket)
            : null);
        if (!demo) {
          setError(result.emptyMessage || "No Polymarket match yet. Try another market.");
          return;
        }
        onReady({
          kalshiTicker: ticker,
          kalshiTitle: title,
          polyMarket: demo,
          polyTitle: String(demo.title || demo.slug || "Polymarket"),
          childSide: "yes",
          matchFromKalshi: true,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Match search failed");
      } finally {
        setMatching(false);
      }
    },
    [onReady, pendingPoly],
  );

  const handleSearchSelection = useCallback(
    (suggestion: Record<string, unknown>) => {
      setError("");
      const entity = String(suggestion?.entity || "");
      if (entity === "event") {
        const nested = polymarketRealtimeMarketsFromEventSuggestion(
          suggestion,
        ) as HubPolymarketLiveDemoMarket[];
        if (!nested.length) {
          setError("That event has no streamable markets.");
          return;
        }
        if (nested.length === 1) {
          void finishPoly(nested[0]!);
          return;
        }
        setEventMarkets(nested);
        return;
      }
      const market = polymarketRealtimeMarketFromSuggestion(suggestion) as HubPolymarketLiveDemoMarket | null;
      if (!market) {
        setError("Pick a market with outcome tokens.");
        return;
      }
      void finishPoly(market);
    },
    [finishPoly],
  );

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 px-4 py-8">
      <div className="space-y-2 text-center">
        <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-secondary">
          Build a live dashboard
        </p>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Search a market, then we’ll assemble the rest
        </h2>
        <p className="text-pretty text-sm text-muted-foreground">
          Same Kalshi vs Polymarket flow. Choose a contract and we’ll match the other venue, then
          stream the full live view.
        </p>
      </div>

      <PolymarketLiveSearch
        layout="panel"
        dismissAfterSelect
        searchTags
        searchProfiles={false}
        keepClosedMarkets={false}
        limitPerType={50}
        className="mx-auto w-full max-w-2xl"
        resultsClassName="max-h-56 flex-none"
        placeholder="Search Polymarket by name or ticker…"
        onSelect={handleSearchSelection}
        onSubmitAll={(suggestions) => {
          const first =
            suggestions.find((row) => row?.entity === "market") ||
            suggestions.find((row) => row?.entity === "event");
          if (first) handleSearchSelection(first);
        }}
      />

      <div className="grid gap-3 md:grid-cols-2">
        <FeaturedCol
          label="Polymarket"
          loading={polyLoading}
          onRefresh={() => void loadPoly()}
          accent={POLYMARKET_BLUE}
        >
          {polyFeatured.map((market) => (
            <button
              key={market.id}
              type="button"
              disabled={matching}
              onClick={() => {
                const demo = featuredPolymarketMarketToDemoMarket(market);
                if (demo) void finishPoly(demo);
              }}
              className={cn(
                "w-full rounded-lg border bg-background px-3 py-2 text-left hover:bg-muted/40",
                pendingPoly && String(pendingPoly.conditionId || pendingPoly.id) === market.conditionId
                  ? "border-[#2E5CFF]/50 bg-[#2E5CFF]/10"
                  : "border-border/60",
              )}
            >
              <p className="line-clamp-2 text-[13px] font-medium text-foreground">{market.title}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {formatCents(market.outcomes[0]?.lastPrice)} · {formatPolymarketVolume(market.volume24h) || "—"}
              </p>
            </button>
          ))}
        </FeaturedCol>
        <FeaturedCol
          label="Kalshi"
          loading={kalshiLoading}
          onRefresh={() => void loadKalshi()}
          accent={KALSHI_GREEN}
        >
          {kalshiFeatured.map((market) => (
            <button
              key={market.ticker}
              type="button"
              disabled={matching}
              onClick={() => void finishKalshi(market.ticker, market.title)}
              className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-left hover:bg-muted/40"
            >
              <p className="line-clamp-2 text-[13px] font-medium text-foreground">{market.title}</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {formatCents(market.lastPriceDollars)} · {formatKalshiVol(market.volume24h)}
              </p>
            </button>
          ))}
        </FeaturedCol>
      </div>

      {matching ? (
        <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" />
          Matching the other venue…
        </p>
      ) : null}
      {error ? <p className="text-center text-sm text-destructive">{error}</p> : null}

      <Dialog open={Boolean(eventMarkets)} onOpenChange={(open) => !open && setEventMarkets(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Which market?</DialogTitle>
            <DialogDescription>This event has several contracts. Pick one to compare.</DialogDescription>
          </DialogHeader>
          <ul className="max-h-64 space-y-1.5 overflow-y-auto">
            {(eventMarkets || []).map((market) => (
              <li key={polymarketRealtimeMarketKey(market)}>
                <button
                  type="button"
                  className="w-full rounded-lg border border-border/60 px-3 py-2 text-left text-sm hover:bg-muted/40"
                  onClick={() => {
                    setEventMarkets(null);
                    void finishPoly(market);
                  }}
                >
                  {String(market.title || market.slug)}
                </button>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(kalshiChoices)} onOpenChange={(open) => !open && setKalshiChoices(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Pick the Kalshi match</DialogTitle>
            <DialogDescription>Several contracts look close. Choose the one you want on the dashboard.</DialogDescription>
          </DialogHeader>
          <ul className="max-h-64 space-y-1.5 overflow-y-auto">
            {(kalshiChoices || []).map((row) => (
              <li key={row.ticker}>
                <button
                  type="button"
                  className="w-full rounded-lg border border-border/60 px-3 py-2 text-left text-sm hover:bg-muted/40"
                  onClick={() => {
                    if (!pendingPoly) return;
                    setKalshiChoices(null);
                    onReady({
                      kalshiTicker: row.ticker,
                      kalshiTitle: row.title,
                      polyMarket: pendingPoly,
                      polyTitle: String(pendingPoly.title || pendingPoly.slug || "Polymarket"),
                      childSide: "yes",
                      matchFromKalshi: false,
                    });
                  }}
                >
                  <span className="font-medium">{row.title}</span>
                  <span className="ml-2 text-[11px] text-muted-foreground">{row.ticker}</span>
                </button>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setKalshiChoices(null)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FeaturedCol({
  label,
  loading,
  onRefresh,
  accent,
  children,
}: {
  label: string;
  loading: boolean;
  onRefresh: () => void;
  accent: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/10">
      <div className="flex items-center justify-between border-b border-border/50 px-3 py-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: accent }}>
          {label}
        </p>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-md p-1 text-muted-foreground hover:text-foreground"
          aria-label={`Refresh ${label}`}
        >
          <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
        </button>
      </div>
      <div className="space-y-1.5 p-2">
        {loading ? (
          <div className="space-y-1.5">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/60" />
            ))}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
