"use client";

import { cn } from "@/lib/utils";
import {
  Closes,
  CompetitiveLine,
  MarketIcon,
  NewBadge,
  StatPending,
  chance,
  listedAgo,
  marketFigures,
  usd,
  useBrowseNow,
  useBrowseScroll,
  useReportVisible,
} from "./marketBrowseTable";

const CARD_HEIGHT = 196;
const CARD_MIN_WIDTH = 248;
const GAP = 12;
const PAD = 12;
const OVERSCAN_ROWS = 2;

function Stat({ label, children, className }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 truncate font-mono text-[12.5px] tabular-nums text-foreground", className)}>{children}</div>
    </div>
  );
}

function MarketCard({ market: base, now, live, arrivedAt, resolvedOutcome, onPick, showQuote }) {
  const { market, looked, quote, price, ticking, traded, volume24h, volume, elapsed, arriving, fresh, tags, firstOutcome, winner } = marketFigures({
    market: base,
    now,
    live,
    arrivedAt,
    resolvedOutcome,
  });
  const secondOutcome = market.outcomes[1] || "No";
  const listed = listedAgo(market, now);
  const open = () => onPick(market);

  return (
    <div
      role="listitem"
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
        "flex min-w-0 cursor-pointer flex-col rounded-xl border border-border/70 bg-background p-3.5 text-[12px] outline-none transition-[border-color,box-shadow] hover:border-foreground/25 hover:shadow-sm focus-visible:border-foreground/40",
        arriving && "animate-row-arrive",
      )}
      style={{ height: CARD_HEIGHT, ...(arriving ? { animationDelay: `-${elapsed}ms` } : null) }}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <MarketIcon market={market} className="size-9" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[13px] font-semibold leading-[18px] text-foreground" title={market.question}>
            {market.question || market.slug}
          </p>
          {showQuote ? (
            <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
              {fresh ? <NewBadge /> : null}
              <CompetitiveLine market={market} withVolume={false} />
            </div>
          ) : (
            <div className="mt-1 flex min-w-0 items-center gap-1.5 overflow-hidden text-[11px] text-muted-foreground [mask-image:linear-gradient(to_right,black_85%,transparent)]">
              {fresh ? <NewBadge /> : null}
              {market.eventTitle && market.eventTitle !== market.question ? (
                <span className="max-w-full shrink-0 truncate" title={market.eventTitle}>
                  {market.eventTitle}
                </span>
              ) : null}
              {tags.slice(0, 2).map((tag) => (
                <span key={tag} className="shrink-0 rounded bg-muted px-1.5 py-px leading-[14px]">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto flex items-end justify-between gap-2">
        <div
          key={ticking ? quote.at : "still"}
          className={cn("-mx-1 rounded-md px-1", ticking && (quote.dir > 0 ? "animate-tick-up" : "animate-tick-down"))}
          style={ticking ? { animationDelay: `-${now - quote.at}ms` } : undefined}
        >
          {winner ? (
            <span
              title={`${winner} won`}
              className="inline-block max-w-[150px] truncate rounded bg-emerald-500/10 px-1.5 py-0.5 text-[12px] font-semibold text-emerald-700 dark:text-emerald-300"
            >
              {winner} won
            </span>
          ) : (
            <div className="flex items-baseline gap-1.5">
              <span className="font-mono text-[22px] font-semibold leading-none tabular-nums text-foreground">{chance(price)}</span>
              {Number.isFinite(price) ? (
                <span className="max-w-[72px] truncate text-[11px] text-muted-foreground">{firstOutcome}</span>
              ) : (
                <span className="text-[11px] text-muted-foreground">No trades yet</span>
              )}
              {market.change24h != null && market.change24h !== 0 ? (
                <span className={cn("font-mono text-[11px] tabular-nums", market.change24h > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")}>
                  {market.change24h > 0 ? "▲" : "▼"}
                  {Math.abs(Math.round(market.change24h * 100))}
                </span>
              ) : null}
            </div>
          )}
        </div>
        <div className="min-w-0 text-right text-[11.5px] leading-4">
          <div className="truncate">
            <Closes market={market} now={now} />
          </div>
          {listed ? <div className="truncate text-[10.5px] text-muted-foreground">Listed {listed}</div> : null}
        </div>
      </div>

      {winner ? (
        <div className="mt-2 h-1.5" aria-hidden />
      ) : (
        <div className="mt-2" aria-hidden>
          <div className={cn("h-1.5 overflow-hidden rounded-full", Number.isFinite(price) ? "bg-rose-500/20" : "bg-muted")}>
            {Number.isFinite(price) ? <div className="h-full rounded-full bg-emerald-500 transition-[width] duration-500" style={{ width: `${price * 100}%` }} /> : null}
          </div>
        </div>
      )}
      {!winner && Number.isFinite(price) ? (
        <div className="mt-1 flex justify-between gap-2 text-[10px] text-muted-foreground">
          <span className="truncate">{firstOutcome}</span>
          <span className="truncate">{secondOutcome}</span>
        </div>
      ) : (
        <div className="mt-1 h-[15px]" aria-hidden />
      )}

      <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-border/60 pt-2.5">
        <Stat label="24h vol" className={traded > 0 ? "text-emerald-700 dark:text-emerald-300" : undefined}>
          {usd(volume24h) ?? <StatPending looked={looked} />}
        </Stat>
        <Stat label="Volume">{usd(volume) ?? <StatPending looked={looked} />}</Stat>
        <Stat label="Liquidity">{usd(market.liquidity) ?? <StatPending looked={looked} />}</Stat>
      </div>
    </div>
  );
}

/**
 * Markets as a grid of cards, drawn only where the grid is scrolled to. Same live data as the
 * table: prices tick, new markets flash in, stats load as cards come into view.
 */
export function MarketBrowseCards({ markets, live, arrivals, resolved, onPick, onVisible, empty, height = 620, resetKey, showQuote }) {
  const { scrollRef, view, onScroll } = useBrowseScroll({ height, resetKey });
  const now = useBrowseNow(live, markets);

  const columns = Math.max(1, Math.floor((view.width - PAD * 2 + GAP) / (CARD_MIN_WIDTH + GAP)));
  const rowHeight = CARD_HEIGHT + GAP;
  const rows = Math.ceil(markets.length / columns);
  const firstRow = Math.max(0, Math.floor((view.top - PAD) / rowHeight) - OVERSCAN_ROWS);
  const lastRow = Math.min(rows, Math.ceil((view.top + view.height) / rowHeight) + OVERSCAN_ROWS);
  const visible = view.width ? markets.slice(firstRow * columns, lastRow * columns) : [];
  useReportVisible(visible, onVisible);

  const rowItems = [];
  for (let row = firstRow; row < lastRow && view.width; row += 1) {
    rowItems.push({ row, markets: markets.slice(row * columns, (row + 1) * columns) });
  }

  return (
    <div ref={scrollRef} onScroll={onScroll} className="overflow-auto overscroll-contain bg-muted/30" style={{ height }}>
      {markets.length ? (
        <div role="list" aria-label="Markets" className="relative" style={{ height: rows * rowHeight - GAP + PAD * 2 }}>
          {rowItems.map(({ row, markets: cards }) => (
            <div
              key={row}
              className="absolute grid"
              style={{ top: PAD + row * rowHeight, left: PAD, right: PAD, gap: GAP, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {cards.map((market) => (
                <MarketCard
                  key={market.conditionId}
                  market={market}
                  now={now}
                  live={live}
                  arrivedAt={arrivals.get(market.conditionId)}
                  resolvedOutcome={resolved.get(market.conditionId)}
                  onPick={onPick}
                  showQuote={showQuote}
                />
              ))}
            </div>
          ))}
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center gap-2 text-[12px] text-muted-foreground">{empty}</div>
      )}
    </div>
  );
}
