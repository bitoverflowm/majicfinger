"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDay, resolvePolymarketMarket, searchPolymarketMarkets } from "./polymarketTradeHistorySource";

export function formatCents(value) {
  return value == null ? "—" : `${Math.round(value * 1000) / 10}¢`;
}

export function formatUsd(value) {
  if (value == null) return "—";
  return Math.abs(value) >= 10000
    ? `$${new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value)}`
    : `$${Math.round(value).toLocaleString()}`;
}

function formatTime(ms) {
  return ms ? new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "";
}

function statusLabel(status, winner) {
  if (winner) return "Resolved";
  if (status === "open") return "Open";
  if (status === "upcoming") return "Upcoming";
  if (status === "closed") return "Closed";
  return "";
}

export function StatusPill({ status, winner }) {
  const label = statusLabel(status, winner);
  if (!label) return null;
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        label === "Open" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground",
      )}
    >
      {label}
    </span>
  );
}

function ResultOption({ market, active, highlighted, onPick, onHover }) {
  const closed = market.status === "closed" || (market.closeMs && market.closeMs < Date.now());
  return (
    <button
      type="button"
      role="option"
      aria-selected={active}
      onClick={() => onPick(market)}
      onMouseEnter={onHover}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border px-3 py-3 text-left transition-colors duration-200",
        active
          ? "border-[#2f6fed] bg-[#e7f0ff] dark:border-blue-400 dark:bg-blue-500/15"
          : highlighted
            ? "border-neutral-300 bg-muted dark:border-neutral-600"
            : "border-border/70 bg-background",
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 block text-[13px] font-semibold leading-snug text-foreground">{market.title}</span>
        {market.subtitle ? <span className="mt-0.5 block truncate text-[12px] text-muted-foreground">{market.subtitle}</span> : null}
        <span className="mt-1 flex min-w-0 items-baseline gap-1.5 text-[11px] text-muted-foreground">
          {market.volume != null ? <span className="shrink-0 tabular-nums">{formatUsd(market.volume)} vol</span> : null}
          {market.closeMs ? <span className="shrink-0">· {closed ? "closed" : "closes"} {formatDay(market.closeMs)}</span> : null}
        </span>
      </span>
      <StatusPill status={market.status} />
      {active ? <Check className="size-4 shrink-0 self-center text-[#2f6fed] dark:text-blue-400" aria-hidden /> : null}
    </button>
  );
}

export function Stat({ label, value, detail, className }) {
  return (
    <div className={cn("rounded-lg bg-black/[0.03] px-3 py-2.5 dark:bg-white/[0.04]", className)}>
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 truncate text-[17px] font-semibold tabular-nums tracking-tight text-foreground">{value}</dd>
      {detail ? <dd className="truncate text-[11px] text-muted-foreground">{detail}</dd> : null}
    </div>
  );
}

function MarketAvatar({ icon, title }) {
  const [broken, setBroken] = useState(false);
  if (!icon || broken) {
    return (
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-[15px] font-semibold text-muted-foreground" aria-hidden>
        {(title || "?").trim().charAt(0).toUpperCase()}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={icon} alt="" onError={() => setBroken(true)} className="size-10 shrink-0 rounded-lg bg-muted object-cover" />
  );
}

export function MarketStatsCard({ meta, compact = false }) {
  const ended = meta.closed || (meta.closeMs && meta.closeMs < Date.now());
  const [first = "Yes", second = "No"] = meta.outcomes;
  const [firstPrice = null, secondPrice = null] = meta.prices;
  return (
    <article className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
      <header className="flex items-start gap-3 border-b border-border/50 px-4 py-3">
        <MarketAvatar key={meta.icon} icon={meta.icon} title={meta.title} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <p className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-foreground">{meta.title}</p>
            <StatusPill status={meta.status} winner={meta.winner} />
          </div>
          {meta.subtitle ? <p className="mt-0.5 text-[12px] text-muted-foreground">{meta.subtitle}</p> : null}
          <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{meta.slug || meta.conditionId}</p>
        </div>
      </header>
      <dl className="grid grid-cols-2 gap-2 p-3">
        <Stat
          label={meta.winner ? "Resolved" : first}
          value={meta.winner || formatCents(firstPrice)}
          detail={meta.winner ? `Last traded ${formatCents(meta.lastPrice)}` : `${second} ${formatCents(secondPrice)}`}
        />
        {compact ? (
          <Stat label="Volume" value={formatUsd(meta.volume)} detail={meta.volume24h ? `${formatUsd(meta.volume24h)} in 24h` : "USDC"} />
        ) : (
          <>
            <Stat label="Bid / ask" value={`${formatCents(meta.bestBid)} / ${formatCents(meta.bestAsk)}`} detail={first} />
            <Stat label="Total volume" value={formatUsd(meta.volume)} detail="USDC traded since it opened" />
            <Stat label="24h volume" value={formatUsd(meta.volume24h ?? 0)} detail="USDC traded in the last day" />
            <Stat label="Liquidity" value={formatUsd(meta.liquidity)} detail="USDC on the book" className="col-span-2" />
            <Stat label="Opened" value={formatDay(meta.openMs) || "—"} detail={formatTime(meta.openMs)} />
            <Stat label={ended ? "Closed" : "Closes"} value={formatDay(meta.closeMs) || "—"} detail={formatTime(meta.closeMs)} />
          </>
        )}
      </dl>
    </article>
  );
}

/** Debounced market search, keyboard picking, and the picked market's full details. */
export function usePolymarketMarketPicker() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [highlighted, setHighlighted] = useState(-1);
  const [selected, setSelected] = useState(null);
  const [meta, setMeta] = useState(null);
  const [metaStatus, setMetaStatus] = useState("idle");
  const [metaError, setMetaError] = useState("");
  const inputRef = useRef(null);
  const metaRef = useRef(null);
  const trimmed = query.trim();

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
    return () => metaRef.current?.abort();
  }, []);

  useEffect(() => {
    if (trimmed.length < 2) {
      setResults([]);
      setSearching(false);
      setSearchError("");
      return undefined;
    }
    const controller = new AbortController();
    setSearching(true);
    let first = true;
    const show = (found) => {
      const reset = first;
      first = false;
      setResults(found);
      setSearchError("");
      setHighlighted((index) => (!found.length ? -1 : reset ? 0 : Math.min(Math.max(index, 0), found.length - 1)));
    };
    const timer = setTimeout(() => {
      searchPolymarketMarkets(trimmed, controller.signal, show)
        .then(show)
        .catch((err) => {
          if (err?.name !== "AbortError") setSearchError(err?.message || "Search failed.");
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false);
        });
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  const pick = (market) => {
    if (selected?.conditionId === market.conditionId && metaStatus !== "error") return;
    metaRef.current?.abort();
    const controller = new AbortController();
    metaRef.current = controller;
    setSelected(market);
    setMeta(null);
    setMetaError("");
    setMetaStatus("loading");
    resolvePolymarketMarket(market.conditionId, controller.signal)
      .then((resolved) => {
        if (controller.signal.aborted) return;
        setMeta(resolved);
        setMetaStatus("ready");
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setMetaError(err?.message || "Couldn't load this market.");
        setMetaStatus("error");
      });
  };

  const onKeyDown = (event) => {
    if (!results.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((index) => Math.min(results.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      pick(results[Math.max(0, highlighted)]);
    }
  };

  return { query, setQuery, trimmed, results, searching, searchError, highlighted, setHighlighted, selected, meta, metaStatus, metaError, inputRef, pick, onKeyDown };
}

/** Left column of a Polymarket recipe: heading, search box, results, and Save and Go. */
export function MarketSearchColumn({ picker, heading, examples, onBack, Title = "h2", Description = "p", ready, onGo }) {
  const { query, setQuery, trimmed, results, searching, searchError, highlighted, setHighlighted, selected, inputRef, pick, onKeyDown } = picker;
  return (
    <div className="flex min-h-0 flex-col bg-background">
      <div className="flex items-start gap-2 px-6 pb-3 pt-6">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to integrations"
            className="-ml-1.5 mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <Title className="text-xl font-semibold tracking-tight text-foreground">{heading}</Title>
          <Description className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Search in plain English, or paste a Polymarket link, market slug or condition id.
          </Description>
        </div>
      </div>
      <div className="px-6 pb-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Will Bitcoin reach $150k this year?"
            aria-label="Search Polymarket markets"
            className="h-11 w-full rounded-xl border border-border bg-background pl-9 pr-9 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-neutral-400 focus:ring-2 focus:ring-black/5 dark:focus:border-neutral-500 dark:focus:ring-white/10"
          />
          {searching ? (
            <span className="absolute right-3 top-1/2 -translate-y-1/2" aria-hidden>
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </span>
          ) : null}
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4">
        {trimmed.length < 2 ? (
          <div className="pt-2">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Try</p>
            <div className="flex flex-wrap gap-2">
              {examples.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => {
                    setQuery(example);
                    inputRef.current?.focus();
                  }}
                  className="rounded-full border border-border px-3 py-1 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  {example}
                </button>
              ))}
            </div>
          </div>
        ) : results.length ? (
          <div role="listbox" aria-label="Polymarket markets" className="space-y-2">
            {results.map((market, index) => (
              <ResultOption
                key={market.conditionId}
                market={market}
                active={market.conditionId === selected?.conditionId}
                highlighted={index === highlighted && market.conditionId !== selected?.conditionId}
                onPick={pick}
                onHover={() => setHighlighted(index)}
              />
            ))}
          </div>
        ) : searching ? (
          <div className="space-y-2" aria-label="Searching markets">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-[74px] rounded-xl bg-black/[0.06] dark:bg-white/[0.08]" />
            ))}
          </div>
        ) : (
          <p className="pt-2 text-[13px] text-muted-foreground">
            {searchError || "No markets match. Try other words, or paste a Polymarket link."}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center justify-end gap-2 px-6 py-4">
        {onBack ? (
          <Button type="button" variant="outline" onClick={onBack}>
            Previous
          </Button>
        ) : null}
        <Button type="button" disabled={!ready} className="bg-[#2f6fed] text-white hover:bg-[#2f6fed]/90" onClick={onGo}>
          Save and Go
          <ArrowRight />
        </Button>
      </div>
    </div>
  );
}

export function MarketCardSkeleton({ selected }) {
  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
      <div className="flex items-start gap-3 border-b border-border/50 px-4 py-3">
        <Skeleton className="size-10 shrink-0 rounded-lg bg-black/[0.06] dark:bg-white/[0.08]" />
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold leading-snug text-foreground">{selected.title}</p>
          <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">{selected.slug || selected.conditionId}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3">
        {Array.from({ length: 7 }, (_, index) => (
          <Skeleton key={index} className={cn("h-[66px] rounded-lg bg-black/[0.06] dark:bg-white/[0.08]", index === 4 && "col-span-2")} />
        ))}
      </div>
    </div>
  );
}
