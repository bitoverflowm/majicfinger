"use client";

import { useEffect, useRef, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { HeaderCell, shortDate, span, useBrowseScroll } from "./marketBrowseTable";

const ROW_HEIGHT = 56;
const OVERSCAN = 8;
const CARD_HEIGHT = 178;
const CARD_MIN_WIDTH = 248;
const GAP = 12;
const PAD = 12;
/** Ask for the next page when the list is scrolled this close to the end. */
const NEAR_END = 30;

const USD_COMPACT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const USD_WHOLE = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const COMPACT = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const DAY = 24 * 60 * 60_000;

function usd(value) {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  return abs < 1000 ? USD_WHOLE.format(value) : USD_COMPACT.format(value);
}

function signedUsd(value) {
  if (!Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${usd(Math.abs(value))}`;
}

function shortAddress(address) {
  return address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "";
}

function ago(ms, now) {
  if (!ms) return "—";
  return now - ms < 30 * DAY ? `${span(Math.max(0, now - ms))} ago` : shortDate(ms);
}

/** Return on a winning position: what it paid against what it cost. */
export function winReturn(row) {
  return Number.isFinite(row.cost) && row.cost > 0 && Number.isFinite(row.payout) ? row.payout / row.cost - 1 : null;
}

function pnlTone(value) {
  if (!Number.isFinite(value) || value === 0) return "text-foreground";
  return value > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
}

function hue(address) {
  let hash = 0;
  for (let index = 2; index < Math.min(address.length, 14); index += 1) hash = (hash * 31 + address.charCodeAt(index)) % 360;
  return hash;
}

function Avatar({ row, className }) {
  const [broken, setBroken] = useState(false);
  if (row.image && !broken) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={row.image} alt="" loading="lazy" onError={() => setBroken(true)} className={cn("size-8 shrink-0 rounded-full bg-muted object-cover", className)} />;
  }
  const h = hue(row.address);
  return (
    <span
      aria-hidden
      className={cn("flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold text-white", className)}
      style={{ background: `linear-gradient(135deg, hsl(${h} 70% 55%), hsl(${(h + 50) % 360} 70% 45%))` }}
    >
      {(row.name || row.address.slice(2)).charAt(0).toUpperCase()}
    </span>
  );
}

function TraderName({ row }) {
  return (
    <span className="min-w-0">
      <span className="flex min-w-0 items-center gap-1">
        <span className={cn("truncate font-medium text-foreground", !row.name && "font-mono text-[12px]")} title={row.name || row.address}>
          {row.name || shortAddress(row.address)}
        </span>
        {row.verified ? <BadgeCheck className="size-3.5 shrink-0 text-[#0d99ff]" aria-label="Verified" /> : null}
      </span>
      <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
        {row.name ? shortAddress(row.address) : null}
        {row.xHandle ? <span className="ml-1.5 font-sans">@{row.xHandle}</span> : null}
      </span>
    </span>
  );
}

function RankBadge({ rank, className }) {
  if (!Number.isFinite(rank)) return <span className="text-muted-foreground/60">—</span>;
  const top = rank <= 3;
  return (
    <span
      className={cn(
        "inline-flex min-w-7 justify-center rounded-md px-1.5 py-0.5 font-mono text-[11.5px] font-semibold tabular-nums",
        top ? "bg-amber-500/15 text-amber-700 dark:text-amber-300" : "text-muted-foreground",
        className,
      )}
    >
      {rank.toLocaleString()}
    </span>
  );
}

const LEADER_GRID = "64px minmax(260px, 1fr) 140px 140px";
const LEADER_COLUMNS = [
  { key: "rank", label: "Rank", className: "pl-3" },
  { key: "trader", label: "Trader", className: "px-2" },
  { key: "pnl", label: "PnL", className: "px-3", right: true },
  { key: "volume", label: "Volume", className: "px-3", right: true, title: "Traded volume across both sides, in shares" },
];

const WINNER_GRID = "56px minmax(200px, 1fr) minmax(220px, 1.2fr) 108px 92px 92px 76px 96px";
const WINNER_COLUMNS = [
  { key: "rank", label: "Rank", className: "pl-3" },
  { key: "trader", label: "Trader", className: "px-2" },
  { key: "market", label: "Market", className: "px-2" },
  { key: "pnl", label: "PnL", className: "px-2", right: true },
  { key: "cost", label: "Cost", className: "px-2", right: true, title: "What the winning position cost" },
  { key: "payout", label: "Payout", className: "px-2", right: true, title: "What it was worth at resolution" },
  { key: "return", label: "Return", className: "px-2", right: true },
  { key: "resolved", label: "Resolved", className: "pr-3", right: true },
];

function rowProps(row, onPick) {
  return {
    role: "row",
    tabIndex: 0,
    onClick: () => onPick(row),
    onKeyDown: (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onPick(row);
      }
    },
    "aria-label": `Open ${row.name || row.address}`,
  };
}

function MarketLink({ row, onPickMarket, className }) {
  const title = row.eventTitle || "Combo";
  if (!row.conditionId) {
    return (
      <span className={cn("min-w-0", className)}>
        <span className="block truncate text-foreground" title={title}>
          {title}
        </span>
        {row.kind === "combo" ? <span className="text-[11px] text-muted-foreground">Combo</span> : null}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onPickMarket(row);
      }}
      title={`Open ${title}`}
      className={cn("block min-w-0 max-w-full truncate text-left text-foreground underline-offset-2 hover:underline", className)}
    >
      {title}
    </button>
  );
}

function LeaderRow({ row, top, onPick }) {
  return (
    <div
      {...rowProps(row, onPick)}
      className="absolute inset-x-0 grid cursor-pointer items-center border-b border-border/50 text-[12.5px] outline-none hover:bg-muted/40 focus-visible:bg-muted/60"
      style={{ top, height: ROW_HEIGHT, gridTemplateColumns: LEADER_GRID }}
    >
      <div role="cell" className="pl-3">
        <RankBadge rank={row.rank} />
      </div>
      <div role="cell" className="flex min-w-0 items-center gap-2.5 px-2">
        <Avatar row={row} />
        <TraderName row={row} />
      </div>
      <div role="cell" className={cn("px-3 text-right font-mono text-[13px] font-semibold tabular-nums", pnlTone(row.pnl))}>
        {signedUsd(row.pnl)}
      </div>
      <div role="cell" className="px-3 text-right font-mono text-[12px] tabular-nums text-foreground">
        {Number.isFinite(row.volume) ? COMPACT.format(row.volume) : "—"}
      </div>
    </div>
  );
}

function WinnerRow({ row, top, now, onPick, onPickMarket }) {
  const ret = winReturn(row);
  return (
    <div
      {...rowProps(row, onPick)}
      className="absolute inset-x-0 grid cursor-pointer items-center border-b border-border/50 text-[12.5px] outline-none hover:bg-muted/40 focus-visible:bg-muted/60"
      style={{ top, height: ROW_HEIGHT, gridTemplateColumns: WINNER_GRID }}
    >
      <div role="cell" className="pl-3">
        <RankBadge rank={row.rank} />
      </div>
      <div role="cell" className="flex min-w-0 items-center gap-2.5 px-2">
        <Avatar row={row} />
        <TraderName row={row} />
      </div>
      <div role="cell" className="min-w-0 px-2">
        <MarketLink row={row} onPickMarket={onPickMarket} />
      </div>
      <div role="cell" className={cn("px-2 text-right font-mono text-[13px] font-semibold tabular-nums", pnlTone(row.pnl))}>
        {signedUsd(row.pnl)}
      </div>
      <div role="cell" className="px-2 text-right font-mono text-[12px] tabular-nums">{usd(row.cost)}</div>
      <div role="cell" className="px-2 text-right font-mono text-[12px] tabular-nums">{usd(row.payout)}</div>
      <div role="cell" className="px-2 text-right font-mono text-[12px] tabular-nums text-emerald-600 dark:text-emerald-400">
        {ret == null ? "—" : `+${ret < 10 ? (ret * 100).toFixed(ret < 1 ? 1 : 0) : Math.round(ret * 100).toLocaleString()}%`}
      </div>
      <div role="cell" className="truncate pr-3 text-right text-[12px] text-muted-foreground">
        {ago(row.resolvedAt, now)}
      </div>
    </div>
  );
}

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function useNearEnd(end, total, onNearEnd) {
  const ref = useRef(onNearEnd);
  ref.current = onNearEnd;
  useEffect(() => {
    if (total && end >= total - NEAR_END) ref.current?.();
  }, [end, total]);
}

/** Holders as a windowed table: the leaderboard (rank, PnL, volume) or biggest winning positions. */
export function HolderBrowseTable({ rows, winners, onPick, onPickMarket, onNearEnd, footer, empty, height = 620, resetKey, sort, onSort, onClearSort }) {
  const { scrollRef, view, onScroll } = useBrowseScroll({ height, resetKey });
  const now = useNow();
  const start = Math.max(0, Math.floor(view.top / ROW_HEIGHT) - OVERSCAN);
  const end = Math.min(rows.length, Math.ceil((view.top + view.height) / ROW_HEIGHT) + OVERSCAN);
  useNearEnd(end, rows.length, onNearEnd);
  const columns = winners ? WINNER_COLUMNS : LEADER_COLUMNS;

  return (
    <div ref={scrollRef} onScroll={onScroll} className="overflow-auto overscroll-contain" style={{ height }}>
      <div role="table" aria-rowcount={rows.length} className="min-w-max">
        <div
          role="row"
          className="sticky top-0 z-[1] grid border-b border-border/70 bg-background text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
          style={{ gridTemplateColumns: winners ? WINNER_GRID : LEADER_GRID }}
        >
          {columns.map((column) => (
            <HeaderCell key={column.key} column={column} sort={sort} onSort={onSort} onClearSort={onClearSort} />
          ))}
        </div>
        {rows.length ? (
          <>
            <div role="rowgroup" className="relative" style={{ height: rows.length * ROW_HEIGHT }}>
              {rows.slice(start, end).map((row, offset) =>
                winners ? (
                  <WinnerRow key={row.key} row={row} top={(start + offset) * ROW_HEIGHT} now={now} onPick={onPick} onPickMarket={onPickMarket} />
                ) : (
                  <LeaderRow key={row.key} row={row} top={(start + offset) * ROW_HEIGHT} onPick={onPick} />
                ),
              )}
            </div>
            {footer}
          </>
        ) : (
          <div className="flex h-40 items-center justify-center gap-2 text-[12px] text-muted-foreground">{empty}</div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, children, className }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 truncate font-mono text-[12.5px] tabular-nums text-foreground", className)}>{children}</div>
    </div>
  );
}

function HolderCard({ row, winners, periodLabel, now, onPick, onPickMarket }) {
  const ret = winners ? winReturn(row) : null;
  return (
    <div
      {...rowProps(row, onPick)}
      role="listitem"
      className="flex min-w-0 cursor-pointer flex-col rounded-xl border border-border/70 bg-background p-3.5 text-[12px] outline-none transition-[border-color,box-shadow] hover:border-foreground/25 hover:shadow-sm focus-visible:border-foreground/40"
      style={{ height: CARD_HEIGHT }}
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <Avatar row={row} className="size-9" />
        <div className="min-w-0 flex-1 text-[13px]">
          <TraderName row={row} />
        </div>
        <RankBadge rank={row.rank} className="shrink-0" />
      </div>
      {winners ? (
        <div className="mt-2 min-w-0 text-[12px] leading-4">
          <MarketLink row={row} onPickMarket={onPickMarket} className="line-clamp-1" />
        </div>
      ) : null}
      <div className="mt-auto">
        <div className={cn("font-mono text-[22px] font-semibold leading-none tabular-nums", pnlTone(row.pnl))}>{signedUsd(row.pnl)}</div>
        <div className="mt-1 text-[11px] text-muted-foreground">{winners ? `PnL on one position · resolved ${ago(row.resolvedAt, now)}` : `PnL ${periodLabel ? periodLabel.toLowerCase() : ""}`}</div>
      </div>
      <div className={cn("mt-2.5 grid gap-2 border-t border-border/60 pt-2.5", winners ? "grid-cols-3" : "grid-cols-2")}>
        {winners ? (
          <>
            <Stat label="Cost">{usd(row.cost)}</Stat>
            <Stat label="Payout">{usd(row.payout)}</Stat>
            <Stat label="Return" className="text-emerald-700 dark:text-emerald-300">
              {ret == null ? "—" : `+${Math.round(ret * 100).toLocaleString()}%`}
            </Stat>
          </>
        ) : (
          <>
            <Stat label="Volume">{Number.isFinite(row.volume) ? COMPACT.format(row.volume) : "—"}</Stat>
            {row.xHandle ? <Stat label="On X">@{row.xHandle}</Stat> : row.name ? <Stat label="Wallet">{shortAddress(row.address)}</Stat> : null}
          </>
        )}
      </div>
    </div>
  );
}

/** Holders as a windowed grid of cards. */
export function HolderBrowseCards({ rows, winners, periodLabel, onPick, onPickMarket, onNearEnd, footer, empty, height = 620, resetKey }) {
  const { scrollRef, view, onScroll } = useBrowseScroll({ height, resetKey });
  const now = useNow();
  const columns = Math.max(1, Math.floor((view.width - PAD * 2 + GAP) / (CARD_MIN_WIDTH + GAP)));
  const rowHeight = CARD_HEIGHT + GAP;
  const lines = Math.ceil(rows.length / columns);
  const firstLine = Math.max(0, Math.floor((view.top - PAD) / rowHeight) - 2);
  const lastLine = Math.min(lines, Math.ceil((view.top + view.height) / rowHeight) + 2);
  useNearEnd(view.width ? lastLine * columns : 0, rows.length, onNearEnd);

  const items = [];
  for (let line = firstLine; line < lastLine && view.width; line += 1) items.push({ line, rows: rows.slice(line * columns, (line + 1) * columns) });

  return (
    <div ref={scrollRef} onScroll={onScroll} className="overflow-auto overscroll-contain bg-muted/30" style={{ height }}>
      {rows.length ? (
        <>
          <div role="list" aria-label="Holders" className="relative" style={{ height: lines * rowHeight - GAP + PAD * 2 }}>
            {items.map(({ line, rows: cards }) => (
              <div
                key={line}
                className="absolute grid"
                style={{ top: PAD + line * rowHeight, left: PAD, right: PAD, gap: GAP, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
              >
                {cards.map((row) => (
                  <HolderCard key={row.key} row={row} winners={winners} periodLabel={periodLabel} now={now} onPick={onPick} onPickMarket={onPickMarket} />
                ))}
              </div>
            ))}
          </div>
          {footer}
        </>
      ) : (
        <div className="flex h-40 items-center justify-center gap-2 text-[12px] text-muted-foreground">{empty}</div>
      )}
    </div>
  );
}
