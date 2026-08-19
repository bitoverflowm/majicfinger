"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, RefreshCw, X } from "lucide-react";

import { PolymarketLiveSearch } from "@/components/connectData/polymarketLive/PolymarketLiveSearch";
import { HubInPageLink } from "@/components/hubs/HubCtaButton";
import { HubPolymarketLiveDemoMetadataView } from "@/components/hubs/polymarketLiveDemo/HubPolymarketLiveDemoMetadataView";
import {
  featuredPolymarketMarketToDemoMarket,
  POLYMARKET_LIVE_DEMO_MAX_MARKETS,
  useHubPolymarketLiveDemo,
  type HubPolymarketLiveDemoMarket,
} from "@/components/hubs/polymarketLiveDemo/HubPolymarketLiveDemoSelection";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatPolymarketVolume } from "@/lib/polymarketLive/polymarketPublicSearch";
import {
  polymarketRealtimeMarketFromSuggestion,
  polymarketRealtimeMarketKey,
  polymarketRealtimeMarketsFromEventSuggestion,
} from "@/lib/polymarketLive/polymarketRealtimeCompose";
import { cn } from "@/lib/utils";

const FEATURED_LIMIT = 5;
const PRICING_HREF = "#polymarket-live-pricing";
const SIGN_UP_LINK_LABEL =
  "sign up to use the full power of Lychee, compare Polymarket, Kalshi, Historical and Live all in one place";

type FeaturedCard = {
  id: string;
  slug?: string;
  conditionId: string;
  title: string;
  volume24h: number | null;
  featured?: boolean;
  imageUrl?: string;
  tags?: string[];
  eventTitle?: string;
  outcomes: { tokenId: string; outcome: string; lastPrice: number | null }[];
};

type EventPicker = {
  title: string;
  markets: HubPolymarketLiveDemoMarket[];
};

function marketLabel(market: HubPolymarketLiveDemoMarket) {
  return String(market.title || market.slug || market.id || "Market");
}

function featuredKey(market: FeaturedCard) {
  return String(market.conditionId || market.id || market.slug || "").trim();
}

function formatLastPrice(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${Math.round(value * 100)}¢`;
}

function shufflePick<T>(items: T[], count: number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const current = copy[i]!;
    copy[i] = copy[j]!;
    copy[j] = current;
  }
  return copy.slice(0, count);
}

function normalizeFeaturedCard(raw: unknown): FeaturedCard | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const outcomesRaw = Array.isArray(row.outcomes) ? row.outcomes : [];
  const outcomes = outcomesRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const outcome = item as Record<string, unknown>;
      const tokenId = String(outcome.tokenId || "").trim();
      if (!tokenId) return null;
      return {
        tokenId,
        outcome: String(outcome.outcome || "").trim() || "Outcome",
        lastPrice:
          outcome.lastPrice != null && Number.isFinite(Number(outcome.lastPrice))
            ? Number(outcome.lastPrice)
            : null,
      };
    })
    .filter(Boolean) as FeaturedCard["outcomes"];
  const id = String(row.id || row.conditionId || row.slug || "").trim();
  const title = String(row.title || "").trim() || id;
  if (!id || !title || outcomes.length < 1) return null;
  return {
    id,
    slug: String(row.slug || "").trim() || undefined,
    conditionId: String(row.conditionId || id).trim(),
    title,
    volume24h:
      row.volume24h != null && Number.isFinite(Number(row.volume24h))
        ? Number(row.volume24h)
        : null,
    featured: row.featured === true,
    imageUrl: String(row.imageUrl || "").trim() || undefined,
    tags: Array.isArray(row.tags)
      ? row.tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 4)
      : [],
    eventTitle: String(row.eventTitle || "").trim() || undefined,
    outcomes,
  };
}

export function HubPolymarketLiveSearchDemo({
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
  const addMarkets = selection?.addMarkets ?? (() => undefined);
  const setMarkets = selection?.setMarkets ?? (() => undefined);
  const selectMarket = selection?.selectMarket ?? (() => undefined);

  const [eventPicker, setEventPicker] = useState<EventPicker | null>(null);
  const [eventMarketKeys, setEventMarketKeys] = useState<Set<string>>(() => new Set());
  const [error, setError] = useState("");
  const [featured, setFeatured] = useState<FeaturedCard[]>([]);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredRefreshing, setFeaturedRefreshing] = useState(false);
  const [featuredError, setFeaturedError] = useState<string | null>(null);

  const remainingSlots = Math.max(0, POLYMARKET_LIVE_DEMO_MAX_MARKETS - markets.length);
  const eventCheckCap = POLYMARKET_LIVE_DEMO_MAX_MARKETS;

  const loadFeatured = useCallback(async (opts?: { excludeIds?: string[] }) => {
    const exclude = opts?.excludeIds || [];
    const refreshing = exclude.length > 0;
    if (refreshing) setFeaturedRefreshing(true);
    else setFeaturedLoading(true);
    setFeaturedError(null);
    try {
      const params = new URLSearchParams({ limit: "8" });
      if (exclude.length) params.set("exclude", exclude.join(","));
      const res = await fetch(
        `/api/integrations/polymarket-live/markets/featured?${params.toString()}`,
        { credentials: "same-origin", headers: { Accept: "application/json" } },
      );
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof body?.error === "string" ? body.error : "Failed to load featured markets",
        );
      }
      const parsed = (Array.isArray(body?.markets) ? body.markets : [])
        .map(normalizeFeaturedCard)
        .filter(Boolean) as FeaturedCard[];
      setFeatured(shufflePick(parsed, FEATURED_LIMIT));
    } catch (e) {
      setFeatured([]);
      setFeaturedError(e instanceof Error ? e.message : "Failed to load featured markets");
    } finally {
      setFeaturedLoading(false);
      setFeaturedRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadFeatured();
  }, [loadFeatured]);

  const handleSearchSelection = useCallback(
    (suggestion: Record<string, unknown>) => {
      setError("");
      const entity = String(suggestion?.entity || "");
      if (entity === "event") {
        const nested = polymarketRealtimeMarketsFromEventSuggestion(suggestion);
        if (!nested.length) {
          setError("That event does not include any streamable markets with outcome token IDs.");
          return;
        }
        setEventPicker({
          title: String(suggestion.title || "Select event markets"),
          markets: nested as HubPolymarketLiveDemoMarket[],
        });
        setEventMarketKeys(new Set());
        return;
      }
      if (entity !== "market") {
        setError("Pick a market or event to load this demo.");
        return;
      }
      if (remainingSlots <= 0) {
        setError(`Demo mode lets you follow ${POLYMARKET_LIVE_DEMO_MAX_MARKETS} markets at a time.`);
        return;
      }
      const market = polymarketRealtimeMarketFromSuggestion(suggestion);
      if (!market) {
        setError("That market does not expose streamable outcome token IDs.");
        return;
      }
      addMarkets([market as HubPolymarketLiveDemoMarket]);
    },
    [addMarkets, remainingSlots],
  );

  const handleSearchAll = useCallback(
    (suggestions: Array<Record<string, unknown>>) => {
      const direct: HubPolymarketLiveDemoMarket[] = [];
      for (const suggestion of suggestions || []) {
        if (suggestion?.entity !== "market") continue;
        const market = polymarketRealtimeMarketFromSuggestion(suggestion);
        if (market) direct.push(market as HubPolymarketLiveDemoMarket);
      }
      addMarkets(direct);
    },
    [addMarkets],
  );

  const toggleEventMarket = useCallback((key: string, checked: boolean) => {
    setEventMarketKeys((current) => {
      const next = new Set(current);
      if (checked) {
        if (next.size >= eventCheckCap) return current;
        next.add(key);
      } else {
        next.delete(key);
      }
      return next;
    });
  }, [eventCheckCap]);

  const selectFeatured = useCallback(
    (card: FeaturedCard) => {
      const market = featuredPolymarketMarketToDemoMarket(card);
      if (!market) {
        setError("That featured market does not expose streamable outcome token IDs.");
        return;
      }
      setError("");
      selectMarket(market);
    },
    [selectMarket],
  );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
      <div className="shrink-0 space-y-1">
        {heading ? (
          <h3 className="text-lg font-semibold tracking-tight text-foreground">
            {heading}
          </h3>
        ) : null}
        {helper ? (
          <p className="text-pretty text-sm leading-relaxed text-muted-foreground">
            {helper}
          </p>
        ) : null}
      </div>

      <div className="shrink-0">
        <PolymarketLiveSearch
          layout="panel"
          collectMode
          dismissAfterSelect
          searchTags
          searchProfiles
          keepClosedMarkets={false}
          limitPerType={50}
          resultsClassName="max-h-64 flex-none"
          placeholder={
            placeholder || "Search live Polymarket markets, events, and tags…"
          }
          selectedItems={markets}
          onSelect={handleSearchSelection}
          onSubmitAll={handleSearchAll}
        />
      </div>

      {markets.length ? (
        <div className="flex shrink-0 flex-wrap gap-1.5">
          {markets.map((market) => {
            const key = polymarketRealtimeMarketKey(market);
            return (
              <span
                key={key}
                className="inline-flex max-w-full items-center gap-1 rounded-full border border-border/70 bg-muted/40 py-0.5 pl-2.5 pr-1 text-xs text-foreground"
              >
                <span className="truncate">{marketLabel(market)}</span>
                <button
                  type="button"
                  className="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label={`Remove ${marketLabel(market)}`}
                  onClick={() =>
                    setMarkets(
                      markets.filter((item) => polymarketRealtimeMarketKey(item) !== key),
                    )
                  }
                >
                  <X className="size-3" aria-hidden />
                </button>
              </span>
            );
          })}
        </div>
      ) : null}

      {markets.length ? (
        <HubPolymarketLiveDemoMetadataView />
      ) : (
        <div className="space-y-2">
          <p className="text-sm leading-relaxed text-muted-foreground text-pretty">
            You can also just check some of the following featured markets
          </p>
          <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/20">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground">
              Featured live markets
            </p>
            {featuredLoading ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Loading…
              </span>
            ) : featured.length ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>
                  {featured.length} market{featured.length === 1 ? "" : "s"}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    void loadFeatured({ excludeIds: featured.map((item) => featuredKey(item)) })
                  }
                  disabled={featuredLoading || featuredRefreshing}
                  className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                  aria-label="Show different featured live markets"
                  title="Show different featured live markets"
                >
                  <RefreshCw
                    className={cn("size-3.5", featuredRefreshing && "animate-spin")}
                    aria-hidden
                  />
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => void loadFeatured()}
                disabled={featuredLoading}
                className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
                aria-label="Refresh featured live markets"
              >
                <RefreshCw className="size-3.5" aria-hidden />
              </button>
            )}
          </div>

          {featuredLoading ? (
            <div className="space-y-2 p-3" aria-hidden>
              {Array.from({ length: FEATURED_LIMIT }).map((_, index) => (
                <div
                  key={index}
                  className="flex animate-pulse gap-3 rounded-xl border border-border/60 bg-background/80 p-3"
                >
                  <div className="size-12 shrink-0 rounded-lg bg-muted" />
                  <div className="min-w-0 flex-1 space-y-2 py-0.5">
                    <div className="h-3.5 w-3/4 rounded bg-muted" />
                    <div className="h-3 w-1/2 rounded bg-muted" />
                    <div className="h-3 w-2/5 rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredError ? (
            <p className="px-3 py-4 text-sm text-destructive">{featuredError}</p>
          ) : !featured.length ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              No featured markets available right now. Try searching above.
            </p>
          ) : (
            <ul className="space-y-2 p-3">
              {featured.map((market) => {
                const yes = market.outcomes[0];
                const selected = markets.some(
                  (item) => polymarketRealtimeMarketKey(item) === featuredKey(market),
                );
                return (
                  <li key={featuredKey(market)}>
                    <button
                      type="button"
                      onClick={() => selectFeatured(market)}
                      className={cn(
                        "flex w-full items-start gap-3 rounded-xl border bg-background p-3 text-left shadow-sm transition-colors hover:border-border hover:bg-muted/30",
                        selected ? "border-secondary/40 bg-secondary/5" : "border-border/70",
                      )}
                    >
                      <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-black">
                        {market.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={market.imageUrl}
                            alt=""
                            className="size-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex size-full items-center justify-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                            PM
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium leading-snug text-foreground text-pretty">
                            {market.title}
                          </p>
                          <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-medium text-muted-foreground">
                            <span className="size-2 animate-pulse rounded-full bg-green-500" aria-hidden />
                            Live
                          </span>
                        </div>
                        {market.eventTitle ? (
                          <p className="truncate text-[11px] text-muted-foreground">
                            {market.eventTitle}
                          </p>
                        ) : null}
                        {market.tags?.length ? (
                          <div className="flex flex-wrap gap-1">
                            {market.featured ? (
                              <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[0.65rem] font-medium text-amber-900 ring-1 ring-amber-600/25 dark:text-amber-100">
                                Featured
                              </span>
                            ) : null}
                            {market.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded bg-muted/80 px-1.5 py-0.5 text-[0.65rem] font-medium text-muted-foreground ring-1 ring-border/50"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                          <span>
                            {yes?.outcome || "Yes"}{" "}
                            <span className="font-medium text-foreground">
                              {formatLastPrice(yes?.lastPrice)}
                            </span>
                          </span>
                          <span>
                            24h vol{" "}
                            <span className="font-medium text-foreground">
                              {formatPolymarketVolume(market.volume24h) || "—"}
                            </span>
                          </span>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          </div>
        </div>
      )}

      {error ? <p className="shrink-0 text-xs text-destructive">{error}</p> : null}

      <Dialog
        open={!!eventPicker}
        onOpenChange={(open) => {
          if (!open) setEventPicker(null);
        }}
      >
        <DialogContent className="flex max-h-[85vh] flex-col gap-3 overflow-hidden sm:max-w-xl">
          <DialogHeader className="shrink-0">
            <DialogTitle>{eventPicker?.title || "Select event markets"}</DialogTitle>
            <DialogDescription className="text-left">
              This is an Event so there are multiple markets. Since this is demo
              mode we only let you check 2 markets at a time.
            </DialogDescription>
            <HubInPageLink
              href={PRICING_HREF}
              className="text-left text-sm font-medium text-foreground underline underline-offset-4 hover:text-primary"
              onClick={() => setEventPicker(null)}
            >
              {SIGN_UP_LINK_LABEL}
            </HubInPageLink>
          </DialogHeader>
          <div className="flex shrink-0 items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground">
              {eventMarketKeys.size} of {POLYMARKET_LIVE_DEMO_MAX_MARKETS} selected
            </span>
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
            {(eventPicker?.markets || []).map((market) => {
              const key = polymarketRealtimeMarketKey(market);
              const checked = eventMarketKeys.has(key);
              const atCap = !checked && eventMarketKeys.size >= eventCheckCap;
              return (
                <label
                  key={key}
                  className={cn(
                    "flex items-start gap-2 rounded-lg border p-2.5",
                    atCap ? "cursor-not-allowed opacity-55" : "cursor-pointer",
                    checked ? "border-secondary/35 bg-secondary/10" : "border-border/60",
                  )}
                >
                  <Checkbox
                    className="mt-0.5"
                    checked={checked}
                    disabled={atCap}
                    onCheckedChange={(next) => toggleEventMarket(key, next === true)}
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-medium text-foreground">
                      {marketLabel(market)}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-muted-foreground">
                      {(market.outcomes || []).join(" · ")}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
          <DialogFooter className="shrink-0 items-center border-t border-border/60 pt-3 sm:justify-between">
            <p className="text-[11px] text-muted-foreground">
              {eventMarketKeys.size
                ? `${eventMarketKeys.size} market${eventMarketKeys.size === 1 ? "" : "s"} ready to add`
                : "Pick at least one market to continue."}
            </p>
            <Button
              type="button"
              className="gap-1.5"
              disabled={!eventMarketKeys.size}
              onClick={() => {
                const selected = (eventPicker?.markets || []).filter((market) =>
                  eventMarketKeys.has(polymarketRealtimeMarketKey(market)),
                );
                addMarkets(selected);
                setEventPicker(null);
              }}
            >
              <Check className="size-3.5" aria-hidden />
              Add selected markets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
