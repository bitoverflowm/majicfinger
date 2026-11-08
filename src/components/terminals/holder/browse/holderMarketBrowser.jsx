"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, CalendarDays, LayoutGrid, List, Loader2, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  CATEGORIES,
  FEEDS,
  cachedFeed,
  cachedStats,
  cachedTradable,
  closeAt,
  fetchStats,
  fetchStatsBulk,
  forgetStats,
  inCategory,
  loadFeed,
  loadTradable,
  rememberStats,
  withStats,
} from "./marketBrowseFeeds";
import { MarketBrowseCalendar } from "./marketBrowseCalendar";
import { MarketBrowseCards } from "./marketBrowseCards";
import { MarketBrowseTable } from "./marketBrowseTable";
import { useLiveQuotes, useNewMarketFeed } from "./useMarketBrowseLive";

const PAUSE_KEY = "lychee:holderTerminal:pauseNewMarkets";
/** The socket takes a few hundred assets comfortably; more than a screenful isn't needed. */
const MAX_LIVE_ASSETS = 200;
/** Gamma lists a new market a few seconds after the socket announces it. */
const ENRICH_DELAYS_MS = [4000, 20_000];
const TOAST_MS = 9000;
/** Only Just listed animates arrivals and badges them New. */
const NO_ARRIVALS = new Map();

const SORTS = {
  newest: { label: "Newest", compare: (a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0) },
  closing: { label: "Closing soon", compare: null },
  volume: { label: "24h volume", compare: (a, b) => (b.volume24h ?? -1) - (a.volume24h ?? -1) },
  liquidity: { label: "Liquidity", compare: (a, b) => (b.liquidity ?? -1) - (a.liquidity ?? -1) },
  movers: { label: "Biggest movers", compare: null },
  resolved: { label: "Latest resolved", compare: (a, b) => (b.closedAt ?? 0) - (a.closedAt ?? 0) },
};

const FEED_SORTS = {
  tradable: ["newest", "closing"],
  new: ["newest"],
  closed: ["resolved", "volume"],
  volume: ["volume", "newest", "closing"],
  liquidity: ["liquidity", "newest", "closing"],
  trending: ["movers", "volume", "closing"],
};

const TOP_FEEDS = new Set(["closed", "volume", "liquidity"]);

function sortsFor(feed) {
  return FEED_SORTS[feed] || FEED_SORTS.tradable;
}

/** Upcoming closes first, soonest at the top, then markets past their end date, then undated ones. */
function byClosing(markets, now) {
  const rank = (market) => {
    const at = closeAt(market);
    if (!at) return [2, 0];
    return at >= now ? [0, at] : [1, -at];
  };
  return markets
    .map((market) => [rank(market), market])
    .sort(([a], [b]) => a[0] - b[0] || a[1] - b[1])
    .map(([, market]) => market);
}

function sortMarkets(markets, sort) {
  if (sort === "closing") return byClosing(markets, Date.now());
  const compare = SORTS[sort]?.compare;
  return compare ? markets.slice().sort(compare) : markets;
}

const COLLATOR = new Intl.Collator(undefined, { sensitivity: "base", numeric: true });

const COLUMN_LABELS = {
  market: "market",
  chance: "chance",
  change: "24h change",
  vol24: "24h volume",
  volume: "volume",
  liquidity: "liquidity",
  closes: "closing time",
  listed: "listed",
};

/**
 * Sorting by a table column. `dir` is where a first click starts: text A to Z, numbers highest
 * first, closes soonest first, listed newest first. `stats` columns need Gamma's numbers.
 */
const COLUMN_SORTS = {
  market: { dir: "asc", text: true, value: (market) => market.question || market.slug || null },
  chance: { dir: "desc", value: (market) => market.prices[0] },
  change: { dir: "desc", stats: true, value: (market) => market.change24h },
  vol24: { dir: "desc", stats: true, value: (market) => market.volume24h },
  volume: { dir: "desc", stats: true, value: (market) => market.volume },
  liquidity: { dir: "desc", stats: true, value: (market) => market.liquidity },
  closes: {
    dir: "asc",
    value: (market, now) => {
      const at = closeAt(market);
      if (market.closed || market.closedAt) return at;
      // Past its end date and waiting on a result: nothing left to count down to.
      return at && at >= now ? at : null;
    },
  },
  listed: { dir: "desc", value: (market) => market.createdAt },
};

/** Markets without a value go last whichever way the column is sorted. */
function sortByColumn(markets, { key, dir }) {
  const column = COLUMN_SORTS[key];
  if (!column) return markets;
  const now = Date.now();
  const sign = dir === "asc" ? 1 : -1;
  const keyed = markets.map((market) => {
    const value = column.value(column.stats ? withStats(market, cachedStats(market.conditionId)) : market, now);
    const missing = value == null || (!column.text && !Number.isFinite(value));
    return { market, value, missing };
  });
  keyed.sort((a, b) => {
    if (a.missing || b.missing) return a.missing === b.missing ? 0 : a.missing ? 1 : -1;
    return sign * (column.text ? COLLATOR.compare(a.value, b.value) : a.value - b.value);
  });
  return keyed.map((entry) => entry.market);
}

export function Chip({ selected, onClick, children, count }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors",
        selected
          ? "border-foreground bg-foreground text-background"
          : "border-border/80 bg-background text-foreground hover:border-foreground/40 hover:bg-muted/60",
      )}
    >
      {children}
      {count != null ? (
        <span className={cn("tabular-nums", selected ? "text-background/70" : "text-muted-foreground")}>{count.toLocaleString()}</span>
      ) : null}
    </button>
  );
}

export function CategoryChip({ selected, onClick, children, count }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[12px] transition-colors",
        selected ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      )}
    >
      {children}
      {count != null ? <span className="tabular-nums text-muted-foreground/70">{count.toLocaleString()}</span> : null}
    </button>
  );
}

export function Segmented({ label, value, options, onChange }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-muted p-0.5 text-[12px]">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="radio"
          aria-checked={value === option.id}
          aria-label={option.icon ? option.label : undefined}
          title={option.icon ? option.label : undefined}
          onClick={() => onChange(option.id)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium transition-colors",
            value === option.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.icon ? <option.icon className="size-3.5" aria-hidden /> : null}
          {option.icon && !option.showLabel ? null : option.label}
        </button>
      ))}
    </div>
  );
}

function LiveDot({ status }) {
  const tone = status === "open" ? "bg-emerald-500" : status === "error" || status === "closed" ? "bg-amber-500" : "bg-muted-foreground/50";
  return (
    <span className="relative flex size-2" aria-hidden>
      {status === "open" ? <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" /> : null}
      <span className={cn("relative inline-flex size-2 rounded-full", tone)} />
    </span>
  );
}

function NewMarketToast({ markets, onPause, onView }) {
  const [first, ...rest] = markets;
  const more = rest.length;
  return (
    <div className="w-[356px] rounded-xl border border-border bg-background p-3.5 text-foreground shadow-lg">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[#0b7fd4]">
        <span className="relative flex size-2" aria-hidden>
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#0d99ff] opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-[#0d99ff]" />
        </span>
        {more ? `${markets.length} new markets just created` : "New market just created"}
      </div>
      <p className="mt-2 text-[13.5px] font-semibold leading-snug">{first.question}</p>
      {first.eventTitle && first.eventTitle !== first.question ? (
        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{first.eventTitle}</p>
      ) : null}
      {more ? (
        <ul className="mt-2 space-y-0.5 text-[12px] text-muted-foreground">
          {rest.slice(0, 2).map((market) => (
            <li key={market.conditionId} className="truncate">
              {market.question}
            </li>
          ))}
          {more > 2 ? <li>and {more - 2} more</li> : null}
        </ul>
      ) : null}
      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onPause}
          title="Stop these alerts. New markets keep collecting under Just listed."
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Pause className="size-3.5" aria-hidden />
          Pause
        </button>
        <button type="button" onClick={onView} className="rounded-md bg-[#2f6fed] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[#2f6fed]/90">
          View
        </button>
      </div>
    </div>
  );
}

/**
 * What to look at before searching: every tradable market, the other market feeds, and the
 * tradable markets by category, as a live table or a calendar of when they close. Newly created
 * markets stream in at the top and raise an alert.
 *
 * @param {{ onPick: (subjects: object[]) => void, heading?: import("react").ReactNode, onReveal?: () => void, className?: string }} props
 */
export function HolderMarketBrowser({ onPick, heading, onReveal, className }) {
  const [feed, setFeed] = useState("tradable");
  const [view, setView] = useState("list");
  const [sort, setSort] = useState("newest");
  const [resetKey, setResetKey] = useState(0);
  const [tradable, setTradable] = useState(() => {
    const cached = cachedTradable();
    return { markets: cached || [], done: !!cached, error: "" };
  });
  const [feeds, setFeeds] = useState({});
  const [liveNew, setLiveNew] = useState([]);
  const [arrivals, setArrivals] = useState(() => new Map());
  const [resolved, setResolved] = useState(() => new Map());
  const [visible, setVisible] = useState([]);
  const [statsVersion, setStatsVersion] = useState(0);
  const [columnSort, setColumnSort] = useState(null);
  const [statsProgress, setStatsProgress] = useState(null);
  const [paused, setPaused] = useState(false);
  const [retry, setRetry] = useState(0);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const toastRef = useRef(null);
  const sectionRef = useRef(null);

  useEffect(() => {
    try {
      setPaused(window.localStorage.getItem(PAUSE_KEY) === "1");
    } catch {
      /* storage blocked */
    }
  }, []);

  useEffect(() => {
    if (tradable.done) return undefined;
    const abort = new AbortController();
    setTradable((prev) => ({ ...prev, error: "" }));
    loadTradable({
      signal: abort.signal,
      onPage: (markets) => {
        if (!abort.signal.aborted) setTradable({ markets, done: false, error: "" });
      },
    })
      .then((markets) => {
        if (!abort.signal.aborted) setTradable({ markets, done: true, error: "" });
      })
      .catch((err) => {
        if (abort.signal.aborted || err?.name === "AbortError") return;
        setTradable((prev) => ({ ...prev, error: err?.message || "Couldn't load the tradable markets." }));
      });
    return () => abort.abort();
  }, [tradable.done, retry]);

  const gammaFeed = FEED_SORTS[feed] && feed !== "tradable" && feed !== "new" ? feed : "";
  useEffect(() => {
    if (!gammaFeed) return undefined;
    const cached = cachedFeed(gammaFeed);
    if (cached) {
      rememberStats(cached);
      setFeeds((prev) => ({ ...prev, [gammaFeed]: { markets: cached, loading: false, error: "" } }));
      return undefined;
    }
    const abort = new AbortController();
    setFeeds((prev) => ({ ...prev, [gammaFeed]: { markets: prev[gammaFeed]?.markets || [], loading: true, error: "" } }));
    loadFeed(gammaFeed, abort.signal)
      .then((markets) => {
        if (abort.signal.aborted) return;
        rememberStats(markets);
        setFeeds((prev) => ({ ...prev, [gammaFeed]: { markets, loading: false, error: "" } }));
      })
      .catch((err) => {
        if (abort.signal.aborted || err?.name === "AbortError") return;
        setFeeds((prev) => ({ ...prev, [gammaFeed]: { markets: [], loading: false, error: err?.message || "Couldn't load these markets." } }));
      });
    return () => abort.abort();
  }, [gammaFeed, retry]);

  /* New markets join the tradable list unannounced, wherever the sort puts them; Just listed is where they're called out. */
  const allTradable = useMemo(() => {
    if (!liveNew.length) return tradable.markets;
    const known = new Set(tradable.markets.map((market) => market.conditionId));
    return [...tradable.markets, ...liveNew.filter((market) => !known.has(market.conditionId))];
  }, [liveNew, tradable.markets]);

  const categoryCounts = useMemo(() => {
    const counts = {};
    for (const category of CATEGORIES) counts[category.id] = 0;
    for (const market of allTradable) {
      for (const category of CATEGORIES) if (inCategory(market, category.id)) counts[category.id] += 1;
    }
    return counts;
  }, [allTradable]);

  const categoryId = feed.startsWith("cat:") ? feed.slice(4) : "";
  const base = useMemo(() => {
    if (categoryId) return allTradable.filter((market) => inCategory(market, categoryId));
    if (gammaFeed) return feeds[gammaFeed]?.markets || [];
    if (feed === "new") return liveNew;
    return allTradable;
  }, [allTradable, categoryId, feed, feeds, gammaFeed, liveNew]);

  const statsSort = !!columnSort && !!COLUMN_SORTS[columnSort.key]?.stats;
  const markets = useMemo(
    () => (columnSort ? sortByColumn(base, columnSort) : sortMarkets(base, sort)),
    // Stats sorts redo themselves as more of the list's numbers arrive.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [base, sort, columnSort, statsSort ? statsVersion : 0],
  );

  const sortByHeader = (key) => {
    setColumnSort((prev) =>
      prev?.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: COLUMN_SORTS[key]?.dir || "desc" },
    );
    setResetKey((value) => value + 1);
  };
  const clearColumnSort = () => {
    setColumnSort(null);
    setResetKey((value) => value + 1);
  };

  /* Sorting by a stats column needs every market's numbers, not just the rows on screen. */
  const baseRef = useRef(base);
  baseRef.current = base;
  useEffect(() => {
    if (!statsSort) return undefined;
    const ids = baseRef.current.map((market) => market.conditionId).filter((id) => cachedStats(id) === undefined);
    if (!ids.length) return undefined;
    const abort = new AbortController();
    let shownAt = 0;
    setStatsProgress({ done: 0, total: ids.length });
    fetchStatsBulk(ids, abort.signal, (done, total) => {
      if (abort.signal.aborted) return;
      setStatsProgress({ done, total });
      if (Date.now() - shownAt > 1500) {
        shownAt = Date.now();
        setStatsVersion((value) => value + 1);
      }
    })
      .catch(() => {})
      .finally(() => {
        if (abort.signal.aborted) return;
        setStatsProgress(null);
        setStatsVersion((value) => value + 1);
      });
    return () => {
      abort.abort();
      setStatsProgress(null);
    };
  }, [statsSort, feed, tradable.done]);

  const pickFeed = (next) => {
    setFeed(next);
    setSort(sortsFor(next.startsWith("cat:") ? "tradable" : next)[0]);
    setResetKey((value) => value + 1);
  };

  const open = useCallback(
    (market) => onPick([{ kind: "market", conditionId: market.conditionId, title: market.question, slug: market.slug }]),
    [onPick],
  );

  /* Stats for tradable rows as they come into view. */
  const visibleIds = visible.map((market) => market.conditionId).join(",");
  useEffect(() => {
    const missing = visible.map((market) => market.conditionId).filter((id) => cachedStats(id) === undefined);
    if (!missing.length) return undefined;
    const abort = new AbortController();
    const timer = window.setTimeout(() => {
      fetchStats(missing, abort.signal)
        .then(() => {
          if (!abort.signal.aborted) setStatsVersion((value) => value + 1);
        })
        .catch(() => {});
    }, 250);
    return () => {
      window.clearTimeout(timer);
      abort.abort();
    };
    // `visibleIds` names the rows on screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleIds]);

  const liveAssets = useMemo(
    () =>
      visible
        .filter((market) => !market.closed && !market.closedAt)
        .flatMap((market) => market.tokenIds)
        .filter(Boolean)
        .slice(0, MAX_LIVE_ASSETS),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [visibleIds],
  );
  const live = useLiveQuotes(liveAssets);

  const discoveryAssets = useMemo(() => tradable.markets.slice(0, 3).flatMap((market) => market.tokenIds), [tradable.markets]);

  const enrich = useCallback((ids, attempt = 0) => {
    window.setTimeout(() => {
      fetchStats(ids)
        .then(() => {
          const missing = ids.filter((id) => cachedStats(id) === null);
          setLiveNew((prev) => prev.map((market) => (ids.includes(market.conditionId) ? withStats(market, cachedStats(market.conditionId)) : market)));
          setStatsVersion((value) => value + 1);
          if (missing.length && attempt + 1 < ENRICH_DELAYS_MS.length) {
            missing.forEach(forgetStats);
            enrich(missing, attempt + 1);
          }
        })
        .catch(() => {});
    }, ENRICH_DELAYS_MS[attempt]);
  }, []);

  const onRevealRef = useRef(onReveal);
  onRevealRef.current = onReveal;
  const showJustListed = useCallback(() => {
    onRevealRef.current?.();
    setFeed("new");
    setView((prev) => (prev === "calendar" ? "list" : prev));
    setSort("newest");
    setResetKey((value) => value + 1);
    window.requestAnimationFrame(() => sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }, []);

  const changePaused = useCallback((next) => {
    setPaused(next);
    if (next && toastRef.current) toast.dismiss(toastRef.current.id);
    try {
      window.localStorage.setItem(PAUSE_KEY, next ? "1" : "0");
    } catch {
      /* storage blocked */
    }
  }, []);

  const onNewMarkets = useCallback(
    (batch) => {
      const now = Date.now();
      setLiveNew((prev) => {
        const known = new Set(prev.map((market) => market.conditionId));
        return [...batch.filter((market) => !known.has(market.conditionId)), ...prev];
      });
      setArrivals((prev) => {
        const next = new Map(prev);
        for (const market of batch) next.set(market.conditionId, now);
        return next;
      });
      enrich(batch.map((market) => market.conditionId));
      if (pausedRef.current) return;
      // While an alert is up, later arrivals join it rather than stacking a second one.
      const shown = toastRef.current;
      const joining = shown && now - shown.at < TOAST_MS;
      const toastId = joining ? shown.id : `new-markets-${now}`;
      const listed = joining ? [...shown.markets, ...batch] : batch;
      toastRef.current = { id: toastId, markets: listed, at: now };
      toast.custom(
        (id) => (
          <NewMarketToast
            markets={listed}
            onPause={() => {
              toast.dismiss(id);
              changePaused(true);
            }}
            onView={() => {
              toast.dismiss(id);
              showJustListed();
            }}
          />
        ),
        { id: toastId, duration: TOAST_MS, onDismiss: () => (toastRef.current = null), onAutoClose: () => (toastRef.current = null) },
      );
    },
    [changePaused, enrich, showJustListed],
  );

  const onResolved = useCallback((msg) => {
    const id = String(msg?.market || "").trim();
    if (!id) return;
    setResolved((prev) => new Map(prev).set(id, String(msg?.winning_outcome || "Resolved")));
  }, []);

  const discoveryStatus = useNewMarketFeed({ assetIds: discoveryAssets, onNewMarkets, onResolved });

  const feedState = gammaFeed ? feeds[gammaFeed] : null;
  const loading = gammaFeed ? !!feedState?.loading || !feedState : feed !== "new" && !tradable.done;
  const error = gammaFeed ? feedState?.error : tradable.error;
  const selectedLabel = categoryId
    ? `${CATEGORIES.find((category) => category.id === categoryId)?.label} markets`
    : FEEDS.find((item) => item.id === feed)?.label;
  const sortOptions = sortsFor(categoryId ? "tradable" : feed).map((id) => ({ id, label: SORTS[id].label }));
  const tableProps = { live, arrivals: feed === "new" ? arrivals : NO_ARRIVALS, resolved, onPick: open, onVisible: setVisible };
  const feedChip = (item) => (
    <Chip
      key={item.id}
      selected={feed === item.id}
      onClick={() => pickFeed(item.id)}
      count={item.id === "tradable" ? allTradable.length || null : item.id === "new" ? liveNew.length || null : feeds[item.id]?.markets?.length || null}
    >
      {item.label}
    </Chip>
  );
  const feedGroups = [];
  for (const item of FEEDS) {
    const label = TOP_FEEDS.has(item.id) ? "Top markets by" : "";
    const last = feedGroups[feedGroups.length - 1];
    if (last && last.label === label) last.feeds.push(item);
    else feedGroups.push({ label, feeds: [item] });
  }
  const emptyText = loading ? (
    <>
      <Loader2 className="size-3.5 animate-spin" aria-hidden />
      Loading markets
    </>
  ) : feed === "new" ? (
    "Nothing new yet. Markets appear here the moment Polymarket lists them."
  ) : (
    "No markets here right now"
  );

  return (
    <section ref={sectionRef} aria-label="Browse markets" className={cn("scroll-mt-4", className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          {heading || <h3 className="text-[15px] font-semibold text-foreground">Browse markets</h3>}
          <p className="mt-0.5 text-[13px] text-muted-foreground">Every market you can trade on Polymarket right now, streaming live. Pick one to open it.</p>
        </div>
        <button
          type="button"
          onClick={() => changePaused(!paused)}
          aria-pressed={paused}
          title={paused ? "Show an alert again when a market is created." : "Stop the new market alerts. New markets still collect under Just listed."}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] hover:bg-muted hover:text-foreground",
            paused ? "font-medium text-foreground" : "text-muted-foreground",
          )}
        >
          {paused ? <Play className="size-3.5" aria-hidden /> : <Pause className="size-3.5" aria-hidden />}
          {paused ? "Resume alerts" : "Pause alerts"}
        </button>
      </div>

      <div role="tablist" aria-label="Markets to show" className="-mx-1 mt-3 flex items-end gap-1.5 overflow-x-auto px-1 pb-1">
        {feedGroups.map((group) =>
          group.label ? (
            <div key={group.label} role="group" aria-label={group.label} className="flex shrink-0 flex-col gap-1">
              <span className="px-1 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">{group.label}</span>
              <div className="flex items-center gap-1.5">{group.feeds.map(feedChip)}</div>
            </div>
          ) : (
            group.feeds.map(feedChip)
          ),
        )}
      </div>
      <div role="tablist" aria-label="Categories" className="-mx-1 mt-1.5 flex items-center gap-1 overflow-x-auto px-1 pb-1">
        {CATEGORIES.map((category) => (
          <CategoryChip
            key={category.id}
            selected={feed === `cat:${category.id}`}
            onClick={() => pickFeed(`cat:${category.id}`)}
            count={tradable.markets.length ? categoryCounts[category.id] : null}
          >
            {category.label}
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
            { id: "calendar", label: "Calendar", icon: CalendarDays, showLabel: true },
          ]}
        />
        {view !== "calendar" && sortOptions.length > 1 ? (
          <Segmented
            label="Sort"
            value={columnSort ? null : sort}
            onChange={(next) => {
              setSort(next);
              setColumnSort(null);
              setResetKey((value) => value + 1);
            }}
            options={sortOptions}
          />
        ) : null}
        <span className="text-[12px] tabular-nums text-muted-foreground">
          {loading && !gammaFeed && tradable.markets.length ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="size-3 animate-spin" aria-hidden />
              {selectedLabel} · {base.length.toLocaleString()} loaded so far
            </span>
          ) : (
            `${selectedLabel} · ${base.length.toLocaleString()}`
          )}
        </span>
        {statsProgress ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] tabular-nums text-muted-foreground" title="Sorting needs every market's numbers, not just the ones on screen">
            <Loader2 className="size-3 animate-spin" aria-hidden />
            Getting numbers to sort · {Math.round((statsProgress.done / Math.max(1, statsProgress.total)) * 100)}%
          </span>
        ) : null}
        {columnSort && view === "cards" ? (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
            Sorted by {COLUMN_LABELS[columnSort.key]}
            {columnSort.dir === "asc" ? <ArrowUp className="size-3 text-foreground" aria-hidden /> : <ArrowDown className="size-3 text-foreground" aria-hidden />}
            <button type="button" onClick={clearColumnSort} className="rounded px-1 font-medium text-foreground hover:bg-muted">
              Clear
            </button>
          </span>
        ) : null}
        <span className="ml-auto inline-flex items-center gap-3 text-[12px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5" title="Prices and trades for the markets on screen">
            <LiveDot status={live.status} />
            {live.status === "open" ? `Live · ${live.tradesPerMin.toLocaleString()} trades/min` : live.status === "idle" ? "Live" : "Connecting"}
          </span>
          <span className="inline-flex items-center gap-1.5" title="Polymarket announces each new market on this feed">
            <LiveDot status={discoveryStatus} />
            {discoveryStatus !== "open" ? "Connecting to new markets" : paused ? "Watching for new markets · alerts paused" : "Watching for new markets"}
          </span>
        </span>
      </div>

      {error ? (
        <p className="mt-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[12.5px] text-amber-800 dark:text-amber-200">
          {error}
          <button type="button" onClick={() => setRetry((value) => value + 1)} className="ml-auto font-medium underline-offset-4 hover:underline">
            Try again
          </button>
        </p>
      ) : null}

      <div className="mt-3 overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
        {view === "calendar" ? (
          <MarketBrowseCalendar {...tableProps} markets={markets} closedFeed={feed === "closed"} />
        ) : view === "cards" ? (
          <MarketBrowseCards {...tableProps} markets={markets} resetKey={`${feed}|${sort}|${resetKey}`} empty={emptyText} />
        ) : (
          <MarketBrowseTable
            {...tableProps}
            markets={markets}
            resetKey={`${feed}|${sort}|${resetKey}`}
            empty={emptyText}
            sort={columnSort}
            onSort={sortByHeader}
            onClearSort={clearColumnSort}
          />
        )}
      </div>
    </section>
  );
}
