"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { DOWN, EASE, UP, marketVarsClassName, usePrefersReducedMotion } from "@/components/spectrumui/charts/chart-engine";
import { centsDigits } from "@/lib/visualizations/datasetDescriptor";

const EMPTY_LEVELS = [];

const KEYFRAMES = `
@keyframes spectrum-ob-fade {
  from { opacity: 0.35; }
  to { opacity: 1; }
}
@keyframes spectrum-ob-flash {
  from { opacity: 0.42; }
  to { opacity: 0; }
}
`;

function formatBookPrice(value, digits = 1) {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) <= 1.5) return `${(value * 100).toFixed(digits)}¢`;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function compactSize(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  if (Math.abs(n) >= 1000) {
    return new Intl.NumberFormat("en-US", {
      notation: "compact",
      maximumFractionDigits: n >= 100 ? 1 : 2,
    }).format(n);
  }
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: Number.isInteger(n) ? 0 : 2,
  }).format(n);
}

function BookRow({ row, maxTotal, highlighted, flashed, reduce, onEnter, digits }) {
  const color = row.side === "bid" ? UP : DOWN;
  const depth = Math.max(0.02, row.total / maxTotal);

  return (
    <li
      onPointerEnter={onEnter}
      className="relative flex h-[22px] cursor-default items-center px-2 font-mono text-[11px] tabular-nums"
    >
      <span
        aria-hidden
        className="absolute inset-y-px right-1 rounded-[3px]"
        style={{
          width: `calc(${(depth * 100).toFixed(2)}% - 4px)`,
          background: color,
          opacity: highlighted ? 0.28 : 0.13,
          transition: reduce ? undefined : `opacity 140ms ease-out, width 320ms ${EASE}`,
        }}
      />
      {flashed && !reduce ? (
        <span
          key={`${row.side}-${row.price}-${row.size}`}
          aria-hidden
          className="absolute inset-y-0 left-0 right-0"
          style={{ background: color, animation: "spectrum-ob-flash 520ms ease-out forwards" }}
        />
      ) : null}
      <span className="relative z-10 w-[38%] text-left" style={{ color }}>
        {formatBookPrice(row.price, digits)}
      </span>
      <span className="relative z-10 w-[31%] text-right text-neutral-700 dark:text-neutral-300">
        {compactSize(row.size)}
      </span>
      <span className="relative z-10 w-[31%] text-right text-neutral-400 dark:text-neutral-500">
        {compactSize(row.total)}
      </span>
    </li>
  );
}

function levelKey(side, level) {
  return `${side}:${level.price}`;
}

/**
 * Spectrum order-book ladder. `live` flashes levels whose size changed on the latest book.
 * It does not invent ticks.
 */
export function OrderBookChart({
  book,
  symbol = "",
  live = false,
  status = "ready",
  emptyLabel = "This order book has no resting size yet.",
  className,
}) {
  const reduce = usePrefersReducedMotion();
  const bids = book?.bids || EMPTY_LEVELS;
  const asks = book?.asks || EMPTY_LEVELS;
  const mid = Number(book?.mid) || 0;
  const [fullBook, setFullBook] = React.useState(true);
  const [hovered, setHovered] = React.useState(null);
  const [flashed, setFlashed] = React.useState(() => new Set());
  const previous = React.useRef(new Map());
  const scrollerRef = React.useRef(null);
  const spreadRef = React.useRef(null);

  React.useEffect(() => {
    const next = new Map();
    const changed = new Set();
    const visit = (side, levels) => {
      levels.forEach((level, index) => {
        const key = levelKey(side, level);
        next.set(key, level.size);
        const prior = previous.current.get(key);
        if (!live || previous.current.size === 0) return;
        if (prior == null || prior !== level.size) changed.add(`${side}-${index}`);
      });
    };
    visit("bid", bids);
    visit("ask", asks);
    previous.current = next;
    const signature = [...changed].sort().join("|");
    setFlashed((current) => {
      const previousSignature = [...current].sort().join("|");
      return previousSignature === signature ? current : changed;
    });
  }, [asks, bids, live]);

  React.useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    const spread = spreadRef.current;
    if (!scroller || !spread) return;
    const top = spread.offsetTop - scroller.clientHeight / 2 + spread.clientHeight / 2;
    scroller.scrollTop = Math.max(0, top);
  }, [asks.length, bids.length]);

  const clipped = bids.length > 20 || asks.length > 20;
  const bidView = fullBook ? bids : bids.slice(0, 20);
  const askView = fullBook ? asks : asks.slice(0, 20);
  const digits = centsDigits([...bidView, ...askView].map((level) => level.price));
  const maxTotal = Math.max(bidView[bidView.length - 1]?.total ?? 1, askView[askView.length - 1]?.total ?? 1, 1);
  const bestBid = bids[0]?.price ?? mid;
  const bestAsk = asks[0]?.price ?? mid;
  const spread = Math.max(0, bestAsk - bestBid);
  const spreadPct = mid ? (spread / mid) * 100 : 0;
  const askRows = askView.map((level, index) => ({ ...level, side: "ask", index })).reverse();
  const bidRows = bidView.map((level, index) => ({ ...level, side: "bid", index }));
  const empty = status === "empty" || (!bids.length && !asks.length);
  const isHighlighted = (row) => hovered != null && hovered.side === row.side && row.index <= hovered.index;

  return (
    <div
      data-sheet-chart=""
      className={cn("flex h-full min-h-0 w-full flex-1 flex-col", marketVarsClassName, className)}
      onPointerLeave={() => setHovered(null)}
    >
      <style>{KEYFRAMES}</style>
      <div className="flex shrink-0 items-center justify-between px-2.5 py-2">
        <span className="min-w-0 truncate font-mono text-[11px] font-medium tracking-wide text-neutral-950 dark:text-white">
          {symbol ? `${symbol} ` : ""}
          <span className="text-neutral-400">Order book</span>
        </span>
        {clipped ? (
          <button type="button" onClick={() => setFullBook((on) => !on)} className="font-mono text-[10px] text-neutral-500">
            {fullBook ? "Nearest 20" : "Full book"}
          </button>
        ) : null}
        {live ? (
          <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[9px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
            <span
              className="size-1.5 rounded-full"
              style={{
                background: UP,
                animation: reduce ? undefined : "spectrum-ob-fade 1.1s ease-in-out infinite alternate",
              }}
            />
            Live
          </span>
        ) : null}
      </div>
      {empty ? (
        <p className="px-3 text-[12px] text-muted-foreground">{emptyLabel}</p>
      ) : (
        <div ref={scrollerRef} className="min-h-0 flex-1 overflow-auto">
          <div className="flex px-2 py-1.5 font-mono text-[9.5px] uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            <span className="w-[38%]">Price</span>
            <span className="w-[31%] text-right">Size</span>
            <span className="w-[31%] text-right">Total</span>
          </div>
          <ul>
            {askRows.map((row) => (
              <BookRow
                key={`ask-${row.price}`}
                row={row}
                maxTotal={maxTotal}
                highlighted={isHighlighted(row)}
                flashed={flashed.has(`ask-${row.index}`)}
                reduce={reduce}
                onEnter={() => setHovered({ side: "ask", index: row.index })}
                digits={digits}
              />
            ))}
          </ul>
          <div
            ref={spreadRef}
            className="my-1 flex items-center justify-between border-y border-black/6 bg-black/[0.02] px-2 py-1.5 font-mono text-[11px] tabular-nums dark:border-white/8 dark:bg-white/[0.03]"
          >
            <span className="font-medium text-neutral-950 dark:text-white">{formatBookPrice(mid, digits)}</span>
            <span className="text-[10px] text-neutral-400 dark:text-neutral-500">
              spread {formatBookPrice(spread, Math.max(digits, 1))} · {spreadPct.toFixed(2)}%
            </span>
          </div>
          <ul className="pb-1">
            {bidRows.map((row) => (
              <BookRow
                key={`bid-${row.price}`}
                row={row}
                maxTotal={maxTotal}
                highlighted={isHighlighted(row)}
                flashed={flashed.has(`bid-${row.index}`)}
                reduce={reduce}
                onEnter={() => setHovered({ side: "bid", index: row.index })}
                digits={digits}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
