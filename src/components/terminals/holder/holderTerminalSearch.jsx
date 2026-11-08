"use client";

import { useEffect, useMemo, useState } from "react";
import { Compass, Loader2 } from "lucide-react";
import { PolymarketLiveSearch } from "@/components/connectData/polymarketLive/PolymarketLiveSearch";
import { polymarketGet } from "@/components/dashboardComposer/recipes/polymarketTradeHistorySource";
import { formatUsd } from "@/components/dashboardComposer/recipes/polymarketMarketSearch";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/** Each picked market opens in its own terminal tab. */
export const MAX_TERMINAL_TABS = 20;

const SCOPES = [
  { id: "markets", label: "Search market" },
  { id: "traders", label: "Search trader" },
];

function isClosed(raw) {
  return raw?.closed === true || raw?.closed === "true";
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** The pickable markets of one Gamma event, open first. */
function eventMarkets(event) {
  const title = String(event?.title || "").trim();
  return (Array.isArray(event?.markets) ? event.markets : [])
    .map((raw) => ({
      conditionId: String(raw?.conditionId || "").trim(),
      title: String(raw?.groupItemTitle || raw?.question || raw?.slug || "").trim(),
      question: String(raw?.question || "").trim(),
      slug: String(raw?.slug || "").trim(),
      closed: isClosed(raw),
      volume: num(raw?.volumeNum ?? raw?.volume),
      eventTitle: title,
    }))
    .filter((market) => /^0x[a-fA-F0-9]{64}$/.test(market.conditionId))
    .sort((a, b) => Number(a.closed) - Number(b.closed));
}

function marketSubject(market) {
  return { kind: "market", conditionId: market.conditionId, title: market.question || market.title, slug: market.slug };
}

async function seriesMarkets(seriesId, signal) {
  const [open, closed] = await Promise.all([
    polymarketGet("listEvents", { series_id: seriesId, closed: "false", limit: "40", order: "endDate", ascending: "true" }, signal),
    polymarketGet("listEvents", { series_id: seriesId, closed: "true", limit: "20", order: "endDate", ascending: "false" }, signal),
  ]);
  const events = [open, closed].flatMap((body) => (Array.isArray(body) ? body : []));
  const seen = new Set();
  return events.flatMap(eventMarkets).filter((market) => {
    if (seen.has(market.conditionId)) return false;
    seen.add(market.conditionId);
    return true;
  });
}

function MarketRow({ market, checked, disabled, onToggle, showEvent }) {
  const id = `terminal-pick-${market.conditionId}`;
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/70",
        checked && "bg-[#e7f0ff] hover:bg-[#dbe8ff] dark:bg-blue-500/15 dark:hover:bg-blue-500/20",
        disabled && !checked && "cursor-not-allowed opacity-50",
      )}
    >
      <Checkbox id={id} checked={checked} disabled={disabled && !checked} onCheckedChange={onToggle} className="mt-0.5" />
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium leading-snug text-foreground">{market.title}</span>
        <span className="mt-0.5 flex gap-1.5 text-[11px] text-muted-foreground">
          {showEvent && market.eventTitle && market.eventTitle !== market.title ? <span className="truncate">{market.eventTitle}</span> : null}
          {market.volume != null ? <span className="shrink-0 tabular-nums">{formatUsd(market.volume)} vol</span> : null}
          {market.closed ? <span className="shrink-0">· closed</span> : null}
        </span>
      </span>
    </label>
  );
}

/** Pick some or all markets of an event, or of the series the event belongs to. */
function EventMarketsDialog({ event, onClose, onConfirm }) {
  const raw = event?.raw || {};
  const series = Array.isArray(raw.series) ? raw.series[0] : null;
  const ownMarkets = useMemo(() => eventMarkets(raw), [raw]);
  const [scope, setScope] = useState("event");
  const [seriesList, setSeriesList] = useState(null);
  const [seriesError, setSeriesError] = useState("");
  const [picked, setPicked] = useState(() => new Set(ownMarkets.length === 1 ? [ownMarkets[0].conditionId] : []));

  useEffect(() => {
    if (scope !== "series" || !series?.id || seriesList) return undefined;
    const abort = new AbortController();
    setSeriesError("");
    seriesMarkets(String(series.id), abort.signal)
      .then((list) => {
        if (!abort.signal.aborted) setSeriesList(list);
      })
      .catch((err) => {
        if (err?.name !== "AbortError") setSeriesError(err?.message || "Couldn't load this series.");
      });
    return () => abort.abort();
  }, [scope, series?.id, seriesList]);

  const markets = scope === "series" ? seriesList || [] : ownMarkets;
  const full = picked.size >= MAX_TERMINAL_TABS;
  const toggle = (conditionId) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(conditionId)) next.delete(conditionId);
      else if (next.size < MAX_TERMINAL_TABS) next.add(conditionId);
      return next;
    });
  const selectAll = () => setPicked(new Set(markets.slice(0, MAX_TERMINAL_TABS).map((market) => market.conditionId)));
  const confirm = () => {
    const byId = new Map([...ownMarkets, ...(seriesList || [])].map((market) => [market.conditionId, market]));
    const subjects = [...picked].map((id) => byId.get(id)).filter(Boolean).map(marketSubject);
    if (subjects.length) onConfirm(subjects);
  };

  return (
    <Dialog open={!!event} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent className="z-[620] flex max-h-[80vh] max-w-lg flex-col gap-0 p-0" overlayClassName="z-[610]">
        <DialogHeader className="border-b border-border/60 px-5 pb-3 pt-5 text-left">
          <DialogTitle className="text-base leading-snug">{event?.title}</DialogTitle>
          <DialogDescription className="text-[13px]">
            Pick the markets to track. Each one opens in its own terminal tab.
          </DialogDescription>
          {series?.id ? (
            <div role="tablist" aria-label="Markets from" className="mt-3 inline-flex w-fit rounded-lg bg-muted p-0.5 text-[12px]">
              {[
                { id: "event", label: "This event" },
                { id: "series", label: `Whole series${series.title ? ` · ${series.title}` : ""}` },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  role="tab"
                  aria-selected={scope === option.id}
                  onClick={() => setScope(option.id)}
                  className={cn(
                    "max-w-[260px] truncate rounded-md px-2.5 py-1 font-medium transition-colors",
                    scope === option.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
        </DialogHeader>
        <div className="min-h-[160px] flex-1 overflow-y-auto px-2 py-2">
          {scope === "series" && !seriesList ? (
            <p className="flex items-center gap-2 px-3 py-6 text-[13px] text-muted-foreground">
              {seriesError || (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden /> Loading the series' markets…
                </>
              )}
            </p>
          ) : markets.length ? (
            markets.map((market) => (
              <MarketRow
                key={market.conditionId}
                market={market}
                checked={picked.has(market.conditionId)}
                disabled={full}
                showEvent={scope === "series"}
                onToggle={() => toggle(market.conditionId)}
              />
            ))
          ) : (
            <p className="px-3 py-6 text-[13px] text-muted-foreground">No tradable markets here yet.</p>
          )}
        </div>
        <DialogFooter className="flex-row items-center gap-2 border-t border-border/60 px-5 py-3 sm:justify-between">
          <div className="flex items-center gap-1 text-[12px]">
            <button type="button" onClick={selectAll} className="rounded-md px-2 py-1 font-medium text-foreground hover:bg-muted">
              Select all
            </button>
            <button type="button" onClick={() => setPicked(new Set())} className="rounded-md px-2 py-1 text-muted-foreground hover:bg-muted hover:text-foreground">
              Clear
            </button>
            {full ? <span className="text-muted-foreground">Up to {MAX_TERMINAL_TABS} tabs</span> : null}
          </div>
          <Button type="button" size="sm" disabled={!picked.size} onClick={confirm} className="bg-[#2f6fed] text-white hover:bg-[#2f6fed]/90">
            {picked.size > 1 ? `Open ${picked.size} tabs` : "Open market"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The integrations' Polymarket search with a market / trader toggle. A market opens straight
 * away. An event or series asks which of its markets to open. A trader is a username or wallet.
 * `onExplore`, when given, adds an Explore button that goes back to browsing markets.
 * @param {{ onPick: (subjects: object[]) => void, onExplore?: () => void, className?: string }} props
 */
export function HolderTerminalSearch({ onPick, onExplore, className }) {
  const [scope, setScope] = useState("markets");
  const [event, setEvent] = useState(null);

  const select = (suggestion) => {
    if (suggestion?.entity === "profile") {
      const address = String(suggestion.proxyWallet || suggestion.raw?.proxyWallet || suggestion.id || "").trim();
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) throw new Error("This profile has no wallet to track.");
      const title = String(suggestion.title || suggestion.pseudonym || "").trim();
      onPick([{ kind: "trader", address, title: title.toLowerCase() === address.toLowerCase() ? "" : title }]);
      return;
    }
    if (suggestion?.entity === "event") {
      const markets = eventMarkets(suggestion.raw);
      const series = Array.isArray(suggestion.raw?.series) ? suggestion.raw.series[0] : null;
      if (markets.length === 1 && !series?.id) {
        onPick([marketSubject(markets[0])]);
        return;
      }
      if (!markets.length && !series?.id) throw new Error("This event has no tradable markets yet.");
      setEvent(suggestion);
      return;
    }
    const conditionId = String(suggestion?.conditionId || suggestion?.raw?.conditionId || "").trim();
    if (!/^0x[a-fA-F0-9]{64}$/.test(conditionId)) throw new Error("This market isn't tradable yet.");
    onPick([
      {
        kind: "market",
        conditionId,
        title: String(suggestion.title || suggestion.raw?.question || "").trim(),
        slug: String(suggestion.slug || suggestion.raw?.slug || "").trim(),
      },
    ]);
  };

  const traders = scope === "traders";
  return (
    <div className={className}>
      <div className="mb-2 flex items-center gap-2">
        <div role="tablist" aria-label="Search for" className="inline-flex rounded-lg bg-muted p-0.5 text-[12px]">
          {SCOPES.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={scope === option.id}
              onClick={() => setScope(option.id)}
              className={cn(
                "rounded-md px-3 py-1 font-medium transition-colors",
                scope === option.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
        {onExplore ? (
          <button
            type="button"
            onClick={onExplore}
            className="inline-flex h-[30px] items-center gap-1.5 rounded-lg bg-muted px-3 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
          >
            <Compass className="size-3.5" aria-hidden />
            Explore
          </button>
        ) : null}
      </div>
      <PolymarketLiveSearch
        key={scope}
        collectMode
        dismissAfterSelect
        onSelect={select}
        entities={traders ? ["profile"] : ["market", "event"]}
        searchProfiles={traders}
        searchTags={false}
        acceptAddress={traders}
        placeholder={
          traders ? "Search a username or paste a wallet address" : "Search markets, events or series in plain English, or paste a link"
        }
      />
      {event ? (
        <EventMarketsDialog
          key={event.id || event.slug}
          event={event}
          onClose={() => setEvent(null)}
          onConfirm={(subjects) => {
            setEvent(null);
            onPick(subjects);
          }}
        />
      ) : null}
    </div>
  );
}
