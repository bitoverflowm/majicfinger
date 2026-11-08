"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { HeaderCell } from "./browse/marketBrowseTable";
import { MarketIcon, cents, shares, usd } from "./traderTradesTable";
import { walkPositions } from "./traderScore";

const ROW_HEIGHT = 48;
const OVERSCAN = 10;
const REFRESH_MS = 20_000;
/** A trade can move several positions at once; give the API a moment to catch up before re-reading. */
const AFTER_TRADE_MS = 2_500;
const PAGE = 500;
/** 10,000 positions: more than any wallet holds open, and a bound on a runaway cursor. */
const MAX_PAGES = 20;
/** Matches the `tick-up` / `tick-down` animations in tailwind.config.js. */
const TICK_MS = 1200;

const GRID = "minmax(300px, 1fr) 116px 84px 84px 112px 104px 108px 92px 96px 88px 100px 84px 92px 68px";

const OUTCOME_TONE = [
  "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  "bg-rose-500/10 text-rose-800 dark:text-rose-200",
];

const COLLATOR = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });
export const DAY = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

export function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function endMs(row) {
  const raw = String(row.end_date || "").trim();
  if (!raw) return null;
  const ms = Date.parse(/^\d{4}-\d{2}-\d{2}$/.test(raw) ? `${raw}T23:59:59` : raw);
  return Number.isFinite(ms) ? ms : null;
}

export function positionKey(row) {
  return String(row.token_id || `${row.condition_id}|${row.outcome_index}`);
}

export function secondsMs(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? (n < 1e12 ? n * 1000 : n) : null;
}

function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function when(ms) {
  if (ms == null) return "—";
  const date = new Date(ms);
  return sameDay(date, new Date()) ? date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : DAY.format(date);
}

const COLUMNS = [
  { key: "market", label: "Question", className: "sticky left-0 z-[2] bg-background pl-3 pr-2", dir: "asc", text: true, value: (row) => row.title },
  { key: "outcome", label: "Outcome", className: "px-2", dir: "asc", text: true, value: (row) => row.outcome },
  { key: "shares", label: "Balance", className: "px-2", right: true, dir: "desc", value: (row) => num(row.current_size), title: "Shares held now" },
  { key: "entry", label: "Avg price", className: "px-2", right: true, dir: "desc", value: (row) => num(row.avg_price), title: "Average price paid per share" },
  { key: "price", label: "Current price", className: "px-2", right: true, dir: "desc", value: (row) => num(row.current_price), title: "Current market price" },
  { key: "value", label: "Value", className: "px-2", right: true, dir: "desc", value: (row) => num(row.current_value), title: "What the balance is worth at the current price" },
  { key: "bought", label: "Total bought", className: "px-2", right: true, dir: "desc", value: (row) => num(row.total_size), title: "Every share of this outcome ever bought, including any since sold" },
  { key: "cost", label: "Cost", className: "px-2", right: true, dir: "desc", value: (row) => num(row.total_cost_usdc), title: "What all those shares cost, fees included" },
  { key: "unrealized", label: "Unrealized", className: "px-2", right: true, dir: "desc", value: (row) => num(row.unrealized_pnl), title: "Profit on the shares still held, at the current price" },
  { key: "realized", label: "Realized", className: "px-2", right: true, dir: "desc", value: (row) => num(row.realized_pnl), title: "Profit already locked in by selling" },
  { key: "pnl", label: "Total PnL", className: "px-2", right: true, dir: "desc", value: (row) => num(row.total_pnl), title: "Realized plus unrealized, and the return on what it cost" },
  { key: "opened", label: "Opened", className: "px-2", right: true, dir: "desc", value: (row) => secondsMs(row.first_entry_at), title: "First buy into this position" },
  { key: "last", label: "Last trade", className: "px-2", right: true, dir: "desc", value: (row) => secondsMs(row.last_event_at), title: "Most recent trade in this position" },
  { key: "ends", label: "Ends", className: "pl-2 pr-3", right: true, dir: "asc", value: endMs, title: "When the market is scheduled to end" },
];

/** Sorts by one of `columns` (each with `value(row)`, and `text` for strings); blanks go last either way. */
export function sortByColumn(rows, { key, dir }, columns = COLUMNS) {
  const column = columns.find((item) => item.key === key);
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

export function signedUsd(value) {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) < 0.005) return "$0.00";
  return `${value > 0 ? "+" : "−"}${usd(Math.abs(value))}`;
}

export function pnlTone(value) {
  if (!Number.isFinite(value) || Math.abs(value) < 0.005) return "text-muted-foreground";
  return value > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
}

/**
 * Everything a wallet holds right now, re-read every 20 seconds and shortly after each new trade.
 * `ticks` says which positions' prices just moved, and which way.
 *
 * @param {string} address
 * @param {string} lastTradeKey changes when the wallet trades
 */
export function useTraderPositions(address, lastTradeKey) {
  const wallet = String(address || "").toLowerCase();
  const [state, setState] = useState({ wallet: "", status: "loading", rows: [], truncated: false, error: "", updatedAt: 0, ticks: new Map() });
  const kickRef = useRef(null);

  useEffect(() => {
    if (!wallet) return undefined;
    let alive = true;
    let timer = 0;
    let busy = false;
    const controller = new AbortController();
    const prices = new Map();
    const ticks = new Map();
    const run = async (first) => {
      if (busy) return;
      busy = true;
      window.clearTimeout(timer);
      try {
        const { rows, truncated } = await walkPositions({ user: wallet, status: "open" }, MAX_PAGES, controller.signal, PAGE);
        if (!alive) return;
        const now = Date.now();
        for (const row of rows) {
          const key = positionKey(row);
          const price = num(row.current_price);
          const before = prices.get(key);
          if (!first && price != null && before != null && price !== before) ticks.set(key, { dir: price > before ? 1 : -1, at: now });
          if (price != null) prices.set(key, price);
        }
        setState({ wallet, status: "ready", rows, truncated, error: "", updatedAt: now, ticks: new Map(ticks) });
      } catch (err) {
        if (!alive || err?.name === "AbortError") return;
        if (first) setState((prev) => ({ ...prev, wallet, status: "error", error: err?.message || "Couldn't load positions." }));
      } finally {
        busy = false;
        if (alive) timer = window.setTimeout(() => void run(false), REFRESH_MS);
      }
    };
    kickRef.current = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void run(false), AFTER_TRADE_MS);
    };
    void run(true);
    return () => {
      alive = false;
      kickRef.current = null;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [wallet]);

  const seenTradeRef = useRef("");
  useEffect(() => {
    if (!lastTradeKey) return;
    if (seenTradeRef.current && seenTradeRef.current !== lastTradeKey) kickRef.current?.();
    seenTradeRef.current = lastTradeKey;
  }, [lastTradeKey]);

  return state.wallet === wallet ? state : { wallet, status: "loading", rows: [], truncated: false, error: "", updatedAt: 0, ticks: new Map() };
}

function PositionRow({ row, top, maxValue, tick, now, onPickMarket }) {
  const index = Number(row.outcome_index);
  const value = num(row.current_value);
  const total = num(row.total_pnl);
  const percent = num(row.percent_pnl);
  const ends = endMs(row);
  const share = maxValue > 0 && value > 0 ? Math.sqrt(value / maxValue) : 0;
  const ticking = tick && now - tick.at < TICK_MS;
  const canOpen = !!(onPickMarket && row.condition_id);
  return (
    <div role="row" className="group/row absolute inset-x-0 grid items-center border-b border-border/50 text-[12.5px] hover:bg-muted/40" style={{ top, height: ROW_HEIGHT, gridTemplateColumns: GRID }}>
      <div role="cell" className="sticky left-0 z-[1] h-full min-w-0 bg-background">
        <button
          type="button"
          disabled={!canOpen}
          onClick={() => onPickMarket({ kind: "market", conditionId: row.condition_id, title: row.title, slug: row.slug })}
          title={canOpen ? `Open ${row.title} in the terminal` : row.title}
          className="flex h-full w-full min-w-0 items-center gap-2 pl-3 pr-2 text-left group-hover/row:bg-muted/40 disabled:cursor-default"
        >
          <MarketIcon src={row.icon} title={row.title} />
          <span className="line-clamp-2 text-[12.5px] font-medium leading-snug text-foreground group-hover/row:underline">{row.title || "—"}</span>
        </button>
      </div>
      <div role="cell" className="flex min-w-0 items-center gap-1 px-2">
        {row.outcome ? (
          <span className={cn("inline-flex max-w-full truncate rounded px-1.5 py-0.5 text-[11px] font-medium leading-none", OUTCOME_TONE[index] || "bg-muted text-foreground")}>{row.outcome}</span>
        ) : null}
      </div>
      <div role="cell" className="px-2 text-right font-mono text-[12px] tabular-nums">{shares(row.current_size)}</div>
      <div role="cell" className="px-2 text-right font-mono text-[12px] tabular-nums text-muted-foreground">{cents(row.avg_price)}</div>
      <div
        key={ticking ? tick.at : "still"}
        role="cell"
        className={cn("mx-1 rounded px-1 text-right font-mono text-[12px] tabular-nums", ticking && (tick.dir > 0 ? "animate-tick-up" : "animate-tick-down"))}
        style={ticking ? { animationDelay: `-${now - tick.at}ms` } : undefined}
      >
        {cents(row.current_price)}
      </div>
      <div role="cell" className="px-2">
        <span className="flex items-center justify-end gap-2">
          <span className="h-1.5 w-6 shrink-0 overflow-hidden rounded-full bg-muted" aria-hidden>
            <span className="block h-full rounded-full bg-[#2f6fed]" style={{ width: `${Math.max(share * 100, share ? 6 : 0)}%` }} />
          </span>
          <span className="font-mono text-[12px] font-medium tabular-nums">{usd(value)}</span>
        </span>
      </div>
      <div role="cell" className="px-2 text-right font-mono text-[12px] tabular-nums text-muted-foreground">{shares(row.total_size)}</div>
      <div role="cell" className="px-2 text-right font-mono text-[12px] tabular-nums text-muted-foreground">{usd(num(row.total_cost_usdc))}</div>
      <div role="cell" className={cn("px-2 text-right font-mono text-[12px] tabular-nums", pnlTone(num(row.unrealized_pnl)))}>{signedUsd(num(row.unrealized_pnl))}</div>
      <div role="cell" className={cn("px-2 text-right font-mono text-[12px] tabular-nums", pnlTone(num(row.realized_pnl)))}>{signedUsd(num(row.realized_pnl))}</div>
      <div role="cell" className="px-2 text-right">
        <div className={cn("font-mono text-[12px] font-semibold tabular-nums", pnlTone(total))}>{signedUsd(total)}</div>
        {percent != null ? (
          <div className={cn("font-mono text-[10.5px] tabular-nums", pnlTone(percent))}>
            {percent > 0 ? "+" : percent < 0 ? "−" : ""}
            {Math.abs(percent).toFixed(1)}%
          </div>
        ) : null}
      </div>
      <div role="cell" className="px-2 text-right text-[12px] tabular-nums text-muted-foreground">{when(secondsMs(row.first_entry_at))}</div>
      <div role="cell" className="px-2 text-right text-[12px] tabular-nums text-muted-foreground">{when(secondsMs(row.last_event_at))}</div>
      <div role="cell" className="pl-2 pr-3 text-right text-[12px] tabular-nums text-muted-foreground">
        {ends ? DAY.format(ends) : "—"}
      </div>
    </div>
  );
}

export function isResolved(row) {
  return String(row?.status || "").toUpperCase() === "REDEEMABLE";
}

/**
 * A wallet's positions in markets still trading, biggest first, with their totals. Resolved ones
 * belong to finished bets. Columns sort; a market opens in the terminal on click.
 */
export function TraderPositionsTable({ part, onPickMarket }) {
  const [sort, setSort] = useState(null);
  const base = useMemo(() => part.rows.filter((row) => num(row.current_size) > 0 && !isResolved(row)), [part.rows]);
  const shown = useMemo(() => (sort ? sortByColumn(base, sort) : base), [base, sort]);
  const totals = useMemo(() => {
    let value = 0;
    let unrealized = 0;
    let cost = 0;
    let max = 0;
    for (const row of base) {
      const v = num(row.current_value) ?? 0;
      value += v;
      unrealized += num(row.unrealized_pnl) ?? 0;
      cost += num(row.total_cost_usdc) ?? 0;
      if (v > max) max = v;
    }
    return { value, unrealized, cost, max };
  }, [base]);

  const scrollRef = useRef(null);
  const [view, setView] = useState({ top: 0, height: 440 });
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const measure = () => setView({ top: el.scrollTop, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const toTop = () => {
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

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => setNow(Date.now()), [part.updatedAt]);

  const start = Math.max(0, Math.floor(view.top / ROW_HEIGHT) - OVERSCAN);
  const end = Math.min(shown.length, Math.ceil((view.top + view.height) / ROW_HEIGHT) + OVERSCAN);
  const visible = shown.slice(start, end);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/70 px-3 py-2">
        <dl className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[12px]">
          <div className="flex items-baseline gap-1.5">
            <dt className="text-muted-foreground">Open</dt>
            <dd className="font-mono font-semibold tabular-nums text-foreground">{base.length.toLocaleString()}</dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="text-muted-foreground">Value</dt>
            <dd className="font-mono font-semibold tabular-nums text-foreground">{usd(totals.value)}</dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="text-muted-foreground">Cost</dt>
            <dd className="font-mono tabular-nums text-foreground">{usd(totals.cost)}</dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="text-muted-foreground">Unrealized</dt>
            <dd className={cn("font-mono font-semibold tabular-nums", pnlTone(totals.unrealized))}>{signedUsd(totals.unrealized)}</dd>
          </div>
        </dl>
        {sort ? (
          <button type="button" onClick={clearSort} className="ml-auto rounded px-1 text-[12px] font-medium text-foreground hover:bg-muted">
            Biggest first
          </button>
        ) : null}
      </div>
      <div
        ref={scrollRef}
        onScroll={(event) => setView({ top: event.currentTarget.scrollTop, height: event.currentTarget.clientHeight })}
        className="min-h-0 flex-1 overflow-auto overscroll-contain"
      >
        <div role="table" aria-label="Active positions" className="min-w-max">
          <div role="row" className="sticky top-0 z-[3] grid whitespace-nowrap border-b border-border/70 bg-background text-[11px] font-medium uppercase tracking-wide text-muted-foreground" style={{ gridTemplateColumns: GRID }}>
            {COLUMNS.map((column) => (
              <HeaderCell key={column.key} column={column} sort={sort} onSort={sortBy} onClearSort={clearSort} />
            ))}
          </div>
          {shown.length ? (
            <div role="rowgroup" className="relative" style={{ height: shown.length * ROW_HEIGHT }}>
              {visible.map((row, offset) => (
                <PositionRow
                  key={positionKey(row)}
                  row={row}
                  top={(start + offset) * ROW_HEIGHT}
                  maxValue={totals.max}
                  tick={part.ticks.get(positionKey(row))}
                  now={now}
                  onPickMarket={onPickMarket}
                />
              ))}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-[12px] text-muted-foreground">
              No open positions right now.
            </div>
          )}
        </div>
      </div>
      {part.truncated ? (
        <p className="border-t border-border/70 px-3 py-1.5 text-[11px] text-muted-foreground">
          Showing the {part.rows.length.toLocaleString()} largest positions.
        </p>
      ) : null}
    </div>
  );
}
