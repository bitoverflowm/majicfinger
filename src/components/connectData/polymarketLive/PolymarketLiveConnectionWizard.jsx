"use client";

import { useCallback, useMemo, useState } from "react";
import { ArrowLeft, Check, Radio, Trash2 } from "lucide-react";

import { PolymarketLiveSearch } from "@/components/connectData/polymarketLive/PolymarketLiveSearch";
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
import {
  buildPolymarketRealtimeConnection,
  mergePolymarketRealtimeMarkets,
  POLYMARKET_REALTIME_FEED_OPTIONS,
  polymarketRealtimeMarketFromSuggestion,
  polymarketRealtimeMarketKey,
  polymarketRealtimeMarketsFromEventSuggestion,
} from "@/lib/polymarketLive/polymarketRealtimeCompose";
import { POLYMARKET_CANDLE_INTERVALS } from "@/lib/polymarketLive/polymarketCandlesticks";
import { cn } from "@/lib/utils";

export function PolymarketLiveConnectionWizard({
  initialMarkets = [],
  initialDashboardLayout = "one_page",
  initialCandleInterval = "5m",
  onBack,
  onConnect,
  connecting = false,
}) {
  const [markets, setMarkets] = useState(initialMarkets);
  const [feedTypes, setFeedTypes] = useState(["last_trade_price"]);
  const [candleInterval, setCandleInterval] = useState(initialCandleInterval);
  const [dashboardLayout, setDashboardLayout] = useState(initialDashboardLayout);
  const [eventPicker, setEventPicker] = useState(null);
  const [eventMarketKeys, setEventMarketKeys] = useState(new Set());
  const [error, setError] = useState("");

  const selectedOutcomeCount = useMemo(
    () => markets.reduce((sum, market) => sum + (market.selectedTokenIds?.length || 0), 0),
    [markets],
  );

  const handleSearchSelection = useCallback((suggestion) => {
    setError("");
    if (suggestion.entity === "event") {
      const nested = polymarketRealtimeMarketsFromEventSuggestion(suggestion);
      if (!nested.length) {
        setError("That event does not include any streamable markets with outcome token IDs.");
        return;
      }
      setEventPicker({ title: suggestion.title || "Select event markets", markets: nested });
      setEventMarketKeys(new Set());
      return;
    }
    const market = polymarketRealtimeMarketFromSuggestion(suggestion);
    if (!market) {
      setError("That market does not expose streamable outcome token IDs.");
      return;
    }
    setMarkets((current) => mergePolymarketRealtimeMarkets(current, [market]));
  }, []);

  const handleSearchAll = useCallback((suggestions) => {
    const directMarkets = [];
    for (const suggestion of suggestions || []) {
      if (suggestion?.entity !== "market") continue;
      const market = polymarketRealtimeMarketFromSuggestion(suggestion);
      if (market) directMarkets.push(market);
    }
    if (directMarkets.length) {
      setMarkets((current) => mergePolymarketRealtimeMarkets(current, directMarkets));
    }
  }, []);

  const patchMarketTokens = useCallback((key, tokenId, checked) => {
    setMarkets((current) =>
      current.map((market) => {
        if (polymarketRealtimeMarketKey(market) !== key) return market;
        const selected = new Set(market.selectedTokenIds || []);
        if (checked) selected.add(tokenId);
        else selected.delete(tokenId);
        return { ...market, selectedTokenIds: [...selected] };
      }),
    );
  }, []);

  const connect = useCallback(() => {
    setError("");
    try {
      onConnect(
        buildPolymarketRealtimeConnection({
          markets,
          feedTypes,
          dashboardLayout,
          candleInterval,
        }),
      );
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Check your selections.");
    }
  }, [candleInterval, dashboardLayout, feedTypes, markets, onConnect]);

  return (
    <div className="space-y-5 rounded-xl border border-border/70 bg-background p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-secondary/15 text-secondary">
              <Radio className="size-4" aria-hidden />
            </span>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wide text-secondary">
                New live connection
              </p>
              <h2 className="text-base font-semibold text-foreground">
                Build your real-time Polymarket stream
              </h2>
            </div>
          </div>
          <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
            Find markets directly or open an event and choose its markets. Then select outcomes and
            the live updates you want to follow.
          </p>
        </div>
        <Button type="button" variant="ghost" size="sm" className="gap-1 text-xs" onClick={onBack}>
          <ArrowLeft className="size-3.5" aria-hidden />
          Back
        </Button>
      </div>

      <section className="space-y-2">
        <div>
          <h3 className="text-xs font-semibold text-foreground">1. Add markets or events</h3>
          <p className="text-[11px] text-muted-foreground">
            You can add multiple results. Event results let you pick all or only some markets.
          </p>
        </div>
        <PolymarketLiveSearch
          collectMode
          dismissAfterSelect
          entities={["market", "event"]}
          searchProfiles={false}
          searchTags={false}
          keepClosedMarkets={false}
          placeholder="Search live Polymarket markets and events…"
          selectedItems={markets}
          onSelect={handleSearchSelection}
          onSubmitAll={handleSearchAll}
          disabled={connecting}
        />
      </section>

      {markets.length ? (
        <section className="space-y-2">
          <div className="flex items-end justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold text-foreground">2. Select outcomes</h3>
              <p className="text-[11px] text-muted-foreground">
                Each outcome maps to the token ID used by the WebSocket subscription.
              </p>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {selectedOutcomeCount} outcome{selectedOutcomeCount === 1 ? "" : "s"} selected
            </span>
          </div>
          <div className="grid gap-2 lg:grid-cols-2">
            {markets.map((market) => {
              const key = polymarketRealtimeMarketKey(market);
              const selected = new Set(market.selectedTokenIds || []);
              return (
                <div key={key} className="rounded-lg border border-border/60 bg-muted/10 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      {market.eventTitle ? (
                        <p className="truncate text-[9px] font-medium uppercase tracking-wide text-secondary">
                          {market.eventTitle}
                        </p>
                      ) : null}
                      <p className="line-clamp-2 text-xs font-medium text-foreground">
                        {market.title || market.slug || market.id}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-7 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() =>
                        setMarkets((current) =>
                          current.filter((item) => polymarketRealtimeMarketKey(item) !== key),
                        )
                      }
                    >
                      <Trash2 className="size-3.5" aria-hidden />
                      <span className="sr-only">Remove market</span>
                    </Button>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(market.outcomePairs || []).map((pair) => (
                      <label
                        key={pair.tokenId}
                        className={cn(
                          "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-2 py-1 text-[10px] transition-colors",
                          selected.has(pair.tokenId)
                            ? "border-secondary/35 bg-secondary/10 text-foreground"
                            : "border-border/60 bg-background text-muted-foreground",
                        )}
                      >
                        <Checkbox
                          checked={selected.has(pair.tokenId)}
                          onCheckedChange={(checked) =>
                            patchMarketTokens(key, pair.tokenId, checked === true)
                          }
                        />
                        {pair.outcome}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="space-y-2">
        <div>
          <h3 className="text-xs font-semibold text-foreground">3. Choose live feeds</h3>
          <p className="text-[11px] text-muted-foreground">
            Select one, several, or all. Every field returned by these feeds is retained.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {POLYMARKET_REALTIME_FEED_OPTIONS.map((option) => {
            const checked = feedTypes.includes(option.id);
            return (
              <label
                key={option.id}
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 transition-colors",
                  checked
                    ? "border-secondary/35 bg-secondary/10"
                    : "border-border/60 bg-background hover:bg-muted/30",
                )}
              >
                <Checkbox
                  className="mt-0.5"
                  checked={checked}
                  onCheckedChange={(next) =>
                    setFeedTypes((current) =>
                      next === true
                        ? [...new Set([...current, option.id])]
                        : current.filter((id) => id !== option.id),
                    )
                  }
                />
                <span>
                  <span className="block text-[11px] font-medium text-foreground">
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
        {feedTypes.includes("candlesticks") ? (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-secondary/25 bg-secondary/5 px-3 py-2.5">
            <label
              htmlFor="polymarket-candle-interval"
              className="text-[11px] font-medium text-foreground"
            >
              Candlestick interval
            </label>
            <select
              id="polymarket-candle-interval"
              value={candleInterval}
              disabled={connecting}
              onChange={(event) => setCandleInterval(event.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-secondary/40"
            >
              {POLYMARKET_CANDLE_INTERVALS.map((interval) => (
                <option key={interval.value} value={interval.value}>
                  {interval.label}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-muted-foreground">
              Built only from executed trades. Quiet intervals carry the previous close with zero
              volume.
            </p>
          </div>
        ) : null}
      </section>

      <section className="space-y-2">
        <div>
          <h3 className="text-xs font-semibold text-foreground">4. Choose dashboard layout</h3>
          <p className="text-[11px] text-muted-foreground">
            Decide how multiple markets should be organized when the live dashboard opens.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            {
              id: "separate_tabs",
              label: "Separate tabs",
              description: "Open one market at a time and switch between markets using tabs.",
            },
            {
              id: "one_page",
              label: "1 page for all markets",
              description: "Stack every market and its live-feed charts on one scrolling page.",
            },
          ].map((option) => {
            const checked = dashboardLayout === option.id;
            return (
              <label
                key={option.id}
                className={cn(
                  "flex cursor-pointer items-start gap-2 rounded-lg border p-3 transition-colors",
                  checked
                    ? "border-secondary/35 bg-secondary/10"
                    : "border-border/60 bg-background hover:bg-muted/30",
                )}
              >
                <input
                  type="radio"
                  name="polymarket-dashboard-layout"
                  value={option.id}
                  checked={checked}
                  disabled={connecting}
                  onChange={() => setDashboardLayout(option.id)}
                  className="mt-0.5 size-4 accent-secondary"
                />
                <span>
                  <span className="block text-[11px] font-medium text-foreground">
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

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
        <p className="text-[11px] text-muted-foreground">
          You can always subscribe to more markets later.
        </p>
        <Button type="button" className="gap-1.5" disabled={connecting} onClick={connect}>
          <Radio className={cn("size-3.5", connecting && "animate-pulse")} aria-hidden />
          {connecting ? "Connecting…" : "Connect live feeds"}
        </Button>
      </div>

      <Dialog
        open={!!eventPicker}
        onOpenChange={(open) => {
          if (!open) setEventPicker(null);
        }}
      >
        <DialogContent className="flex max-h-[85vh] flex-col gap-3 overflow-hidden sm:max-w-xl">
          <DialogHeader className="shrink-0">
            <DialogTitle>{eventPicker?.title || "Select event markets"}</DialogTitle>
            <DialogDescription>
              Choose all markets in this event or only the ones you want in your live stream.
            </DialogDescription>
          </DialogHeader>
          <div className="flex shrink-0 items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-[11px]"
              onClick={() => {
                const all = eventPicker?.markets || [];
                const allSelected = all.length > 0 && all.every((market) =>
                  eventMarketKeys.has(polymarketRealtimeMarketKey(market)),
                );
                setEventMarketKeys(
                  allSelected
                    ? new Set()
                    : new Set(all.map((market) => polymarketRealtimeMarketKey(market))),
                );
              }}
            >
              Select all / clear
            </Button>
            <span className="text-[10px] text-muted-foreground">
              {eventMarketKeys.size} selected
            </span>
          </div>
          <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
            {(eventPicker?.markets || []).map((market) => {
              const key = polymarketRealtimeMarketKey(market);
              const checked = eventMarketKeys.has(key);
              return (
                <label
                  key={key}
                  className={cn(
                    "flex cursor-pointer items-start gap-2 rounded-lg border p-2.5",
                    checked ? "border-secondary/35 bg-secondary/10" : "border-border/60",
                  )}
                >
                  <Checkbox
                    className="mt-0.5"
                    checked={checked}
                    onCheckedChange={(next) =>
                      setEventMarketKeys((current) => {
                        const selected = new Set(current);
                        if (next === true) selected.add(key);
                        else selected.delete(key);
                        return selected;
                      })
                    }
                  />
                  <span className="min-w-0">
                    <span className="block text-xs font-medium text-foreground">
                      {market.title || market.slug || market.id}
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
                setMarkets((current) => mergePolymarketRealtimeMarkets(current, selected));
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
