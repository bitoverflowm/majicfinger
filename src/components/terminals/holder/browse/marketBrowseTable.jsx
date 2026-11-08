"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { cachedStats, closeAt, displayTags, withStats } from "./marketBrowseFeeds";

const ROW_HEIGHT = 56;
const OVERSCAN = 8;
/** Matches the `row-arrive` animation in tailwind.config.js. */
const ARRIVE_MS = 3000;
/** Matches the `tick-up` / `tick-down` animations. */
const TICK_MS = 1200;
/** How long a market from the live feed keeps its "New" badge. */
const NEW_BADGE_MS = 10 * 60_000;
/** A game that started within this long is shown as being played. */
const IN_PLAY_MS = 4 * 60 * 60_000;

const USD_COMPACT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const GRID = "minmax(300px, 1fr) 100px 56px 76px 76px 76px 128px 76px";

const COLUMNS = [
  { key: "market", label: "Market", className: "px-3" },
  { key: "chance", label: "Chance", className: "px-2", right: true },
  { key: "change", label: "24h", className: "px-2", right: true, title: "Change in the first outcome's price over 24 hours, in points" },
  { key: "vol24", label: "24h vol", className: "px-2", right: true },
  { key: "volume", label: "Volume", className: "px-2", right: true },
  { key: "liquidity", label: "Liquidity", className: "px-2", right: true },
  { key: "closes", label: "Closes", className: "px-3" },
  { key: "listed", label: "Listed", className: "pr-3", right: true },
];

/** The active sort's arrow. Click reverses it; hovering offers to remove the sort, with a confirm step. */
function SortArrow({ dir, alignRight, onReverse, onClear }) {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const Icon = dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        setOpen(false);
        setConfirming(false);
      }}
    >
      <button
        type="button"
        onClick={onReverse}
        aria-label={dir === "asc" ? "Sorted ascending, click to reverse" : "Sorted descending, click to reverse"}
        className="inline-flex size-4 items-center justify-center rounded text-foreground hover:bg-muted"
      >
        <Icon className="size-3" aria-hidden />
      </button>
      {open ? (
        <span className={cn("absolute top-full z-10 pt-1 font-normal normal-case tracking-normal", alignRight ? "right-0" : "left-0")}>
          <span className="block w-40 rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-lg">
            {confirming ? (
              <button
                type="button"
                onClick={onClear}
                className="flex w-full items-center gap-2.5 rounded-md bg-muted px-2 py-2 text-[13px] text-red-500"
              >
                <Check className="size-4 shrink-0" aria-hidden />
                Confirm
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-[13px] text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                <Trash2 className="size-4 shrink-0" aria-hidden />
                Remove sort
              </button>
            )}
          </span>
        </span>
      ) : null}
    </span>
  );
}

export function HeaderCell({ column, sort, onSort, onClearSort }) {
  const active = sort?.key === column.key;
  return (
    <div
      role="columnheader"
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
      title={column.title}
      className={cn("flex items-center gap-1 py-2", column.right && "justify-end", column.className)}
    >
      {onSort ? (
        <button
          type="button"
          onClick={() => onSort(column.key)}
          className={cn("uppercase tracking-wide transition-colors hover:text-foreground", active && "text-foreground")}
        >
          {column.label}
        </button>
      ) : (
        column.label
      )}
      {active && onSort ? <SortArrow dir={sort.dir} alignRight={column.right} onReverse={() => onSort(column.key)} onClear={onClearSort} /> : null}
    </div>
  );
}

const USD_WHOLE = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function usd(value) {
  if (!Number.isFinite(value)) return null;
  return value < 1000 ? USD_WHOLE.format(value) : USD_COMPACT.format(value);
}

export function span(abs) {
  if (abs < HOUR) return `${Math.max(1, Math.round(abs / MINUTE))}m`;
  if (abs < DAY) return `${Math.round(abs / HOUR)}h`;
  return `${Math.round(abs / DAY)}d`;
}

export function shortDate(ms) {
  const date = new Date(ms);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
}

export function chance(price) {
  if (!Number.isFinite(price)) return "—";
  const pct = price * 100;
  if (pct > 0 && pct < 1) return "<1%";
  if (pct < 100 && pct > 99) return ">99%";
  return `${Math.round(pct)}%`;
}

export function listedAgo(market, now) {
  if (!market.createdAt) return null;
  return now - market.createdAt < 30 * DAY ? `${span(Math.max(0, now - market.createdAt))} ago` : shortDate(market.createdAt);
}

export function MarketIcon({ market, className }) {
  const [broken, setBroken] = useState(false);
  const letter = (market.question || "?").trim().charAt(0).toUpperCase();
  if (!market.icon || broken) {
    return (
      <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-[12px] font-semibold text-muted-foreground", className)} aria-hidden>
        {letter}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={market.icon} alt="" loading="lazy" onError={() => setBroken(true)} className={cn("size-8 shrink-0 rounded-md bg-muted object-cover", className)} />
  );
}

/** Everything a row or card shows for one market: cached stats, the live quote and trades, badges. */
export function marketFigures({ market: base, now, live, arrivedAt, resolvedOutcome }) {
  const stats = cachedStats(base.conditionId);
  const market = withStats(base, stats);
  /** Gamma leaves volume out when a market hasn't traded. */
  const looked = stats !== undefined || base.volume != null || base.liquidity != null;
  const firstToken = market.tokenIds[0];
  const quote = firstToken ? live.quotes.get(firstToken) : null;
  const price = quote?.price ?? market.prices[0];
  const traded = market.tokenIds.reduce((sum, token) => sum + (live.traded.get(token) || 0), 0);
  const elapsed = arrivedAt ? now - arrivedAt : Infinity;
  return {
    market,
    looked,
    quote,
    price,
    ticking: !!(quote && quote.dir && now - quote.at < TICK_MS),
    traded,
    volume24h: market.volume24h == null && !looked ? null : (market.volume24h ?? 0) + traded,
    volume: looked ? (market.volume ?? 0) : market.volume,
    elapsed,
    arriving: elapsed < ARRIVE_MS,
    fresh: elapsed < NEW_BADGE_MS,
    tags: displayTags(market),
    firstOutcome: market.outcomes[0] || "Yes",
    winner: resolvedOutcome || market.winner,
  };
}

export function NewBadge() {
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded bg-[#0d99ff]/10 px-1.5 py-px font-semibold text-[#0b7fd4]">
      <span className="size-1.5 animate-pulse rounded-full bg-[#0d99ff]" aria-hidden />
      New
    </span>
  );
}

export function Closes({ market, now }) {
  if (market.closed || market.closedAt) {
    const at = market.closedAt;
    return (
      <span className="text-muted-foreground">
        {at ? (now - at < 30 * DAY ? `Resolved ${span(now - at)} ago` : `Resolved ${shortDate(at)}`) : "Resolved"}
      </span>
    );
  }
  const at = closeAt(market);
  if (!at) return <span className="text-muted-foreground">No end date</span>;
  const diff = at - now;
  if (market.gameAt && now >= market.gameAt && now - market.gameAt < IN_PLAY_MS) {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-rose-600 dark:text-rose-400">
        <span className="size-1.5 animate-pulse rounded-full bg-rose-500" aria-hidden />
        In play
      </span>
    );
  }
  if (diff < 0) return <span className="text-amber-700 dark:text-amber-300">Awaiting result</span>;
  const soon = diff < DAY;
  return (
    <span className={soon ? "font-medium text-foreground" : "text-muted-foreground"} title={new Date(at).toLocaleString()}>
      {diff < 30 * DAY ? `in ${span(diff)}` : shortDate(at)}
    </span>
  );
}

function MarketRow({ market: base, top, now, live, arrivedAt, resolvedOutcome, onPick }) {
  const { market, looked, quote, price, ticking, traded, volume24h, volume, elapsed, arriving, fresh, tags, firstOutcome, winner } = marketFigures({
    market: base,
    now,
    live,
    arrivedAt,
    resolvedOutcome,
  });
  const open = () => onPick(market);

  return (
    <div
      role="row"
      tabIndex={0}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      }}
      aria-label={`Open ${market.question}`}
      className={cn(
        "group/row absolute inset-x-0 grid cursor-pointer items-center border-b border-border/50 text-[12.5px] outline-none hover:bg-muted/40 focus-visible:bg-muted/60",
        arriving && "animate-row-arrive",
      )}
      style={{ top, height: ROW_HEIGHT, gridTemplateColumns: GRID, ...(arriving ? { animationDelay: `-${elapsed}ms` } : null) }}
    >
      <div role="cell" className="flex min-w-0 items-center gap-3 pl-3 pr-2">
        <MarketIcon market={market} />
        <span className="min-w-0">
          <span className="block truncate font-medium text-foreground" title={market.question}>
            {market.question || market.slug}
          </span>
          <span className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
            {fresh ? <NewBadge /> : null}
            {market.eventTitle && market.eventTitle !== market.question ? (
              <span className="truncate">{market.eventTitle}</span>
            ) : null}
            {tags.map((tag) => (
              <span key={tag} className="shrink-0 rounded bg-muted px-1.5 py-px leading-[14px]">
                {tag}
              </span>
            ))}
          </span>
        </span>
      </div>
      <div
        key={ticking ? quote.at : "still"}
        role="cell"
        className={cn("flex h-full flex-col items-end justify-center px-2", ticking && (quote.dir > 0 ? "animate-tick-up" : "animate-tick-down"))}
        style={ticking ? { animationDelay: `-${now - quote.at}ms` } : undefined}
      >
        {winner ? (
          <span
            title={`${winner} won`}
            className="max-w-full truncate whitespace-nowrap rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300"
          >
            {winner} won
          </span>
        ) : (
          <>
            <span className="font-mono text-[13px] font-semibold tabular-nums text-foreground">{chance(price)}</span>
            <span className="mt-1 flex items-center gap-1 whitespace-nowrap text-[10px] text-muted-foreground">
              {Number.isFinite(price) ? (
                <>
                  {firstOutcome !== "Yes" ? <span className="max-w-[40px] truncate">{firstOutcome}</span> : null}
                  <span className="h-1 w-10 shrink-0 overflow-hidden rounded-full bg-rose-500/25" aria-hidden>
                    <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${price * 100}%` }} />
                  </span>
                </>
              ) : (
                "No trades yet"
              )}
            </span>
          </>
        )}
      </div>
      <div role="cell" className="px-2 text-right font-mono text-[12px] tabular-nums">
        {market.change24h == null || winner ? (
          <span className="text-muted-foreground/60">—</span>
        ) : (
          <span className={market.change24h > 0 ? "text-emerald-600 dark:text-emerald-400" : market.change24h < 0 ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"}>
            {market.change24h > 0 ? "+" : ""}
            {Math.round(market.change24h * 100)}
          </span>
        )}
      </div>
      <div role="cell" className={cn("px-2 text-right font-mono text-[12px] tabular-nums", traded > 0 && "text-foreground")}>
        {usd(volume24h) ?? <StatPending looked={looked} />}
      </div>
      <div role="cell" className="px-2 text-right font-mono text-[12px] tabular-nums">{usd(volume) ?? <StatPending looked={looked} />}</div>
      <div role="cell" className="px-2 text-right font-mono text-[12px] tabular-nums">{usd(market.liquidity) ?? <StatPending looked={looked} />}</div>
      <div role="cell" className="truncate px-3 text-[12px]">
        <Closes market={market} now={now} />
      </div>
      <div role="cell" className="truncate pr-3 text-right text-[12px] text-muted-foreground">
        {listedAgo(market, now) ?? "—"}
      </div>
    </div>
  );
}

export function StatPending({ looked }) {
  return looked ? <span className="text-muted-foreground/60">—</span> : <span className="inline-block h-2.5 w-10 animate-pulse rounded bg-muted" aria-label="Loading" />;
}

/** Where a windowed list is scrolled to and how big it is; back to the top whenever `resetKey` changes. */
export function useBrowseScroll({ height, resetKey }) {
  const scrollRef = useRef(null);
  const [view, setView] = useState({ top: 0, height, width: 0 });

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const measure = () => setView({ top: el.scrollTop, height: el.clientHeight, width: el.clientWidth });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = 0;
    setView((prev) => ({ ...prev, top: 0 }));
  }, [resetKey]);

  const onScroll = (event) => {
    const el = event.currentTarget;
    setView({ top: el.scrollTop, height: el.clientHeight, width: el.clientWidth });
  };
  return { scrollRef, view, onScroll };
}

/** The clock relative times and flashes are drawn against: every live update, and every 30s. */
export function useBrowseNow(live, markets) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    setNow(Date.now());
  }, [live.version, markets]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

/** Tells the parent which markets are drawn, so it can fetch their stats and stream their prices. */
export function useReportVisible(visible, onVisible) {
  const onVisibleRef = useRef(onVisible);
  onVisibleRef.current = onVisible;
  const visibleKey = visible.map((market) => market.conditionId).join(",");
  useEffect(() => {
    onVisibleRef.current?.(visible);
    // The id list says everything about which markets are on screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKey]);
}

/**
 * Markets as a rich table, drawn only where the list is scrolled to. Tells the parent which
 * markets are on screen so it can fetch their stats and stream their prices.
 */
export function MarketBrowseTable({ markets, live, arrivals, resolved, onPick, onVisible, empty, height = 620, resetKey, sort, onSort, onClearSort }) {
  const { scrollRef, view, onScroll } = useBrowseScroll({ height, resetKey });
  const now = useBrowseNow(live, markets);

  const start = Math.max(0, Math.floor(view.top / ROW_HEIGHT) - OVERSCAN);
  const end = Math.min(markets.length, Math.ceil((view.top + view.height) / ROW_HEIGHT) + OVERSCAN);
  const visible = markets.slice(start, end);
  useReportVisible(visible, onVisible);

  return (
    <div ref={scrollRef} onScroll={onScroll} className="overflow-auto overscroll-contain" style={{ height }}>
      <div role="table" aria-rowcount={markets.length} className="min-w-max">
        <div
          role="row"
          className="sticky top-0 z-[1] grid border-b border-border/70 bg-background text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          style={{ gridTemplateColumns: GRID }}
        >
          {COLUMNS.map((column) => (
            <HeaderCell key={column.key} column={column} sort={sort} onSort={onSort} onClearSort={onClearSort} />
          ))}
        </div>
        {markets.length ? (
          <div role="rowgroup" className="relative" style={{ height: markets.length * ROW_HEIGHT }}>
            {visible.map((market, offset) => (
              <MarketRow
                key={market.conditionId}
                market={market}
                top={(start + offset) * ROW_HEIGHT}
                now={now}
                live={live}
                arrivedAt={arrivals.get(market.conditionId)}
                resolvedOutcome={resolved.get(market.conditionId)}
                onPick={onPick}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center gap-2 text-[12px] text-muted-foreground">{empty}</div>
        )}
      </div>
    </div>
  );
}
