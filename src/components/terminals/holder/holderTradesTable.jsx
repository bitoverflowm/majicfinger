"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Loader2, Merge, Split } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";
import { tradeKey } from "./useFusedMarketTrades";

const ROW_HEIGHT = 36;
const OVERSCAN = 12;
/** Matches the `row-arrive` animation in tailwind.config.js. */
const ARRIVE_MS = 3000;
/** New trades land at the top; a catch-up page can slot a few in below the newest. */
const ARRIVAL_SCAN = 2000;
/** Matches the `row-flow` animation in tailwind.config.js. History rows on screen fade in a few at a time. */
const FLOW_MS = 420;
const FLOW_STAGGER_MS = 18;
const FLOW_MAX_DELAY_MS = 360;

const OUTCOME_TONE = [
  { dot: "bg-emerald-500", chip: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200" },
  { dot: "bg-rose-500", chip: "bg-rose-500/10 text-rose-800 dark:text-rose-200" },
];

const SIDE_TONE = {
  BUY: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  SELL: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const USD_COMPACT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const SHARES = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const SHARES_COMPACT = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const CENTS = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

/**
 * A socket print and REST's copy of the same trade share this key. REST adds the wallet,
 * so the wallet is left out, or the confirmed row would flash a second time.
 */
export function arrivalKey(row) {
  const hash = String(row.transaction_hash || "").toLowerCase();
  if (hash) return `${hash}|${row.token_id}|${row.side}`;
  return `${row.timestamp}|${row.token_id}|${row.side}|${row.size}`;
}

/**
 * When each trade first showed up, for trades that arrived after the history loaded.
 * History rows set the baseline and never flash.
 */
export function useTradeArrivals(rows, ready) {
  const seenRef = useRef(null);
  const arrivedRef = useRef(new Map());
  if (!ready) {
    seenRef.current = null;
    arrivedRef.current = new Map();
    return arrivedRef.current;
  }
  if (!seenRef.current) {
    seenRef.current = new Set(rows.map(arrivalKey));
    return arrivedRef.current;
  }
  const seen = seenRef.current;
  const arrived = arrivedRef.current;
  const now = Date.now();
  const scan = Math.min(rows.length, ARRIVAL_SCAN);
  for (let i = 0; i < scan; i += 1) {
    const key = arrivalKey(rows[i]);
    if (seen.has(key)) continue;
    seen.add(key);
    arrived.set(key, now);
  }
  for (const [key, at] of arrived) {
    if (now - at > ARRIVE_MS) arrived.delete(key);
  }
  return arrived;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function tradeTime(row) {
  const sec = Number(row.timestamp);
  if (!Number.isFinite(sec) || !sec) return "";
  const date = new Date(sec * 1000);
  if (sameDay(date, new Date())) {
    return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" });
  }
  const day = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${day} ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

function cents(price) {
  const value = Number(price);
  return Number.isFinite(value) ? `${CENTS.format(value * 100)}¢` : "—";
}

function shares(size) {
  const value = Number(size);
  if (!Number.isFinite(value)) return "—";
  return value >= 10_000 ? SHARES_COMPACT.format(value) : SHARES.format(value);
}

function usd(value) {
  if (!Number.isFinite(value)) return "—";
  return value >= 10_000 ? USD_COMPACT.format(value) : USD.format(value);
}

function tradeValue(row) {
  return Number(row.price) * Number(row.size);
}

function shortWallet(wallet) {
  return wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "";
}

function outcomeIndex(meta, row) {
  const index = (meta?.tokenIds || []).findIndex((token) => String(token) === String(row.token_id));
  return index < 0 ? Number(row.outcome_index) || 0 : index;
}

function gridTemplate(merged) {
  return [
    "112px",
    ...(merged ? ["68px"] : []),
    "48px",
    "56px",
    "68px",
    "96px",
    "minmax(140px, 1fr)",
  ].join(" ");
}

function TraderCell({ row, onPickTrader }) {
  const wallet = String(row.proxy_wallet || "");
  const name = String(row.name || "").trim();
  const pseudonym = String(row.pseudonym || "").trim();
  const label = name || pseudonym || shortWallet(wallet);
  if (!label) {
    return <span className="truncate text-[12px] italic text-muted-foreground">Confirming trader…</span>;
  }
  const identity = (
    <>
      <UserAvatar handle={wallet || label} name={label} size={18} className="shrink-0" />
      <span className="min-w-0 truncate" title={wallet || undefined}>
        <span className="font-medium text-foreground">{label}</span>
        {name && pseudonym ? <span className="ml-1.5 text-muted-foreground">{pseudonym}</span> : null}
      </span>
    </>
  );
  if (!wallet || !onPickTrader) return <span className="flex min-w-0 items-center gap-2">{identity}</span>;
  return (
    <button
      type="button"
      onClick={() => onPickTrader({ address: wallet, title: name || pseudonym })}
      aria-label={`Open holder analysis for ${label}`}
      className="group/trader flex w-full min-w-0 items-center gap-2 rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {identity}
      <ArrowRight
        className="ml-auto size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/row:opacity-100 group-hover/trader:text-foreground group-focus-visible/trader:opacity-100"
        aria-hidden
      />
    </button>
  );
}

function TradeRow({ row, top, merged, meta, outcomes, maxValue, arrivedAt, flowAt, onPickTrader }) {
  const value = tradeValue(row);
  const side = String(row.side || "").toUpperCase();
  const index = outcomeIndex(meta, row);
  const elapsed = arrivedAt ? Date.now() - arrivedAt : Infinity;
  const arriving = elapsed < ARRIVE_MS;
  const flowElapsed = flowAt ? Date.now() - flowAt : Infinity;
  const flowing = !arriving && flowElapsed < FLOW_MS;
  const share = maxValue > 0 && Number.isFinite(value) ? Math.sqrt(value / maxValue) : 0;
  return (
    <div
      role="row"
      className={cn(
        "group/row absolute inset-x-0 grid items-center border-b border-border/50 text-[12.5px] hover:bg-muted/40",
        arriving && "animate-row-arrive",
        flowing && "animate-row-flow motion-reduce:animate-none",
      )}
      style={{
        top,
        height: ROW_HEIGHT,
        gridTemplateColumns: gridTemplate(merged),
        ...(arriving ? { animationDelay: `-${elapsed}ms` } : flowing ? { animationDelay: `${-flowElapsed}ms` } : null),
      }}
    >
      <div role="cell" className="truncate whitespace-nowrap pl-3 pr-1 text-[12px] tabular-nums text-muted-foreground">{tradeTime(row)}</div>
      {merged ? (
        <div role="cell" className="px-2">
          <span className={cn("inline-flex max-w-full truncate rounded px-1.5 py-0.5 text-[11px] font-medium leading-none", OUTCOME_TONE[index]?.chip)}>
            {row.outcome || outcomes[index] || "—"}
          </span>
        </div>
      ) : null}
      <div role="cell" className="px-2">
        {side ? (
          <span className={cn("inline-flex rounded px-1.5 py-0.5 text-[11px] font-semibold leading-none", SIDE_TONE[side] || "bg-muted text-muted-foreground")}>
            {side === "BUY" ? "Buy" : side === "SELL" ? "Sell" : side}
          </span>
        ) : null}
      </div>
      <div role="cell" className="px-2 text-right font-mono text-[12px] tabular-nums">{cents(row.price)}</div>
      <div role="cell" className="px-2 text-right font-mono text-[12px] tabular-nums">{shares(row.size)}</div>
      <div role="cell" className="px-2">
        <span className="flex items-center justify-end gap-2">
          <span className="h-1.5 w-5 shrink-0 overflow-hidden rounded-full bg-muted" aria-hidden>
            <span className="block h-full rounded-full bg-[#E63946]" style={{ width: `${Math.max(share * 100, share ? 6 : 0)}%` }} />
          </span>
          <span className="font-mono text-[12px] tabular-nums">{usd(value)}</span>
        </span>
      </div>
      <div role="cell" className="min-w-0 px-3">
        <TraderCell row={row} onPickTrader={onPickTrader} />
      </div>
    </div>
  );
}

/**
 * Rows newest first, drawn only where the list is scrolled to. New rows at the top don't move what the reader is looking at.
 * While the history is `flowing` in, each page extends the list and the rows it puts on screen fade in.
 */
function TradeList({ rows, merged, meta, outcomes, arrivals, empty, flowing = false, onPickTrader }) {
  const scrollRef = useRef(null);
  const [view, setView] = useState({ top: 0, height: 480 });
  const firstKeyRef = useRef("");
  const flowRef = useRef({ count: 0, at: new Map() });

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const measure = () => setView({ top: el.scrollTop, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    const previous = firstKeyRef.current;
    firstKeyRef.current = rows.length ? arrivalKey(rows[0]) : "";
    if (!el || !previous || el.scrollTop < ROW_HEIGHT) return;
    const scan = Math.min(rows.length, ARRIVAL_SCAN);
    for (let i = 1; i < scan; i += 1) {
      if (arrivalKey(rows[i]) !== previous) continue;
      el.scrollTop += i * ROW_HEIGHT;
      setView({ top: el.scrollTop, height: el.clientHeight });
      return;
    }
  }, [rows]);

  const maxValue = useMemo(() => {
    let max = 0;
    for (const row of rows) {
      const value = tradeValue(row);
      if (Number.isFinite(value) && value > max) max = value;
    }
    return max;
  }, [rows]);

  const start = Math.max(0, Math.floor(view.top / ROW_HEIGHT) - OVERSCAN);
  const end = Math.min(rows.length, Math.ceil((view.top + view.height) / ROW_HEIGHT) + OVERSCAN);
  const visible = rows.slice(start, end);
  const usedKeys = new Set();

  const flow = flowRef.current;
  if (flowing) {
    const now = Date.now();
    let order = 0;
    for (let offset = Math.max(0, flow.count - start); offset < visible.length; offset += 1) {
      const key = tradeKey(visible[offset]);
      if (!flow.at.has(key)) flow.at.set(key, now + Math.min(order++ * FLOW_STAGGER_MS, FLOW_MAX_DELAY_MS));
    }
  }
  useLayoutEffect(() => {
    const state = flowRef.current;
    state.count = rows.length;
    const stale = Date.now() - FLOW_MAX_DELAY_MS - FLOW_MS;
    for (const [key, at] of state.at) if (at < stale) state.at.delete(key);
  }, [rows]);

  return (
    <div
      ref={scrollRef}
      onScroll={(event) => setView({ top: event.currentTarget.scrollTop, height: event.currentTarget.clientHeight })}
      className="min-h-0 flex-1 overflow-auto overscroll-contain"
    >
      <div role="table" className="min-w-max">
        <div
          role="row"
          className="sticky top-0 z-[1] grid border-b border-border/70 bg-background text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          style={{ gridTemplateColumns: gridTemplate(merged) }}
        >
          <div role="columnheader" className="px-3 py-2">Time</div>
          {merged ? <div role="columnheader" className="px-2 py-2">Outcome</div> : null}
          <div role="columnheader" className="px-2 py-2">Side</div>
          <div role="columnheader" className="px-2 py-2 text-right">Price</div>
          <div role="columnheader" className="px-2 py-2 text-right">Shares</div>
          <div role="columnheader" className="px-2 py-2 text-right">Value</div>
          <div role="columnheader" className="px-3 py-2">Trader</div>
        </div>
        {rows.length ? (
          <div role="rowgroup" className="relative" style={{ height: rows.length * ROW_HEIGHT }}>
            {visible.map((row, offset) => {
              const key = arrivalKey(row);
              let rowKey = tradeKey(row);
              if (usedKeys.has(rowKey)) rowKey = `${rowKey}#${start + offset}`;
              usedKeys.add(rowKey);
              return (
                <TradeRow
                  key={rowKey}
                  row={row}
                  top={(start + offset) * ROW_HEIGHT}
                  merged={merged}
                  meta={meta}
                  outcomes={outcomes}
                  maxValue={maxValue}
                  arrivedAt={arrivals.get(key)}
                  flowAt={flowing ? flow.at.get(tradeKey(row)) : undefined}
                  onPickTrader={onPickTrader}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center gap-2 text-[12px] text-muted-foreground">{empty}</div>
        )}
      </div>
    </div>
  );
}

function lastPrice(rows) {
  const row = rows.find((item) => Number.isFinite(Number(item.price)));
  return row ? cents(row.price) : "";
}

function PanelHeader({ label, tone, rows }) {
  const last = lastPrice(rows);
  return (
    <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2">
      <span className={cn("size-2 shrink-0 rounded-full", tone?.dot)} aria-hidden />
      <span className="text-[13px] font-semibold text-foreground">{label}</span>
      <span className="text-[12px] tabular-nums text-muted-foreground">{rows.length.toLocaleString()} trades</span>
      {last ? <span className="ml-auto font-mono text-[12px] tabular-nums text-muted-foreground">Last {last}</span> : null}
    </div>
  );
}

export function MergeOutcomesButton({ merged, outcomes, onChange }) {
  const [first, second] = outcomes;
  const label = merged ? `Split ${first} and ${second}` : `Merge ${first} and ${second}`;
  const Icon = merged ? Split : Merge;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-label={label}
            aria-pressed={merged}
            onClick={() => onChange(!merged)}
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-lg border border-border/70 text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground",
              merged && "bg-muted text-foreground",
            )}
          >
            <Icon className="size-4" aria-hidden />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" sideOffset={6} className="text-xs">
          {label}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * The market's trades as a rich table. Split puts the first outcome (Yes, Up) on the left and the
 * second on the right; merged is one list with an outcome column. While `loading`, `rows` are the
 * history pages read so far and they flow in.
 */
export function HolderTradesTable({ meta, rows, merged, loading, ready, onPickTrader }) {
  const outcomes = [meta.outcomes?.[0] || "Yes", meta.outcomes?.[1] || "No"];
  const arrivals = useTradeArrivals(rows, ready);
  const sides = useMemo(() => {
    const first = String(meta.tokenIds?.[0] ?? "");
    const second = String(meta.tokenIds?.[1] ?? "");
    const left = [];
    const right = [];
    for (const row of rows) {
      const token = String(row.token_id);
      if (token === first) left.push(row);
      else if (token === second) right.push(row);
    }
    return [left, right];
  }, [meta.tokenIds, rows]);

  const empty = (label) =>
    loading ? (
      <>
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
        Reading the trade history
      </>
    ) : (
      `No ${label} trades yet`
    );

  if (merged) {
    return (
      <section aria-label="Trades" className="flex h-[560px] flex-col overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
        <TradeList rows={rows} merged meta={meta} outcomes={outcomes} arrivals={arrivals} empty={empty("")} flowing={loading} onPickTrader={onPickTrader} />
      </section>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {outcomes.map((label, index) => (
        <section
          key={label}
          aria-label={`${label} trades`}
          className="flex h-[560px] min-w-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm"
        >
          <PanelHeader label={label} tone={OUTCOME_TONE[index]} rows={sides[index]} />
          <TradeList
            rows={sides[index]}
            merged={false}
            meta={meta}
            outcomes={outcomes}
            arrivals={arrivals}
            empty={empty(label)}
            flowing={loading}
            onPickTrader={onPickTrader}
          />
        </section>
      ))}
    </div>
  );
}
