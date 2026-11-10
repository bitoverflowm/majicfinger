"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { UserAvatar } from "@/components/ui/user-avatar";
import { cn } from "@/lib/utils";
import { SKILL_SCORE_NAME, scoreTier } from "./traderScore";

const ROW_HEIGHT = 48;
const OVERSCAN = 8;
/** Matches the `row-arrive` animation in tailwind.config.js. */
const ARRIVE_MS = 3000;
const FLAGS_KEY = "lychee:holderTerminal:holderFlags";

const OUTCOME_DOT = ["bg-emerald-500", "bg-rose-500"];

/** Each flag has its own colour so a row's flags can be told apart at a glance. */
export const HOLDER_FLAGS = [
  {
    id: "newWallet",
    label: "New wallet",
    title: "The wallet's Polymarket profile is less than 30 days old",
    dot: "bg-sky-500",
    chip: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  },
  {
    id: "firstTrade",
    label: "First trade ever",
    title: "The wallet's first trade on Polymarket was in this market",
    dot: "bg-amber-500",
    chip: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  },
  {
    id: "bothSides",
    label: "Holds both sides",
    title: "The wallet holds shares of both outcomes",
    dot: "bg-fuchsia-500",
    chip: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
  },
];

const ALL_ON = Object.fromEntries(HOLDER_FLAGS.map((flag) => [flag.id, true]));

/** Which flags are switched on, remembered between visits. */
export function useHolderFlags() {
  const [enabled, setEnabled] = useState(ALL_ON);
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(FLAGS_KEY) || "null");
      if (saved && typeof saved === "object") setEnabled({ ...ALL_ON, ...saved });
    } catch {
      /* a bad saved value keeps the defaults */
    }
  }, []);
  const toggle = (id) =>
    setEnabled((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        window.localStorage.setItem(FLAGS_KEY, JSON.stringify(next));
      } catch {
        /* private mode: the choice lasts for this visit */
      }
      return next;
    });
  return { enabled, toggle };
}

function rowFlags(row, detail) {
  return {
    newWallet: row.newWallet,
    firstTrade: detail?.firstTradeHere === true,
    bothSides: row.bothSides,
  };
}

export function HolderFlagToggles({ enabled, onToggle, counts, outcomes }) {
  return (
    <div role="group" aria-label="Flags" className="flex flex-wrap items-center gap-1.5">
      <span className="mr-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Flags</span>
      {HOLDER_FLAGS.map((flag) => {
        const on = enabled[flag.id];
        const label = flag.id === "bothSides" ? `Holds ${outcomes[0]} and ${outcomes[1]}` : flag.label;
        return (
          <button
            key={flag.id}
            type="button"
            aria-pressed={on}
            onClick={() => onToggle(flag.id)}
            title={`${flag.title}. Click to ${on ? "hide" : "show"} this flag.`}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-colors",
              on ? "border-border bg-background font-medium text-foreground shadow-sm" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <span className={cn("size-2 rounded-full", flag.dot, !on && "opacity-30")} aria-hidden />
            {label}
            {counts?.[flag.id] ? <span className="tabular-nums text-muted-foreground">{counts[flag.id].toLocaleString()}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const USD_COMPACT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const SHARES = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const SHARES_COMPACT = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const RANK_COMPACT = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
/** Fits the 48px rank cell: −$940, −$1.2K, −$190K, −$2M. */
const LOSS_SHORT = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumSignificantDigits: 2 });

function usd(value) {
  if (!Number.isFinite(value)) return "—";
  return Math.abs(value) >= 10_000 ? USD_COMPACT.format(value) : USD.format(value);
}

function signedUsd(value) {
  if (!Number.isFinite(value)) return "—";
  const text = usd(Math.abs(value));
  return value > 0.5 ? `+${text}` : value < -0.5 ? `−${text}` : text;
}

function shares(value) {
  if (!Number.isFinite(value)) return "—";
  return value >= 10_000 ? SHARES_COMPACT.format(value) : SHARES.format(value);
}

function cents(price) {
  return Number.isFinite(price) ? `${Math.round(price * 1000) / 10}¢` : "—";
}

function pct(value) {
  if (!Number.isFinite(value)) return null;
  if (value > 0 && value < 0.01) return "<0.01%";
  return `${value >= 10 ? value.toFixed(1) : value.toFixed(2)}%`;
}

function shortWallet(wallet) {
  return wallet ? `${wallet.slice(0, 6)}…${wallet.slice(-4)}` : "";
}

function pnlTone(value) {
  if (!Number.isFinite(value) || Math.abs(value) < 0.5) return "text-muted-foreground";
  return value > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400";
}

function Pending() {
  return <span className="inline-block h-2.5 w-8 animate-pulse rounded bg-muted" aria-label="Loading" />;
}

const GRID = "280px 96px 84px 88px 72px 64px 92px 92px 92px 92px";

const COLUMNS = [
  { key: "trader", label: "Leaderboard · Holder", className: "pl-3", title: "All-time PnL rank on the Polymarket leaderboard (wallets that lost money show the loss in red instead), then the holder" },
  {
    key: "score",
    label: (
      <>
        Lychee
        <br />
        Skill Score
      </>
    ),
    right: true,
    title: `${SKILL_SCORE_NAME} from finished markets, −100 to 100; ±20 is a two-sigma outlier`,
  },
  { key: "shares", label: "Shares", right: true, title: "Shares held now" },
  { key: "value", label: "Position", right: true, title: "What the shares are worth at the live price" },
  { key: "supply", label: "Supply", right: true, title: "Share of every outstanding share of this outcome" },
  { key: "entry", label: "Entry", right: true, title: "Average price paid per share" },
  { key: "pnl", label: "PnL", right: true, title: "Realized plus unrealized profit in this market" },
  { key: "realized", label: "Realized", right: true, title: "Profit locked in by selling" },
  { key: "unrealized", label: "Unrealized", right: true, title: "Profit on the shares still held, at the live price" },
  { key: "bought", label: "Bought", right: true, className: "pr-3", title: "Total shares of this outcome ever bought" },
];

/**
 * Polymarket ranks every wallet by all-time PnL, so anyone who has lost money sits near the bottom
 * at about #3M. That number says nothing, so a losing wallet shows its loss instead.
 */
function LeaderboardRank({ detail }) {
  if (detail === undefined) return <Pending />;
  const volume = detail?.volumeRank ? ` · #${detail.volumeRank.toLocaleString()} by volume` : "";
  if (Number.isFinite(detail?.pnl) && detail.pnl < -0.5) {
    return (
      <span
        className="font-mono tabular-nums text-rose-600 dark:text-rose-400"
        title={`Down ${USD.format(Math.abs(detail.pnl))} all time, so Polymarket ranks this wallet near the bottom${detail.pnlRank ? ` (#${detail.pnlRank.toLocaleString()} by PnL)` : ""}${volume}`}
      >
        −{LOSS_SHORT.format(Math.abs(detail.pnl))}
      </span>
    );
  }
  if (!detail?.pnlRank) {
    return (
      <span className="text-muted-foreground opacity-60" title="Not ranked on the all-time leaderboard">
        —
      </span>
    );
  }
  return (
    <span
      className={cn("font-mono tabular-nums", detail.pnlRank <= 100 ? "font-semibold text-amber-600 dark:text-amber-300" : "text-foreground")}
      title={`#${detail.pnlRank.toLocaleString()} by all-time PnL${Number.isFinite(detail.pnl) ? `, up ${USD.format(detail.pnl)}` : ""}${volume}`}
    >
      #{detail.pnlRank >= 100_000 ? RANK_COMPACT.format(detail.pnlRank) : detail.pnlRank.toLocaleString()}
    </span>
  );
}

export function scoreTitle(score) {
  if (!score) return "No finished markets to score yet";
  const tier = scoreTier(score.score);
  return `${tier.label}. ${score.positions.toLocaleString()} ${score.recentOnly ? "most recent " : ""}finished positions (${Math.round(score.effectiveBets)} effective bets), ${Math.round(
    score.winRate * 100,
  )}% won, ${score.edge >= 0 ? "+" : "−"}${Math.abs(score.edge * 100).toFixed(1)}¢ profit per share.`;
}

function TraderScore({ detail }) {
  if (detail === undefined || detail.score === undefined) return detail === undefined ? <Pending /> : <span className="text-muted-foreground opacity-60">—</span>;
  const score = detail.score;
  if (!score) {
    return (
      <span className="text-[11px] text-muted-foreground" title={scoreTitle(score)}>
        New
      </span>
    );
  }
  return (
    <span className={cn("font-mono font-semibold tabular-nums", scoreTier(score.score).tone)} title={scoreTitle(score)}>
      {score.score > 0 ? "+" : ""}
      {score.score.toFixed(1)}
    </span>
  );
}

function HolderRow({ row, index, top, detail, enabled, outcomes, onPickTrader }) {
  const flags = rowFlags(row, detail);
  const shown = HOLDER_FLAGS.filter((flag) => enabled[flag.id] && flags[flag.id]);
  const elapsed = row.changedAt ? Date.now() - row.changedAt : Infinity;
  const arriving = elapsed < ARRIVE_MS;
  const bought = detail?.bought?.[index];
  const open = () => onPickTrader?.({ address: row.wallet, title: row.name });
  return (
    <div
      role="row"
      className={cn("group/row absolute inset-x-0 grid items-center border-b border-border/50 text-[12.5px]", arriving && "animate-row-arrive")}
      style={{ top, height: ROW_HEIGHT, gridTemplateColumns: GRID, ...(arriving ? { animationDelay: `-${elapsed}ms` } : null) }}
    >
      <div role="cell" className="sticky left-0 z-[1] h-full bg-background">
        <div className="relative flex h-full items-center gap-2 pl-3 pr-2 group-hover/row:bg-muted/40">
          {shown.length ? <span className={cn("absolute inset-y-1 left-0 w-[3px] rounded-r", shown[0].dot)} aria-hidden /> : null}
          <span className="w-12 shrink-0 text-right text-[12px]">
            <LeaderboardRank detail={detail} />
          </span>
          <span className="w-6 shrink-0 text-right font-mono text-[11px] tabular-nums text-muted-foreground" title="Rank among this outcome's holders">
            {row.rank}
          </span>
          <UserAvatar src={row.image} handle={row.wallet} name={row.name} size={22} className="shrink-0" />
          <span className="min-w-0 flex-1">
            <button
              type="button"
              onClick={open}
              disabled={!onPickTrader}
              className="block max-w-full truncate text-left font-medium text-foreground hover:underline disabled:no-underline"
              title={onPickTrader ? `Open holder analysis for ${row.name}` : row.name}
            >
              {row.name}
            </button>
            <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[11px] text-muted-foreground">
              <span className="shrink-0 font-mono" title={row.wallet}>
                {shortWallet(row.wallet)}
              </span>
              {shown.map((flag) => (
                <span
                  key={flag.id}
                  title={flag.title}
                  className={cn("shrink-0 truncate rounded px-1 py-px text-[10px] font-semibold leading-[13px]", flag.chip)}
                >
                  {flag.id === "bothSides" ? `${outcomes[0]} + ${outcomes[1]}` : flag.label}
                </span>
              ))}
            </span>
          </span>
        </div>
      </div>
      <div role="cell" className="px-2 text-right text-[12px]">
        <TraderScore detail={detail} />
      </div>
      <div role="cell" className="px-2 text-right font-mono text-[12px] tabular-nums text-foreground">{shares(row.amount)}</div>
      <div role="cell" className="px-2 text-right font-mono text-[12px] tabular-nums">{usd(row.value)}</div>
      <div role="cell" className="px-2 text-right font-mono text-[12px] tabular-nums">{pct(row.supplyPct) ?? <Pending />}</div>
      <div role="cell" className="px-2 text-right font-mono text-[12px] tabular-nums">{cents(row.avgPrice)}</div>
      <div role="cell" className={cn("px-2 text-right font-mono text-[12px] font-semibold tabular-nums", pnlTone(row.total))}>{signedUsd(row.total)}</div>
      <div role="cell" className={cn("px-2 text-right font-mono text-[12px] tabular-nums", pnlTone(row.realized))}>{signedUsd(row.realized)}</div>
      <div role="cell" className={cn("px-2 text-right font-mono text-[12px] tabular-nums", pnlTone(row.unrealized))}>{signedUsd(row.unrealized)}</div>
      <div role="cell" className="pr-3 pl-2 text-right font-mono text-[12px] tabular-nums">
        {detail === undefined ? <Pending /> : bought == null ? "—" : shares(bought)}
      </div>
    </div>
  );
}

function PanelHeader({ side, index }) {
  return (
    <div className="flex items-center gap-2 border-b border-border/70 px-3 py-2">
      <span className={cn("size-2 shrink-0 rounded-full", OUTCOME_DOT[index])} aria-hidden />
      <span className="text-[13px] font-semibold text-foreground">{side.outcome}</span>
      <span className="text-[12px] tabular-nums text-muted-foreground">
        {side.count == null ? (
          <span className="inline-flex items-center gap-1">
            <Loader2 className="size-3 animate-spin" aria-hidden />
            Counting holders
          </span>
        ) : (
          `${side.count.toLocaleString()}${side.capped ? "+" : ""} holders`
        )}
      </span>
      {side.shares != null ? (
        <span className="ml-auto font-mono text-[12px] tabular-nums text-muted-foreground">{shares(side.shares)} shares held</span>
      ) : null}
    </div>
  );
}

function HolderList({ side, index, details, onVisible, enabled, outcomes, onPickTrader, hasMore, loadingMore, onLoadMore, loading }) {
  const scrollRef = useRef(null);
  const [view, setView] = useState({ top: 0, height: 480 });
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const measure = () => setView({ top: el.scrollTop, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const rows = side?.rows || [];
  const start = Math.max(0, Math.floor(view.top / ROW_HEIGHT) - OVERSCAN);
  const end = Math.min(rows.length, Math.ceil((view.top + view.height) / ROW_HEIGHT) + OVERSCAN);
  const visible = rows.slice(start, end);

  const visibleKey = visible.map((row) => row.wallet).join(",");
  const onVisibleRef = useRef(onVisible);
  onVisibleRef.current = onVisible;
  useEffect(() => {
    if (visibleKey) onVisibleRef.current?.(visibleKey.split(","));
  }, [visibleKey]);

  const nearEnd = rows.length > 0 && end >= rows.length - OVERSCAN;
  const loadRef = useRef(onLoadMore);
  loadRef.current = onLoadMore;
  useEffect(() => {
    if (nearEnd && hasMore && !loadingMore) loadRef.current?.();
  }, [hasMore, loadingMore, nearEnd]);

  return (
    <div
      ref={scrollRef}
      onScroll={(event) => setView({ top: event.currentTarget.scrollTop, height: event.currentTarget.clientHeight })}
      className="min-h-0 flex-1 overflow-auto overscroll-contain"
    >
      <div role="table" aria-label={`${side?.outcome || ""} holders`} className="min-w-max">
        <div
          role="row"
          className="sticky top-0 z-[2] grid items-end border-b border-border/70 bg-background text-[11px] font-medium uppercase leading-tight tracking-wide text-muted-foreground"
          style={{ gridTemplateColumns: GRID }}
        >
          {COLUMNS.map((column) => (
            <div
              key={column.key}
              role="columnheader"
              title={column.title}
              className={cn(
                "py-2",
                column.right ? "px-2 text-right" : "",
                column.className,
                column.key === "trader" && "sticky left-0 z-[1] bg-background",
              )}
            >
              {column.label}
            </div>
          ))}
        </div>
        {rows.length ? (
          <>
            <div role="rowgroup" className="relative" style={{ height: rows.length * ROW_HEIGHT }}>
              {visible.map((row, offset) => (
                <HolderRow
                  key={row.wallet}
                  row={row}
                  index={index}
                  top={(start + offset) * ROW_HEIGHT}
                  detail={details(row.wallet)}
                  enabled={enabled}
                  outcomes={outcomes}
                  onPickTrader={onPickTrader}
                />
              ))}
            </div>
            <div className="flex h-10 items-center justify-center gap-2 text-[12px] text-muted-foreground">
              {loadingMore ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                  Loading more holders
                </>
              ) : (
                `Top ${rows.length.toLocaleString()}${side.count != null ? ` of ${side.count.toLocaleString()}${side.capped ? "+" : ""}` : ""} holders`
              )}
            </div>
          </>
        ) : (
          <div className="flex h-40 items-center justify-center gap-2 text-[12px] text-muted-foreground">
            {loading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Reading the holders
              </>
            ) : (
              `No ${side?.outcome || ""} holders yet`
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Who holds each outcome, largest first: Yes (the first outcome) on the left, No on the right.
 * Positions move live as holders trade; flags mark new wallets, first-ever trades, and wallets on
 * both sides.
 */
export function HolderHoldersTable({ sides, outcomes, loading, error, details, onVisible, enabled, hasMore, loadingMore, onLoadMore, onPickTrader }) {
  if (error) return <p className="rounded-xl border border-border/70 px-4 py-6 text-[13px] text-muted-foreground">{error}</p>;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {[0, 1].map((index) => {
        const side = sides?.[index] || { outcome: outcomes[index], rows: [], count: null, shares: null, capped: false };
        return (
          <section
            key={index}
            aria-label={`${side.outcome} holders`}
            className="flex h-[560px] min-w-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm"
          >
            <PanelHeader side={side} index={index} />
            <HolderList
              side={side}
              index={index}
              details={details}
              onVisible={onVisible}
              enabled={enabled}
              outcomes={outcomes}
              onPickTrader={onPickTrader}
              hasMore={hasMore}
              loadingMore={loadingMore}
              onLoadMore={onLoadMore}
              loading={loading}
            />
          </section>
        );
      })}
    </div>
  );
}

/** How many listed holders each flag marks, across both outcomes. */
export function holderFlagCounts(sides, details) {
  const counts = { newWallet: 0, firstTrade: 0, bothSides: 0 };
  const seen = { newWallet: new Set(), firstTrade: new Set(), bothSides: new Set() };
  for (const side of sides || []) {
    for (const row of side.rows) {
      const flags = rowFlags(row, details(row.wallet));
      for (const id of Object.keys(counts)) {
        if (flags[id] && !seen[id].has(row.wallet)) {
          seen[id].add(row.wallet);
          counts[id] += 1;
        }
      }
    }
  }
  return counts;
}
