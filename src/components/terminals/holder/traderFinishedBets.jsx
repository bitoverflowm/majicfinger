"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { HeaderCell } from "./browse/marketBrowseTable";
import { DAY, endMs, isResolved, num, pnlTone, positionKey, secondsMs, signedUsd, sortByColumn, when } from "./traderPositionsTable";
import { MarketIcon, cents, shares, usd } from "./traderTradesTable";
import { positionsPage } from "./traderScore";

const ROW_HEIGHT = 48;
const OVERSCAN = 10;
const PAGE = 1000;
/** Busy wallets have finished tens of thousands of bets; stop paging there. */
const MAX_ROWS = 20_000;
const REFRESH_MS = 60_000;
const AFTER_TRADE_MS = 3_000;
/** Load the next page when the reader is this close to the end. */
const NEAR_END_ROWS = 40;
const CHART_POINTS = 500;

const GRID = "minmax(300px, 1fr) 116px 96px 96px 84px 96px 112px 84px 92px 72px 68px";

const OUTCOME_TONE = [
  "bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
  "bg-rose-500/10 text-rose-800 dark:text-rose-200",
];

const RESULT = {
  won: { label: "Won", tone: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  lost: { label: "Lost", tone: "bg-rose-500/10 text-rose-700 dark:text-rose-300" },
  even: { label: "Even", tone: "bg-muted text-muted-foreground" },
};

const USD_AXIS = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const FULL_DAY = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", year: "numeric" });
const FULL_TIME = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const CLOCK = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
/** Below this span the axis shows times of day instead of dates. */
const CLOCK_SPAN_MS = 2 * 24 * 60 * 60_000;

/** One finished bet, with what the API leaves out worked out: cost, return and result. */
function finished(row) {
  const bought = num(row.total_size) ?? 0;
  const avg = num(row.avg_price) ?? 0;
  const pnl = num(row.total_pnl) ?? num(row.realized_pnl) ?? 0;
  const cost = bought * avg;
  return {
    ...row,
    key: positionKey(row),
    pnl,
    cost,
    ret: cost > 0 ? pnl / cost : null,
    result: pnl > 0.005 ? "won" : pnl < -0.005 ? "lost" : "even",
    unredeemed: isResolved(row) && (num(row.current_value) ?? 0) > 0.005,
    finishedAt: secondsMs(row.last_event_at),
    openedAt: secondsMs(row.first_entry_at),
  };
}

function byFinish(a, b) {
  return (b.finishedAt ?? 0) - (a.finishedAt ?? 0);
}

function heldFor(bet) {
  if (bet.openedAt == null || bet.finishedAt == null) return null;
  return Math.max(0, bet.finishedAt - bet.openedAt);
}

function duration(ms) {
  if (ms == null) return "—";
  const minutes = ms / 60_000;
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))}m`;
  const hours = minutes / 60;
  if (hours < 48) return `${Math.round(hours)}h`;
  return `${Math.round(hours / 24)}d`;
}

/**
 * A wallet's closed positions, most recently finished first: one page up front, more on request,
 * and the newest page re-read every minute and shortly after each trade.
 */
export function useFinishedBets(address, lastTradeKey) {
  const wallet = String(address || "").toLowerCase();
  const empty = { wallet, status: "loading", rows: [], cursor: "", done: false, more: false, error: "", updatedAt: 0 };
  const [state, setState] = useState(empty);
  const controllerRef = useRef(null);
  const busyRef = useRef(false);
  const stateRef = useRef(state);
  stateRef.current = state;
  const params = useMemo(() => ({ user: wallet, status: "closed", sort_by: "TIMESTAMP", sort_direction: "DESC" }), [wallet]);

  const refresh = useCallback(async () => {
    if (busyRef.current || !controllerRef.current) return;
    busyRef.current = true;
    try {
      const page = await positionsPage(params, "", controllerRef.current.signal, PAGE);
      setState((prev) => {
        if (prev.wallet !== wallet) return prev;
        const fresh = new Map(page.rows.map((row) => [positionKey(row), row]));
        const rest = prev.rows.filter((row) => !fresh.has(positionKey(row)));
        const isFirst = prev.status !== "ready";
        return {
          ...prev,
          status: "ready",
          rows: [...page.rows, ...rest],
          cursor: isFirst ? page.next : prev.cursor,
          done: isFirst ? !page.next : prev.done,
          error: "",
          updatedAt: Date.now(),
        };
      });
    } catch (err) {
      if (err?.name !== "AbortError") setState((prev) => (prev.status === "ready" ? prev : { ...prev, status: "error", error: err?.message || "Couldn't load finished bets." }));
    } finally {
      busyRef.current = false;
    }
  }, [params, wallet]);

  const loadMore = useCallback(async () => {
    const current = stateRef.current;
    if (busyRef.current || current.done || !current.cursor || current.rows.length >= MAX_ROWS || !controllerRef.current) return;
    busyRef.current = true;
    setState((prev) => ({ ...prev, more: true }));
    try {
      const page = await positionsPage(params, current.cursor, controllerRef.current.signal, PAGE);
      setState((prev) => {
        const seen = new Set(prev.rows.map(positionKey));
        const rows = [...prev.rows, ...page.rows.filter((row) => !seen.has(positionKey(row)))];
        return { ...prev, rows, cursor: page.next, done: !page.next || rows.length >= MAX_ROWS, more: false };
      });
    } catch (err) {
      if (err?.name !== "AbortError") setState((prev) => ({ ...prev, more: false }));
    } finally {
      busyRef.current = false;
    }
  }, [params]);

  useEffect(() => {
    if (!wallet) return undefined;
    const controller = new AbortController();
    controllerRef.current = controller;
    busyRef.current = false;
    setState({ ...empty, wallet });
    void refresh();
    const timer = window.setInterval(() => void refresh(), REFRESH_MS);
    return () => {
      controller.abort();
      controllerRef.current = null;
      window.clearInterval(timer);
    };
    // `empty` is rebuilt each render from `wallet`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet, refresh]);

  const seenTradeRef = useRef("");
  useEffect(() => {
    if (!lastTradeKey) return undefined;
    const previous = seenTradeRef.current;
    seenTradeRef.current = lastTradeKey;
    if (!previous || previous === lastTradeKey) return undefined;
    const timer = window.setTimeout(() => void refresh(), AFTER_TRADE_MS);
    return () => window.clearTimeout(timer);
  }, [lastTradeKey, refresh]);

  const current = state.wallet === wallet ? state : empty;
  return { ...current, loadMore };
}

/**
 * Closed positions plus resolved ones still holding shares, newest finish first. While older closed
 * pages are unread, resolved positions older than the oldest loaded one wait too, so the list is a
 * clean window of recent history.
 */
export function finishedBetList(closed, openRows, done) {
  const bets = closed.map(finished);
  const oldest = done ? -Infinity : Math.min(...bets.map((bet) => bet.finishedAt ?? Infinity));
  const keys = new Set(bets.map((bet) => bet.key));
  for (const row of openRows) {
    if (!isResolved(row) || !(num(row.current_size) > 0)) continue;
    const bet = finished(row);
    if (keys.has(bet.key) || (bet.finishedAt ?? Infinity) < oldest) continue;
    bets.push(bet);
  }
  return bets.sort(byFinish);
}

function summarize(bets) {
  let pnl = 0;
  let cost = 0;
  let won = 0;
  let lost = 0;
  let best = null;
  let worst = null;
  for (const bet of bets) {
    pnl += bet.pnl;
    cost += bet.cost;
    if (bet.result === "won") won += 1;
    else if (bet.result === "lost") lost += 1;
    if (!best || bet.pnl > best.pnl) best = bet;
    if (!worst || bet.pnl < worst.pnl) worst = bet;
  }
  const decided = won + lost;
  return { pnl, cost, won, lost, winRate: decided ? won / decided : null, roi: cost > 0 ? pnl / cost : null, best, worst };
}

function series(bets) {
  const ordered = bets.filter((bet) => bet.finishedAt != null).sort((a, b) => a.finishedAt - b.finishedAt);
  const step = Math.max(1, Math.ceil(ordered.length / CHART_POINTS));
  const points = [];
  let running = 0;
  ordered.forEach((bet, index) => {
    running += bet.pnl;
    if (index % step === 0 || index === ordered.length - 1) points.push({ t: bet.finishedAt, pnl: running, count: index + 1 });
  });
  return points;
}

function pct(value, digits = 1) {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value * 100).toFixed(digits)}%`;
}

function SummaryTile({ label, value, tone, detail, title }) {
  return (
    <div className="min-w-0 rounded-lg bg-black/[0.03] px-3 py-2.5 dark:bg-white/[0.04]" title={title}>
      <dt className="text-[12px] text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 truncate font-mono text-[18px] font-semibold tabular-nums", tone || "text-foreground")}>{value}</dd>
      {detail ? <dd className="truncate text-[11.5px] text-muted-foreground">{detail}</dd> : null}
    </div>
  );
}

function ChartTooltip({ active, payload, clock }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-md border border-border/70 bg-background px-2.5 py-2 text-[12px] shadow-md">
      <div className="text-muted-foreground">{(clock ? FULL_TIME : FULL_DAY).format(point.t)}</div>
      <div className={cn("font-mono font-semibold tabular-nums", pnlTone(point.pnl))}>{signedUsd(point.pnl)}</div>
      <div className="text-[11px] text-muted-foreground">after {point.count.toLocaleString()} bets</div>
    </div>
  );
}

/** Totals and running PnL across the finished bets loaded so far. */
export function FinishedBetsSummary({ bets, done }) {
  const stats = useMemo(() => summarize(bets), [bets]);
  const points = useMemo(() => series(bets), [bets]);
  const clock = points.length > 1 && points[points.length - 1].t - points[0].t < CLOCK_SPAN_MS;
  const color = stats.pnl >= 0 ? "#10b981" : "#f43f5e";
  const scope = done ? `All ${bets.length.toLocaleString()} finished bets` : `${bets.length.toLocaleString()} most recent finished bets`;
  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-background p-4 shadow-sm">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryTile label="PnL" value={signedUsd(stats.pnl)} tone={pnlTone(stats.pnl)} detail={scope} />
        <SummaryTile
          label="Win rate"
          value={stats.winRate == null ? "—" : `${Math.round(stats.winRate * 100)}%`}
          detail={`${stats.won.toLocaleString()} won · ${stats.lost.toLocaleString()} lost`}
          title="Bets that made money, out of those that didn't break even"
        />
        <SummaryTile label="Return on cost" value={pct(stats.roi)} tone={pnlTone(stats.roi)} detail={`${usd(stats.cost)} staked`} title="PnL over what the shares cost" />
        <SummaryTile label="Biggest win" value={stats.best && stats.best.pnl > 0 ? signedUsd(stats.best.pnl) : "—"} tone="text-emerald-600 dark:text-emerald-400" detail={stats.best?.pnl > 0 ? stats.best.title : ""} title={stats.best?.title} />
        <SummaryTile label="Biggest loss" value={stats.worst && stats.worst.pnl < 0 ? signedUsd(stats.worst.pnl) : "—"} tone="text-rose-600 dark:text-rose-400" detail={stats.worst?.pnl < 0 ? stats.worst.title : ""} title={stats.worst?.title} />
      </dl>
      {points.length > 1 ? (
        <div>
          <p className="mb-1 text-[12px] text-muted-foreground">Running PnL as these bets finished</p>
          <div className="h-[180px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={points} margin={{ top: 6, right: 8, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="finished-bets-pnl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} />
                <XAxis
                  dataKey="t"
                  type="number"
                  scale="time"
                  domain={["dataMin", "dataMax"]}
                  tickFormatter={(t) => (clock ? CLOCK : DAY).format(t)}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={48}
                />
                <YAxis
                  tickFormatter={(v) => USD_AXIS.format(v)}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                />
                <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.4} strokeDasharray="3 3" />
                <Tooltip content={<ChartTooltip clock={clock} />} cursor={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.4 }} />
                <Area type="monotone" dataKey="pnl" stroke={color} strokeWidth={2} fill="url(#finished-bets-pnl)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </div>
  );
}

const COLUMNS = [
  { key: "market", label: "Question", className: "sticky left-0 z-[2] bg-background pl-3 pr-2", dir: "asc", text: true, value: (bet) => bet.title },
  { key: "outcome", label: "Outcome", className: "px-2", dir: "asc", text: true, value: (bet) => bet.outcome },
  { key: "result", label: "Result", className: "px-2", dir: "asc", text: true, value: (bet) => RESULT[bet.result].label, title: "Won or lost money on the bet" },
  { key: "bought", label: "Total bought", className: "px-2", right: true, dir: "desc", value: (bet) => num(bet.total_size), title: "Every share of this outcome bought" },
  { key: "entry", label: "Avg price", className: "px-2", right: true, dir: "desc", value: (bet) => num(bet.avg_price), title: "Average price paid per share" },
  { key: "cost", label: "Cost", className: "px-2", right: true, dir: "desc", value: (bet) => bet.cost, title: "Shares bought times the average price" },
  { key: "pnl", label: "PnL", className: "px-2", right: true, dir: "desc", value: (bet) => bet.pnl, title: "What the bet made or lost, and the return on its cost" },
  { key: "opened", label: "Opened", className: "px-2", right: true, dir: "desc", value: (bet) => bet.openedAt, title: "First buy" },
  { key: "finished", label: "Finished", className: "px-2", right: true, dir: "desc", value: (bet) => bet.finishedAt, title: "Last sale, or when the market resolved" },
  { key: "held", label: "Held", className: "px-2", right: true, dir: "desc", value: heldFor, title: "From the first buy to the finish" },
  { key: "ends", label: "Ends", className: "pl-2 pr-3", right: true, dir: "desc", value: endMs, title: "When the market was scheduled to end" },
];

function BetRow({ bet, top, onPickMarket }) {
  const index = Number(bet.outcome_index);
  const ends = endMs(bet);
  const canOpen = !!(onPickMarket && bet.condition_id);
  const result = RESULT[bet.result];
  return (
    <div role="row" className="group/row absolute inset-x-0 grid items-center border-b border-border/50 text-[12.5px] hover:bg-muted/40" style={{ top, height: ROW_HEIGHT, gridTemplateColumns: GRID }}>
      <div role="cell" className="sticky left-0 z-[1] h-full min-w-0 bg-background">
        <button
          type="button"
          disabled={!canOpen}
          onClick={() => onPickMarket({ kind: "market", conditionId: bet.condition_id, title: bet.title, slug: bet.slug })}
          title={canOpen ? `Open ${bet.title} in the terminal` : bet.title}
          className="flex h-full w-full min-w-0 items-center gap-2 pl-3 pr-2 text-left group-hover/row:bg-muted/40 disabled:cursor-default"
        >
          <MarketIcon src={bet.icon} title={bet.title} />
          <span className="line-clamp-2 text-[12.5px] font-medium leading-snug text-foreground group-hover/row:underline">{bet.title || "—"}</span>
        </button>
      </div>
      <div role="cell" className="min-w-0 px-2">
        {bet.outcome ? (
          <span className={cn("inline-flex max-w-full truncate rounded px-1.5 py-0.5 text-[11px] font-medium leading-none", OUTCOME_TONE[index] || "bg-muted text-foreground")}>{bet.outcome}</span>
        ) : null}
      </div>
      <div role="cell" className="flex items-center gap-1 px-2">
        <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-semibold leading-none", result.tone)}>{result.label}</span>
        {bet.unredeemed ? (
          <span className="size-1.5 rounded-full bg-amber-500" title={`Resolved, with ${usd(num(bet.current_value))} not yet redeemed`} aria-label="Not yet redeemed" />
        ) : null}
      </div>
      <div role="cell" className="px-2 text-right font-mono text-[12px] tabular-nums">{shares(bet.total_size)}</div>
      <div role="cell" className="px-2 text-right font-mono text-[12px] tabular-nums text-muted-foreground">{cents(bet.avg_price)}</div>
      <div role="cell" className="px-2 text-right font-mono text-[12px] tabular-nums text-muted-foreground">{usd(bet.cost)}</div>
      <div role="cell" className="px-2 text-right">
        <div className={cn("font-mono text-[12px] font-semibold tabular-nums", pnlTone(bet.pnl))}>{signedUsd(bet.pnl)}</div>
        {bet.ret != null ? <div className={cn("font-mono text-[10.5px] tabular-nums", pnlTone(bet.ret))}>{pct(bet.ret)}</div> : null}
      </div>
      <div role="cell" className="px-2 text-right text-[12px] tabular-nums text-muted-foreground">{when(bet.openedAt)}</div>
      <div role="cell" className="px-2 text-right text-[12px] tabular-nums text-foreground">{when(bet.finishedAt)}</div>
      <div role="cell" className="px-2 text-right text-[12px] tabular-nums text-muted-foreground">{duration(heldFor(bet))}</div>
      <div role="cell" className="pl-2 pr-3 text-right text-[12px] tabular-nums text-muted-foreground">{ends ? DAY.format(ends) : "—"}</div>
    </div>
  );
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "won", label: "Won" },
  { id: "lost", label: "Lost" },
];

/** Finished bets as a rich table, most recently finished first; older ones load as the reader nears the end. */
export function FinishedBetsTable({ bets, part, onPickMarket }) {
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState(null);
  const counts = useMemo(() => {
    let won = 0;
    let lost = 0;
    for (const bet of bets) {
      if (bet.result === "won") won += 1;
      else if (bet.result === "lost") lost += 1;
    }
    return { all: bets.length, won, lost };
  }, [bets]);
  const shown = useMemo(() => {
    const filtered = filter === "all" ? bets : bets.filter((bet) => bet.result === filter);
    return sort ? sortByColumn(filtered, sort, COLUMNS) : filtered;
  }, [bets, filter, sort]);

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

  const start = Math.max(0, Math.floor(view.top / ROW_HEIGHT) - OVERSCAN);
  const end = Math.min(shown.length, Math.ceil((view.top + view.height) / ROW_HEIGHT) + OVERSCAN);
  const visible = shown.slice(start, end);
  const { loadMore } = part;
  // Filtered or re-sorted lists can sit near their end indefinitely, so only the plain list pages itself.
  const autoLoad = filter === "all" && !sort;
  useEffect(() => {
    if (autoLoad && !part.done && end >= shown.length - NEAR_END_ROWS) void loadMore();
  }, [autoLoad, end, loadMore, part.done, shown.length]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/70 px-3 py-2">
        <div role="group" aria-label="Result" className="flex rounded-md bg-black/[0.04] p-0.5 dark:bg-white/[0.06]">
          {FILTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              aria-pressed={filter === option.id}
              onClick={() => {
                setFilter(option.id);
                toTop();
              }}
              className={cn(
                "rounded px-2.5 py-1 text-[12px] transition-colors",
                filter === option.id ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {option.label}
              <span className="ml-1 tabular-nums text-muted-foreground">{counts[option.id].toLocaleString()}</span>
            </button>
          ))}
        </div>
        {sort ? (
          <button type="button" onClick={clearSort} className="ml-auto rounded px-1 text-[12px] font-medium text-foreground hover:bg-muted">
            Latest first
          </button>
        ) : null}
      </div>
      <div
        ref={scrollRef}
        onScroll={(event) => setView({ top: event.currentTarget.scrollTop, height: event.currentTarget.clientHeight })}
        className="min-h-0 flex-1 overflow-auto overscroll-contain"
      >
        <div role="table" aria-label="Finished bets" className="min-w-max">
          <div role="row" className="sticky top-0 z-[3] grid whitespace-nowrap border-b border-border/70 bg-background text-[11px] font-medium uppercase tracking-wide text-muted-foreground" style={{ gridTemplateColumns: GRID }}>
            {COLUMNS.map((column) => (
              <HeaderCell key={column.key} column={column} sort={sort} onSort={sortBy} onClearSort={clearSort} />
            ))}
          </div>
          {shown.length ? (
            <div role="rowgroup" className="relative" style={{ height: shown.length * ROW_HEIGHT }}>
              {visible.map((bet, offset) => (
                <BetRow key={bet.key} bet={bet} top={(start + offset) * ROW_HEIGHT} onPickMarket={onPickMarket} />
              ))}
            </div>
          ) : (
            <div className="flex h-40 items-center justify-center text-[12px] text-muted-foreground">
              {bets.length ? `No ${filter === "won" ? "winning" : "losing"} bets loaded` : "No finished bets yet."}
            </div>
          )}
        </div>
      </div>
      <p className="flex items-center gap-1.5 border-t border-border/70 px-3 py-1.5 text-[11px] text-muted-foreground">
        {part.more ? <Loader2 className="size-3 animate-spin" aria-hidden /> : null}
        {part.done
          ? `All ${bets.length.toLocaleString()} finished bets${bets.length >= MAX_ROWS ? " we read (the most recent)" : ""}.`
          : part.more
            ? `Loading older bets… ${bets.length.toLocaleString()} so far.`
            : autoLoad
              ? `${bets.length.toLocaleString()} most recent loaded. Scroll down for older ones.`
              : `${bets.length.toLocaleString()} most recent loaded; the ${sort ? "sort" : "filter"} covers what's loaded.`}
        {!part.done && !part.more && !autoLoad ? (
          <button type="button" onClick={() => void loadMore()} className="ml-auto rounded px-1 font-medium text-foreground hover:bg-muted">
            Load older
          </button>
        ) : null}
      </p>
    </div>
  );
}
