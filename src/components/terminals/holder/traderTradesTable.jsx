"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { HeaderCell } from "./browse/marketBrowseTable";
import { arrivalKey, useTradeArrivals } from "./holderTradesTable";

const ROW_HEIGHT = 40;
const OVERSCAN = 12;
/** Matches the `row-arrive` animation in tailwind.config.js. */
const ARRIVE_MS = 3000;
const ARRIVAL_SCAN = 200;

const GRID = "128px minmax(280px, 1fr) 120px 60px 68px 88px 120px 40px";

const OUTCOME_TONE = [
  "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  "bg-rose-500/10 text-rose-800 dark:text-rose-200",
];

const SIDE_TONE = {
  BUY: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  SELL: "bg-rose-500/10 text-rose-700 dark:text-rose-300",
};

const COLLATOR = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

/** `dir` is the first click's direction. Trades already arrive newest first, so Time starts oldest first. */
const COLUMNS = [
  { key: "time", label: "Time", className: "pl-3 pr-1", dir: "asc", value: (row) => Number(row.timestamp) },
  { key: "market", label: "Market", className: "px-2", dir: "asc", text: true, value: (row) => row.title },
  { key: "outcome", label: "Outcome", className: "px-2", dir: "asc", text: true, value: (row) => row.outcome },
  { key: "side", label: "Side", className: "px-2", dir: "asc", text: true, value: (row) => row.side },
  { key: "price", label: "Price", className: "px-2", right: true, dir: "desc", value: (row) => Number(row.price) },
  { key: "shares", label: "Shares", className: "px-2", right: true, dir: "desc", value: (row) => Number(row.size) },
  { key: "value", label: "Value", className: "px-2", right: true, dir: "desc", value: tradeValue },
];

function sortTrades(rows, { key, dir }) {
  const column = COLUMNS.find((item) => item.key === key);
  if (!column) return rows;
  const sign = dir === "asc" ? 1 : -1;
  const keyed = rows.map((row) => {
    const raw = column.value(row);
    return { row, value: column.text ? (raw ? String(raw) : null) : Number.isFinite(raw) ? raw : null };
  });
  keyed.sort((a, b) => {
    if (a.value == null || b.value == null) return a.value == null ? (b.value == null ? 0 : 1) : -1;
    return sign * (column.text ? COLLATOR.compare(a.value, b.value) : a.value - b.value);
  });
  return keyed.map((entry) => entry.row);
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "BUY", label: "Buys" },
  { id: "SELL", label: "Sells" },
];

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const USD_COMPACT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const SHARES = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });
const SHARES_COMPACT = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const CENTS = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function tradeTime(row) {
  const sec = Number(row.timestamp);
  if (!Number.isFinite(sec) || !sec) return "";
  const date = new Date(sec * 1000);
  if (sameDay(date, new Date())) return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", second: "2-digit" });
  const day = date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${day} ${date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

export function cents(price) {
  const value = Number(price);
  return Number.isFinite(value) ? `${CENTS.format(value * 100)}¢` : "—";
}

export function shares(size) {
  const value = Number(size);
  if (!Number.isFinite(value)) return "—";
  return value >= 10_000 ? SHARES_COMPACT.format(value) : SHARES.format(value);
}

export function usd(value) {
  if (!Number.isFinite(value)) return "—";
  return value >= 10_000 ? USD_COMPACT.format(value) : USD.format(value);
}

export function tradeValue(row) {
  const usdc = Number(row.usdc_size);
  if (Number.isFinite(usdc)) return usdc;
  return Number(row.price) * Number(row.size);
}

export function MarketIcon({ src, title, size = 22 }) {
  const [broken, setBroken] = useState(false);
  if (!src || broken) {
    return (
      <span
        className="flex shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-semibold text-muted-foreground"
        style={{ width: size, height: size }}
        aria-hidden
      >
        {String(title || "?").trim().charAt(0).toUpperCase()}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" onError={() => setBroken(true)} className="shrink-0 rounded-md bg-muted object-cover" style={{ width: size, height: size }} />
  );
}

function TradeRow({ row, top, maxValue, arrivedAt, onPickMarket }) {
  const value = tradeValue(row);
  const side = String(row.side || "").toUpperCase();
  const index = Number(row.outcome_index);
  const elapsed = arrivedAt ? Date.now() - arrivedAt : Infinity;
  const arriving = elapsed < ARRIVE_MS;
  const share = maxValue > 0 && Number.isFinite(value) ? Math.sqrt(value / maxValue) : 0;
  const hash = String(row.transaction_hash || "");
  const canOpen = !!(onPickMarket && row.condition_id);
  return (
    <div
      role="row"
      className={cn("group/row absolute inset-x-0 grid items-center border-b border-border/50 text-[12.5px] hover:bg-muted/40", arriving && "animate-row-arrive")}
      style={{ top, height: ROW_HEIGHT, gridTemplateColumns: GRID, ...(arriving ? { animationDelay: `-${elapsed}ms` } : null) }}
    >
      <div role="cell" className="truncate whitespace-nowrap pl-3 pr-1 text-[12px] tabular-nums text-muted-foreground">
        {tradeTime(row)}
      </div>
      <div role="cell" className="min-w-0 px-2">
        <button
          type="button"
          disabled={!canOpen}
          onClick={() => onPickMarket({ kind: "market", conditionId: row.condition_id, title: row.title, slug: row.slug })}
          title={canOpen ? `Open ${row.title} in the terminal` : row.title}
          className="flex w-full min-w-0 items-center gap-2 text-left disabled:cursor-default"
        >
          <MarketIcon src={row.icon} title={row.title} />
          <span className="truncate font-medium text-foreground group-hover/row:underline">{row.title || "—"}</span>
        </button>
      </div>
      <div role="cell" className="min-w-0 px-2">
        {row.outcome ? (
          <span className={cn("inline-flex max-w-full truncate rounded px-1.5 py-0.5 text-[11px] font-medium leading-none", OUTCOME_TONE[index] || "bg-muted text-foreground")}>
            {row.outcome}
          </span>
        ) : null}
      </div>
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
          <span className="h-1.5 w-6 shrink-0 overflow-hidden rounded-full bg-muted" aria-hidden>
            <span className="block h-full rounded-full bg-[#E63946]" style={{ width: `${Math.max(share * 100, share ? 6 : 0)}%` }} />
          </span>
          <span className="font-mono text-[12px] tabular-nums">{usd(value)}</span>
        </span>
      </div>
      <div role="cell" className="flex justify-center pr-2">
        {hash ? (
          <a
            href={`https://polygonscan.com/tx/${hash}`}
            target="_blank"
            rel="noopener noreferrer"
            title="View the transaction on Polygonscan"
            className="rounded p-1 text-muted-foreground opacity-60 hover:bg-muted hover:text-foreground hover:opacity-100"
          >
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        ) : null}
      </div>
    </div>
  );
}

/**
 * One trader's trades as a rich table, newest first. New trades slide in at the top without moving
 * what the reader is looking at; a market opens in the terminal on click.
 */
export function TraderTradesTable({ rows, ready, empty, onPickMarket }) {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState(null);
  const shown = useMemo(() => {
    const filtered = filter === "all" ? rows : rows.filter((row) => String(row.side || "").toUpperCase() === filter);
    return sort ? sortTrades(filtered, sort) : filtered;
  }, [filter, rows, sort]);
  const arrivals = useTradeArrivals(rows, ready);
  const scrollRef = useRef(null);
  const [view, setView] = useState({ top: 0, height: 480 });
  const firstKeyRef = useRef("");

  const toTop = () => {
    firstKeyRef.current = "";
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setView((prev) => ({ ...prev, top: 0 }));
  };
  const sortBy = (key) => {
    const column = COLUMNS.find((item) => item.key === key);
    setSort((prev) => (prev?.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: column?.dir || "desc" }));
    toTop();
  };
  const clearSort = () => {
    setSort(null);
    toTop();
  };

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
    firstKeyRef.current = shown.length ? arrivalKey(shown[0]) : "";
    if (!el || !previous || el.scrollTop < ROW_HEIGHT) return;
    const scan = Math.min(shown.length, ARRIVAL_SCAN);
    for (let i = 1; i < scan; i += 1) {
      if (arrivalKey(shown[i]) !== previous) continue;
      el.scrollTop += i * ROW_HEIGHT;
      setView({ top: el.scrollTop, height: el.clientHeight });
      return;
    }
  }, [shown]);

  const totals = useMemo(() => {
    let max = 0;
    let buys = 0;
    let sells = 0;
    for (const row of rows) {
      const value = tradeValue(row);
      if (Number.isFinite(value) && value > max) max = value;
      const side = String(row.side || "").toUpperCase();
      if (side === "BUY") buys += 1;
      else if (side === "SELL") sells += 1;
    }
    return { max, counts: { all: rows.length, BUY: buys, SELL: sells } };
  }, [rows]);

  const start = Math.max(0, Math.floor(view.top / ROW_HEIGHT) - OVERSCAN);
  const end = Math.min(shown.length, Math.ceil((view.top + view.height) / ROW_HEIGHT) + OVERSCAN);
  const visible = shown.slice(start, end);
  const usedKeys = new Set();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2">
        <div role="group" aria-label="Side" className="flex rounded-md bg-black/[0.04] p-0.5 dark:bg-white/[0.06]">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={filter === option.id}
              onClick={() => setFilter(option.id)}
              className={cn(
                "rounded px-2.5 py-1 text-[12px] transition-colors",
                filter === option.id ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
              <span className="ml-1 tabular-nums text-muted-foreground">{totals.counts[option.id].toLocaleString()}</span>
            </button>
          ))}
        </div>
        {sort ? (
          <span className="ml-auto inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
            Sorted by {COLUMNS.find((column) => column.key === sort.key)?.label.toLowerCase()}
            {sort.dir === "asc" ? <ArrowUp className="size-3 text-foreground" aria-hidden /> : <ArrowDown className="size-3 text-foreground" aria-hidden />}
            <span title="New trades still alert and land in this order">· new trades slot in</span>
            <button type="button" onClick={clearSort} className="rounded px-1 font-medium text-foreground hover:bg-muted">
              Newest first
            </button>
          </span>
        ) : null}
      </div>
      <div
        ref={scrollRef}
        onScroll={(event) => setView({ top: event.currentTarget.scrollTop, height: event.currentTarget.clientHeight })}
        className="min-h-0 flex-1 overflow-auto overscroll-contain"
      >
        <div role="table" aria-label="Trades" className="min-w-max">
          <div
            role="row"
            className="sticky top-0 z-[1] grid border-b border-border/70 bg-background text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
            style={{ gridTemplateColumns: GRID }}
          >
            {COLUMNS.map((column) => (
              <HeaderCell key={column.key} column={column} sort={sort} onSort={sortBy} onClearSort={clearSort} />
            ))}
            <div role="columnheader" className="py-2" aria-label="Transaction" />
          </div>
          {shown.length ? (
            <div role="rowgroup" className="relative" style={{ height: shown.length * ROW_HEIGHT }}>
              {visible.map((row, offset) => {
                let rowKey = arrivalKey(row);
                if (usedKeys.has(rowKey)) rowKey = `${rowKey}#${start + offset}`;
                usedKeys.add(rowKey);
                return (
                  <TradeRow
                    key={rowKey}
                    row={row}
                    top={(start + offset) * ROW_HEIGHT}
                    maxValue={totals.max}
                    arrivedAt={arrivals.get(arrivalKey(row))}
                    onPickMarket={onPickMarket}
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center gap-2 text-[12px] text-muted-foreground">
              {rows.length ? `No ${filter === "BUY" ? "buys" : "sells"} yet` : empty}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
