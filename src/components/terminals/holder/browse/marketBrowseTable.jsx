"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

const USD_WHOLE = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function usd(value) {
  if (!Number.isFinite(value)) return null;
  return value < 1000 ? USD_WHOLE.format(value) : USD_COMPACT.format(value);
}

function span(abs) {
  if (abs < HOUR) return `${Math.max(1, Math.round(abs / MINUTE))}m`;
  if (abs < DAY) return `${Math.round(abs / HOUR)}h`;
  return `${Math.round(abs / DAY)}d`;
}

function shortDate(ms) {
  const date = new Date(ms);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", ...(sameYear ? {} : { year: "numeric" }) });
}

function chance(price) {
  if (!Number.isFinite(price)) return "—";
  const pct = price * 100;
  if (pct > 0 && pct < 1) return "<1%";
  if (pct < 100 && pct > 99) return ">99%";
  return `${Math.round(pct)}%`;
}

function MarketIcon({ market }) {
  const [broken, setBroken] = useState(false);
  const letter = (market.question || "?").trim().charAt(0).toUpperCase();
  if (!market.icon || broken) {
    return (
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-[12px] font-semibold text-muted-foreground" aria-hidden>
        {letter}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={market.icon} alt="" loading="lazy" onError={() => setBroken(true)} className="size-8 shrink-0 rounded-md bg-muted object-cover" />
  );
}

function Closes({ market, now }) {
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
  const stats = cachedStats(base.conditionId);
  const market = withStats(base, stats);
  /** Gamma leaves volume out when a market hasn't traded. */
  const looked = stats !== undefined || base.volume != null || base.liquidity != null;
  const firstToken = market.tokenIds[0];
  const quote = firstToken ? live.quotes.get(firstToken) : null;
  const price = quote?.price ?? market.prices[0];
  const ticking = quote && quote.dir && now - quote.at < TICK_MS;
  const traded = market.tokenIds.reduce((sum, token) => sum + (live.traded.get(token) || 0), 0);
  const volume24h = market.volume24h == null && !looked ? null : (market.volume24h ?? 0) + traded;
  const elapsed = arrivedAt ? now - arrivedAt : Infinity;
  const arriving = elapsed < ARRIVE_MS;
  const fresh = elapsed < NEW_BADGE_MS;
  const tags = displayTags(market);
  const firstOutcome = market.outcomes[0] || "Yes";
  const winner = resolvedOutcome || market.winner;
  const volumeOrZero = (value) => (looked ? (value ?? 0) : value);
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
            {fresh ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded bg-[#0d99ff]/10 px-1.5 py-px font-semibold text-[#0b7fd4]">
                <span className="size-1.5 animate-pulse rounded-full bg-[#0d99ff]" aria-hidden />
                New
              </span>
            ) : null}
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
      <div role="cell" className="px-2 text-right font-mono text-[12px] tabular-nums">{usd(volumeOrZero(market.volume)) ?? <StatPending looked={looked} />}</div>
      <div role="cell" className="px-2 text-right font-mono text-[12px] tabular-nums">{usd(market.liquidity) ?? <StatPending looked={looked} />}</div>
      <div role="cell" className="truncate px-3 text-[12px]">
        <Closes market={market} now={now} />
      </div>
      <div role="cell" className="truncate pr-3 text-right text-[12px] text-muted-foreground">
        {market.createdAt ? (now - market.createdAt < 30 * DAY ? `${span(Math.max(0, now - market.createdAt))} ago` : shortDate(market.createdAt)) : "—"}
      </div>
    </div>
  );
}

function StatPending({ looked }) {
  return looked ? <span className="text-muted-foreground/60">—</span> : <span className="inline-block h-2.5 w-10 animate-pulse rounded bg-muted" aria-label="Loading" />;
}

/**
 * Markets as a rich table, drawn only where the list is scrolled to. Tells the parent which
 * markets are on screen so it can fetch their stats and stream their prices.
 */
export function MarketBrowseTable({ markets, live, arrivals, resolved, onPick, onVisible, empty, height = 620, resetKey }) {
  const scrollRef = useRef(null);
  const [view, setView] = useState({ top: 0, height });
  const [now, setNow] = useState(() => Date.now());
  const onVisibleRef = useRef(onVisible);
  onVisibleRef.current = onVisible;

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
    if (!el) return;
    el.scrollTop = 0;
    setView((prev) => ({ ...prev, top: 0 }));
  }, [resetKey]);

  useEffect(() => {
    setNow(Date.now());
  }, [live.version, markets]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const start = Math.max(0, Math.floor(view.top / ROW_HEIGHT) - OVERSCAN);
  const end = Math.min(markets.length, Math.ceil((view.top + view.height) / ROW_HEIGHT) + OVERSCAN);
  const visible = markets.slice(start, end);
  const visibleKey = visible.map((market) => market.conditionId).join(",");

  useEffect(() => {
    onVisibleRef.current?.(visible);
    // The id list says everything about which rows are on screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleKey]);

  return (
    <div
      ref={scrollRef}
      onScroll={(event) => setView({ top: event.currentTarget.scrollTop, height: event.currentTarget.clientHeight })}
      className="overflow-auto overscroll-contain"
      style={{ height }}
    >
      <div role="table" aria-rowcount={markets.length} className="min-w-max">
        <div
          role="row"
          className="sticky top-0 z-[1] grid border-b border-border/70 bg-background text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          style={{ gridTemplateColumns: GRID }}
        >
          <div role="columnheader" className="px-3 py-2">Market</div>
          <div role="columnheader" className="px-2 py-2 text-right">Chance</div>
          <div role="columnheader" className="px-2 py-2 text-right" title="Change in the first outcome's price over 24 hours, in points">24h</div>
          <div role="columnheader" className="px-2 py-2 text-right">24h vol</div>
          <div role="columnheader" className="px-2 py-2 text-right">Volume</div>
          <div role="columnheader" className="px-2 py-2 text-right">Liquidity</div>
          <div role="columnheader" className="px-3 py-2">Closes</div>
          <div role="columnheader" className="pr-3 py-2 text-right">Listed</div>
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
