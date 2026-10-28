"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CircleAlert, Loader2, Search, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useIntegrationConnect } from "@/components/dashboardComposer/integrationConnectDialog";
import { useWorkspaceCanvas } from "@/components/dashboardComposer/workspaceCanvas";
import { useUser } from "@/lib/hooks";
import { cn } from "@/lib/utils";
import {
  describePlan,
  formatDay,
  loadKalshiCutoffs,
  planTradeSources,
  resolveKalshiMarket,
  searchKalshiMarkets,
  SOURCE_LABELS,
} from "./kalshiTradeHistorySource";
import { runKalshiTradeHistory } from "./kalshiTradeHistoryRun";

const EXAMPLES = ["Bitcoin price", "Fed funds rate", "NYC mayor", "KXBTCD"];

function formatCents(value) {
  return value == null ? "—" : `${Math.round(value * 100)}¢`;
}

function formatCount(value) {
  if (value == null) return "—";
  return Math.abs(value) >= 10000
    ? new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value)
    : Math.round(value).toLocaleString();
}

function formatTime(ms) {
  return ms ? new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "";
}

function statusLabel(status, result) {
  if (result === "yes" || result === "no") return "Settled";
  if (status === "active" || status === "open") return "Open";
  if (status === "initialized" || status === "unopened") return "Upcoming";
  if (status === "closed" || status === "inactive" || status === "paused") return "Closed";
  if (status) return "Settled";
  return "";
}

function StatusPill({ status, result }) {
  const label = statusLabel(status, result);
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
  const closed = market.closeMs && market.closeMs < Date.now();
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
          <span className="truncate font-mono">{market.ticker}</span>
          {market.closeMs ? <span className="shrink-0">· {closed ? "closed" : "closes"} {formatDay(market.closeMs)}</span> : null}
        </span>
      </span>
      <StatusPill status={market.status} />
      {active ? <Check className="size-4 shrink-0 self-center text-[#2f6fed] dark:text-blue-400" aria-hidden /> : null}
    </button>
  );
}

function Stat({ label, value, detail }) {
  return (
    <div className="rounded-lg bg-black/[0.03] px-3 py-2.5 dark:bg-white/[0.04]">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-[17px] font-semibold tabular-nums tracking-tight text-foreground">{value}</dd>
      {detail ? <dd className="text-[11px] text-muted-foreground">{detail}</dd> : null}
    </div>
  );
}

function MarketStatsCard({ meta }) {
  const settled = meta.result === "yes" || meta.result === "no";
  const ended = settled || (meta.closeMs && meta.closeMs < Date.now());
  return (
    <article className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
      <header className="border-b border-border/50 px-4 py-3">
        <div className="flex items-start gap-2">
          <p className="min-w-0 flex-1 text-[15px] font-semibold leading-snug text-foreground">{meta.title}</p>
          <StatusPill status={meta.status} result={meta.result} />
        </div>
        {meta.subtitle ? <p className="mt-0.5 text-[12px] text-muted-foreground">{meta.subtitle}</p> : null}
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">{meta.ticker}</p>
      </header>
      <dl className="grid grid-cols-2 gap-2 p-3">
        <Stat
          label={settled ? "Settlement" : "Last price"}
          value={settled ? meta.result.toUpperCase() : formatCents(meta.lastPrice)}
          detail={settled ? `Last traded ${formatCents(meta.lastPrice)}` : meta.lastPrice == null ? "" : `No ${formatCents(1 - meta.lastPrice)}`}
        />
        <Stat label="Yes bid / ask" value={`${formatCents(meta.yesBid)} / ${formatCents(meta.yesAsk)}`} />
        <Stat label="Volume" value={formatCount(meta.volume)} detail={meta.volume24h ? `${formatCount(meta.volume24h)} in 24h` : "contracts"} />
        <Stat label="Open interest" value={formatCount(meta.openInterest)} detail="contracts" />
        <Stat label="Opened" value={formatDay(meta.openMs) || "—"} detail={formatTime(meta.openMs)} />
        <Stat label={ended ? "Closed" : "Closes"} value={formatDay(meta.closeMs) || "—"} detail={formatTime(meta.closeMs)} />
      </dl>
    </article>
  );
}

function SourceCard({ plan }) {
  const route = describePlan(plan);
  return (
    <section className="rounded-xl border border-border/70 bg-background p-4 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300 [animation-delay:80ms] fill-mode-both">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Trade history source</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {plan.sources.map((source, index) => (
          <span
            key={source}
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
              index === 0 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground",
            )}
          >
            {index === 0 ? <Check className="size-3" strokeWidth={3} aria-hidden /> : null}
            {SOURCE_LABELS[source]}
            {index > 0 ? (plan.kind === "live+v2" ? " for older trades" : " as fallback") : null}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{route.detail}</p>
      <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">
        Pulls the market&apos;s full trade history, with both yes and no prices on every row.
      </p>
    </section>
  );
}

function SourceLegend({ cutoffs }) {
  const cutoff = formatDay(cutoffs?.tradesMs) || "the live cutoff";
  const rows = [
    [SOURCE_LABELS.kalshiLive, `Markets still trading or settled after ${cutoff}`],
    [SOURCE_LABELS.kalshiHistorical, "Markets that closed between Kalshi's launch and Dec 2025"],
    [SOURCE_LABELS.kalshiHistoricalV2, `Everything else up to ${cutoff}, with candlesticks when the trade tape is empty`],
  ];
  return (
    <section className="mt-5 rounded-xl border border-border/70 bg-background p-4 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Where trades come from</p>
      <ul className="mt-2 space-y-2.5">
        {rows.map(([label, detail]) => (
          <li key={label} className="text-[12px] leading-relaxed">
            <span className="font-medium text-foreground">{label}</span>
            <span className="block text-muted-foreground">{detail}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MarketPane({ selected, meta, metaStatus, metaError, plan, cutoffs }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-[#e6edf3] px-6 pb-6 pt-12 dark:bg-[#1c232b]">
      <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
        <TrendingUp className="size-4 text-muted-foreground" aria-hidden />
        Market details
      </div>
      {!selected ? (
        <>
          <p className="mt-3 text-[13px] leading-relaxed text-foreground">
            Pick a market to see its stats and where Lychee will pull its trades from.
          </p>
          <SourceLegend cutoffs={cutoffs} />
        </>
      ) : metaStatus === "error" ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-border/70 bg-background p-4 text-[13px] text-foreground shadow-sm">
          <CircleAlert className="mt-px size-4 shrink-0 text-destructive" aria-hidden />
          {metaError || "Couldn't load this market."}
        </div>
      ) : metaStatus !== "ready" || !meta ? (
        <div className="mt-4 overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
          <div className="border-b border-border/50 px-4 py-3">
            <p className="text-[15px] font-semibold leading-snug text-foreground">{selected.title}</p>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">{selected.ticker}</p>
          </div>
          <div className="grid grid-cols-2 gap-2 p-3">
            {Array.from({ length: 6 }, (_, index) => (
              <Skeleton key={index} className="h-[66px] rounded-lg bg-black/[0.06] dark:bg-white/[0.08]" />
            ))}
          </div>
        </div>
      ) : (
        <div key={meta.ticker} className="mt-4 space-y-3">
          <MarketStatsCard meta={meta} />
          {plan ? <SourceCard plan={plan} /> : null}
        </div>
      )}
    </div>
  );
}

export function KalshiTradeHistoryRecipe({ onBack, Title = "h2", Description = "p" }) {
  const connect = useIntegrationConnect();
  const canvas = useWorkspaceCanvas();
  const user = useUser();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [highlighted, setHighlighted] = useState(-1);
  const [selected, setSelected] = useState(null);
  const [meta, setMeta] = useState(null);
  const [metaStatus, setMetaStatus] = useState("idle");
  const [metaError, setMetaError] = useState("");
  const [cutoffs, setCutoffs] = useState(null);
  const inputRef = useRef(null);
  const metaRef = useRef(null);
  const plan = useMemo(() => (meta ? planTradeSources(meta, cutoffs) : null), [cutoffs, meta]);
  const trimmed = query.trim();

  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
    let alive = true;
    void loadKalshiCutoffs().then((value) => {
      if (alive) setCutoffs(value);
    });
    return () => {
      alive = false;
      metaRef.current?.abort();
    };
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
      searchKalshiMarkets(trimmed, controller.signal, show)
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
    if (selected?.ticker === market.ticker && metaStatus !== "error") return;
    metaRef.current?.abort();
    const controller = new AbortController();
    metaRef.current = controller;
    setSelected(market);
    setMeta(null);
    setMetaError("");
    setMetaStatus("loading");
    resolveKalshiMarket(market.ticker, controller.signal)
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

  const ready = metaStatus === "ready" && meta && plan && canvas;
  const go = () => {
    if (!ready) return;
    void runKalshiTradeHistory({
      meta,
      plan,
      canvas,
      close: () => connect?.close?.(),
      accountId: user?.userId || "",
    });
  };

  return (
    <div className="grid min-h-0 min-w-0 flex-1 md:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
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
            <Title className="text-xl font-semibold tracking-tight text-foreground">Download Kalshi Trade History</Title>
            <Description className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              Search in plain English, or paste a market ticker, event ticker or Kalshi link.
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
              placeholder="Will Bitcoin close above $100k this year?"
              aria-label="Search Kalshi markets"
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
                {EXAMPLES.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => {
                      setQuery(example);
                      inputRef.current?.focus();
                    }}
                    className={cn(
                      "rounded-full border border-border px-3 py-1 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground",
                      /^[A-Z0-9-]+$/.test(example) && "font-mono",
                    )}
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          ) : results.length ? (
            <div role="listbox" aria-label="Kalshi markets" className="space-y-2">
              {results.map((market, index) => (
                <ResultOption
                  key={market.ticker}
                  market={market}
                  active={market.ticker === selected?.ticker}
                  highlighted={index === highlighted && market.ticker !== selected?.ticker}
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
              {searchError || "No markets match. Try other words, or paste a ticker or Kalshi link."}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 px-6 py-4">
          {onBack ? (
            <Button type="button" variant="outline" onClick={onBack}>
              Previous
            </Button>
          ) : null}
          <Button type="button" disabled={!ready} className="bg-[#2f6fed] text-white hover:bg-[#2f6fed]/90" onClick={go}>
            Save and Go
            <ArrowRight />
          </Button>
        </div>
      </div>
      <MarketPane
        selected={selected}
        meta={meta}
        metaStatus={metaStatus}
        metaError={metaError}
        plan={plan}
        cutoffs={cutoffs}
      />
    </div>
  );
}
