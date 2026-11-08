"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, LayoutGrid, List, Loader2, RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { CategoryChip, Chip, Segmented } from "./holderMarketBrowser";
import { HolderBrowseCards, HolderBrowseTable, winReturn } from "./holderBrowseTable";
import { span } from "./marketBrowseTable";
import {
  HOLDER_CATEGORIES,
  HOLDER_FEEDS,
  HOLDER_PERIODS,
  HOLDER_PRELOAD,
  cachedBoard,
  forgetBoard,
  holderBoardKey,
  loadBoardPage,
  loadedBoard,
} from "./holderBrowseFeeds";

/** How many more rows to load each time the list is scrolled to the end. */
const MORE = 1000;

const COLLATOR = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

/** Header sorts: the direction a first click picks, and the value each row sorts by. */
const COLUMN_SORTS = {
  rank: { dir: "asc", value: (row) => row.rank },
  trader: { dir: "asc", text: true, value: (row) => row.name || row.address },
  market: { dir: "asc", text: true, value: (row) => row.eventTitle || null },
  pnl: { dir: "desc", value: (row) => row.pnl },
  volume: { dir: "desc", value: (row) => row.volume },
  cost: { dir: "desc", value: (row) => row.cost },
  payout: { dir: "desc", value: (row) => row.payout },
  return: { dir: "desc", value: (row) => winReturn(row) },
  resolved: { dir: "desc", value: (row) => row.resolvedAt },
};

const COLUMN_LABELS = {
  rank: "rank",
  trader: "trader",
  market: "market",
  pnl: "PnL",
  volume: "volume",
  cost: "cost",
  payout: "payout",
  return: "return",
  resolved: "resolved",
};

const LEADER_KEYS = new Set(["rank", "trader", "pnl", "volume"]);

function sortRows(rows, { key, dir }) {
  const spec = COLUMN_SORTS[key];
  if (!spec) return rows;
  const sign = dir === "asc" ? 1 : -1;
  const keyed = rows.map((row) => {
    const raw = spec.value(row);
    return { row, value: spec.text ? (raw ? String(raw) : null) : Number.isFinite(raw) ? raw : null };
  });
  keyed.sort((a, b) => {
    if (a.value == null || b.value == null) return a.value == null ? (b.value == null ? 0 : 1) : -1;
    return sign * (spec.text ? COLLATOR.compare(a.value, b.value) : a.value - b.value);
  });
  return keyed.map((entry) => entry.row);
}

function emptyBoard(key) {
  return { key, rows: [], done: false, at: 0, error: "", loading: true };
}

/**
 * Polymarket's traders: the PnL and volume leaderboards and the biggest single wins, by period and
 * category, as a table or cards. Pick one to open their wallet.
 *
 * @param {{ onPick: (subjects: object[]) => void, heading?: import("react").ReactNode, className?: string }} props
 */
export function HolderTraderBrowser({ onPick, heading, className }) {
  const [feed, setFeed] = useState("pnl");
  const [period, setPeriod] = useState("week");
  const [category, setCategory] = useState("");
  const [view, setView] = useState("list");
  const [columnSort, setColumnSort] = useState(null);
  const [resetKey, setResetKey] = useState(0);
  const [retry, setRetry] = useState(0);
  const key = holderBoardKey({ feed, period, category });
  const [board, setBoard] = useState(() => emptyBoard(key));
  const runRef = useRef(null);
  const [now, setNow] = useState(() => Date.now());

  const pump = useCallback(() => {
    const run = runRef.current;
    if (!run || run.busy) return;
    run.busy = true;
    setBoard((prev) => (prev.key === run.key ? { ...prev, loading: true, error: "" } : prev));
    (async () => {
      try {
        for (;;) {
          const next = await loadBoardPage(run.query, run.controller.signal);
          if (runRef.current !== run) return;
          const more = !next.done && next.rows.length < run.want;
          setBoard({ key: run.key, rows: next.rows, done: !!next.done, at: next.at, error: "", loading: more });
          if (!more) return;
        }
      } catch (err) {
        if (runRef.current !== run || run.controller.signal.aborted) return;
        setBoard((prev) => ({ ...prev, loading: false, error: err?.message || "Couldn't load traders from Polymarket." }));
      } finally {
        run.busy = false;
      }
    })();
  }, []);

  useEffect(() => {
    const query = { feed, period, category };
    const boardKey = holderBoardKey(query);
    const cached = cachedBoard(boardKey);
    if (!cached) forgetBoard(boardKey);
    const run = { key: boardKey, query, controller: new AbortController(), busy: false, want: Math.max(HOLDER_PRELOAD, cached?.rows.length || 0) };
    runRef.current = run;
    const needed = !cached?.done && (cached?.rows.length || 0) < run.want;
    setBoard(cached ? { key: boardKey, rows: cached.rows, done: !!cached.done, at: cached.at, error: "", loading: needed } : emptyBoard(boardKey));
    if (needed) pump();
    return () => {
      run.controller.abort();
      if (runRef.current === run) runRef.current = null;
    };
  }, [feed, period, category, retry, pump]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const loadMore = useCallback(() => {
    const run = runRef.current;
    const loaded = run && loadedBoard(run.key);
    if (!run || run.busy || !loaded || loaded.done) return;
    run.want = loaded.rows.length + MORE;
    pump();
  }, [pump]);

  const refresh = () => {
    forgetBoard(key);
    setResetKey((value) => value + 1);
    setRetry((value) => value + 1);
  };

  const feedSpec = HOLDER_FEEDS.find((item) => item.id === feed) || HOLDER_FEEDS[0];
  const winners = feedSpec.board === "winners";
  const current = board.key === key ? board : emptyBoard(key);
  const activeSort = columnSort && (winners || LEADER_KEYS.has(columnSort.key)) ? columnSort : null;
  const rows = useMemo(() => (activeSort ? sortRows(current.rows, activeSort) : current.rows), [current.rows, activeSort]);

  const changeFeed = (next) => {
    setFeed(next);
    setResetKey((value) => value + 1);
  };
  const changePeriod = (next) => {
    setPeriod(next);
    setResetKey((value) => value + 1);
  };
  const changeCategory = (next) => {
    setCategory(next);
    setResetKey((value) => value + 1);
  };

  const sortByHeader = useCallback((columnKey) => {
    setColumnSort((prev) =>
      prev?.key === columnKey ? { key: columnKey, dir: prev.dir === "asc" ? "desc" : "asc" } : { key: columnKey, dir: COLUMN_SORTS[columnKey]?.dir || "desc" },
    );
    setResetKey((value) => value + 1);
  }, []);
  const clearColumnSort = useCallback(() => {
    setColumnSort(null);
    setResetKey((value) => value + 1);
  }, []);

  const pickTrader = useCallback((row) => onPick([{ kind: "trader", address: row.address, title: row.name }]), [onPick]);
  const pickMarket = useCallback(
    (row) => row.conditionId && onPick([{ kind: "market", conditionId: row.conditionId, title: row.eventTitle }]),
    [onPick],
  );

  const periodLabel = HOLDER_PERIODS.find((item) => item.id === period)?.label || "";
  const categoryLabel = HOLDER_CATEGORIES.find((item) => item.id === category)?.label || "All categories";
  const count = current.rows.length;
  const loading = current.loading && !current.error;

  const emptyText = loading ? (
    <>
      <Loader2 className="size-3.5 animate-spin" aria-hidden />
      Loading traders
    </>
  ) : current.error ? (
    "Couldn't load this board"
  ) : (
    `No traders ranked in ${categoryLabel.toLowerCase()} for ${periodLabel.toLowerCase()}`
  );

  const footer = (
    <div className="flex h-11 items-center justify-center gap-2 text-[12px] text-muted-foreground">
      {current.done ? (
        winners ? (
          `Polymarket ranks the top ${count.toLocaleString()} wins`
        ) : (
          `That's everyone · ${count.toLocaleString()} traders`
        )
      ) : loading ? (
        <>
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
          Loading more traders
        </>
      ) : (
        <button type="button" onClick={loadMore} className="rounded px-1.5 py-0.5 font-medium text-foreground hover:bg-muted">
          Load more
        </button>
      )}
    </div>
  );

  const listProps = {
    rows,
    winners,
    onPick: pickTrader,
    onPickMarket: pickMarket,
    onNearEnd: loadMore,
    footer,
    empty: emptyText,
    resetKey: `${key}|${resetKey}`,
  };

  return (
    <section aria-label="Browse holders" className={cn("scroll-mt-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          {heading || <h3 className="text-[15px] font-semibold text-foreground">Browse holders</h3>}
          <p className="mt-0.5 text-[13px] text-muted-foreground">Polymarket&apos;s top traders and biggest single wins. Pick one to open their wallet.</p>
        </div>
        {current.at ? (
          <button
            type="button"
            onClick={refresh}
            title="Load this board again from Polymarket"
            className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <RotateCw className="size-3.5" aria-hidden />
            Updated {now - current.at < 60_000 ? "just now" : `${span(now - current.at)} ago`}
          </button>
        ) : null}
      </div>

      <div className="-mx-1 mt-3 flex items-end gap-1.5 overflow-x-auto px-1 pb-1">
        <div role="group" aria-label="Leaderboard" className="flex shrink-0 flex-col gap-1">
          <span className="px-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">Leaderboard by</span>
          <div role="tablist" aria-label="Leaderboard by" className="flex items-center gap-1.5">
            {HOLDER_FEEDS.filter((item) => item.board === "leaderboard").map((item) => (
              <Chip key={item.id} selected={feed === item.id} onClick={() => changeFeed(item.id)}>
                {item.short}
              </Chip>
            ))}
          </div>
        </div>
        <div role="tablist" aria-label="Wins" className="flex shrink-0 items-center gap-1.5">
          {HOLDER_FEEDS.filter((item) => item.board === "winners").map((item) => (
            <Chip key={item.id} selected={feed === item.id} onClick={() => changeFeed(item.id)}>
              {item.label}
            </Chip>
          ))}
        </div>
      </div>
      <div role="tablist" aria-label="Categories" className="-mx-1 mt-1.5 flex items-center gap-1 overflow-x-auto px-1 pb-1">
        <CategoryChip selected={!category} onClick={() => changeCategory("")}>
          All
        </CategoryChip>
        {HOLDER_CATEGORIES.map((item) => (
          <CategoryChip key={item.id} selected={category === item.id} onClick={() => changeCategory(item.id)}>
            {item.label}
          </CategoryChip>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <Segmented
          label="View"
          value={view}
          onChange={setView}
          options={[
            { id: "list", label: "List", icon: List, showLabel: true },
            { id: "cards", label: "Cards", icon: LayoutGrid, showLabel: true },
          ]}
        />
        <Segmented label="Period" value={period} onChange={changePeriod} options={HOLDER_PERIODS} />
        <span className="text-[12px] tabular-nums text-muted-foreground">
          {loading && count ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="size-3 animate-spin" aria-hidden />
              {feedSpec.label} · {count.toLocaleString()} loaded so far
            </span>
          ) : (
            `${feedSpec.label} · ${count.toLocaleString()}${current.done || !count ? "" : "+"}`
          )}
        </span>
        {activeSort ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
            Sorted by {COLUMN_LABELS[activeSort.key]}
            {activeSort.dir === "asc" ? <ArrowUp className="size-3 text-foreground" aria-hidden /> : <ArrowDown className="size-3 text-foreground" aria-hidden />}
            {current.done ? null : <span title="More traders load as you scroll, and slot into this order">within the {count.toLocaleString()} loaded</span>}
            {view === "cards" ? (
              <button type="button" onClick={clearColumnSort} className="rounded px-1 font-medium text-foreground hover:bg-muted">
                Clear
              </button>
            ) : null}
          </span>
        ) : null}
      </div>

      {current.error ? (
        <p className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[12.5px] text-amber-800 dark:text-amber-200">
          {current.error}
          <button type="button" onClick={() => setRetry((value) => value + 1)} className="ml-auto font-medium underline-offset-4 hover:underline">
            Try again
          </button>
        </p>
      ) : null}

      <div className="mt-3 overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
        {view === "cards" ? (
          <HolderBrowseCards {...listProps} periodLabel={periodLabel} />
        ) : (
          <HolderBrowseTable {...listProps} sort={activeSort} onSort={sortByHeader} onClearSort={clearColumnSort} />
        )}
      </div>
    </section>
  );
}
