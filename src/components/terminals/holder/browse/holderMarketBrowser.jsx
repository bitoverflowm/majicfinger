"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellOff, CalendarDays, List, Loader2 } from "lucide-react";
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
  forgetStats,
  inCategory,
  loadFeed,
  loadTradable,
  rememberStats,
  withStats,
} from "./marketBrowseFeeds";
import { MarketBrowseCalendar } from "./marketBrowseCalendar";
import { MarketBrowseTable } from "./marketBrowseTable";
import { useLiveQuotes, useNewMarketFeed } from "./useMarketBrowseLive";

const MUTE_KEY = "lychee:holderTerminal:muteNewMarkets";
/** The socket takes a few hundred assets comfortably; more than a screenful isn't needed. */
const MAX_LIVE_ASSETS = 200;
/** Gamma lists a new market a few seconds after the socket announces it. */
const ENRICH_DELAYS_MS = [4000, 20_000];
const TOAST_MS = 9000;

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
  closed: ["resolved", "volume"],
  volume: ["volume", "newest", "closing"],
  liquidity: ["liquidity", "newest", "closing"],
  trending: ["movers", "volume", "closing"],
};

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

function Chip({ selected, onClick, children, count }) {
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

function Segmented({ label, value, options, onChange }) {
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

function NewMarketToast({ markets, onOpen, onShowAll }) {
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
      <div className="mt-3 flex justify-end gap-2">
        <button type="button" onClick={onShowAll} className="rounded-md px-2.5 py-1.5 text-[12px] font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
          {more ? "See all new" : "See in list"}
        </button>
        <button type="button" onClick={() => onOpen(first)} className="rounded-md bg-[#2f6fed] px-2.5 py-1.5 text-[12px] font-medium text-white hover:bg-[#2f6fed]/90">
          Open market
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
 * @param {{ onPick: (subjects: object[]) => void, className?: string }} props
 */
export function HolderMarketBrowser({ onPick, className }) {
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
  const [, setStatsVersion] = useState(0);
  const [muted, setMuted] = useState(false);
  const [retry, setRetry] = useState(0);
  const mutedRef = useRef(false);
  mutedRef.current = muted;
  const toastRef = useRef(null);

  useEffect(() => {
    try {
      setMuted(window.localStorage.getItem(MUTE_KEY) === "1");
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

  const gammaFeed = FEED_SORTS[feed] && feed !== "tradable" ? feed : "";
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

  const allTradable = useMemo(() => {
    if (!liveNew.length) return tradable.markets;
    const known = new Set(tradable.markets.map((market) => market.conditionId));
    return [...liveNew.filter((market) => !known.has(market.conditionId)), ...tradable.markets];
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
    return allTradable;
  }, [allTradable, categoryId, feeds, gammaFeed]);

  const markets = useMemo(() => sortMarkets(base, sort), [base, sort]);

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

  const showNewest = useCallback(() => {
    setFeed("tradable");
    setView("list");
    setSort("newest");
    setResetKey((value) => value + 1);
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
      if (mutedRef.current) return;
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
            onOpen={(market) => {
              toast.dismiss(id);
              open(market);
            }}
            onShowAll={() => {
              toast.dismiss(id);
              showNewest();
            }}
          />
        ),
        { id: toastId, duration: TOAST_MS, onDismiss: () => (toastRef.current = null), onAutoClose: () => (toastRef.current = null) },
      );
    },
    [enrich, open, showNewest],
  );

  const onResolved = useCallback((msg) => {
    const id = String(msg?.market || "").trim();
    if (!id) return;
    setResolved((prev) => new Map(prev).set(id, String(msg?.winning_outcome || "Resolved")));
  }, []);

  const discoveryStatus = useNewMarketFeed({ assetIds: discoveryAssets, onNewMarkets, onResolved });

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    try {
      window.localStorage.setItem(MUTE_KEY, next ? "1" : "0");
    } catch {
      /* storage blocked */
    }
  };

  const feedState = gammaFeed ? feeds[gammaFeed] : null;
  const loading = gammaFeed ? !!feedState?.loading || !feedState : !tradable.done;
  const error = gammaFeed ? feedState?.error : tradable.error;
  const selectedLabel = categoryId
    ? `${CATEGORIES.find((category) => category.id === categoryId)?.label} markets`
    : FEEDS.find((item) => item.id === feed)?.label;
  const sortOptions = sortsFor(categoryId ? "tradable" : feed).map((id) => ({ id, label: SORTS[id].label }));
  const tableProps = { live, arrivals, resolved, onPick: open, onVisible: setVisible };
  const emptyText = loading ? (
    <>
      <Loader2 className="size-3.5 animate-spin" aria-hidden />
      Loading markets
    </>
  ) : (
    "No markets here right now"
  );

  return (
    <section aria-label="Browse markets" className={className}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-semibold text-foreground">Browse markets</h3>
          <p className="mt-0.5 text-[13px] text-muted-foreground">Every market you can trade on Polymarket right now, streaming live. Pick one to open it.</p>
        </div>
        <button
          type="button"
          onClick={toggleMute}
          aria-pressed={!muted}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          {muted ? <BellOff className="size-3.5" aria-hidden /> : <Bell className="size-3.5" aria-hidden />}
          {muted ? "New market alerts off" : "New market alerts on"}
        </button>
      </div>

      <div role="tablist" aria-label="Markets to show" className="-mx-1 mt-3 flex items-center gap-1.5 overflow-x-auto px-1 pb-1">
        {FEEDS.map((item) => (
          <Chip
            key={item.id}
            selected={feed === item.id}
            onClick={() => pickFeed(item.id)}
            count={item.id === "tradable" ? (allTradable.length || null) : feeds[item.id]?.markets?.length || null}
          >
            {item.label}
          </Chip>
        ))}
        <span className="mx-1 h-5 w-px shrink-0 bg-border" aria-hidden />
        {CATEGORIES.map((category) => (
          <Chip
            key={category.id}
            selected={feed === `cat:${category.id}`}
            onClick={() => pickFeed(`cat:${category.id}`)}
            count={tradable.markets.length ? categoryCounts[category.id] : null}
          >
            {category.label}
          </Chip>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <Segmented
          label="View"
          value={view}
          onChange={setView}
          options={[
            { id: "list", label: "List", icon: List, showLabel: true },
            { id: "calendar", label: "Calendar", icon: CalendarDays, showLabel: true },
          ]}
        />
        {view === "list" && sortOptions.length > 1 ? (
          <Segmented
            label="Sort"
            value={sort}
            onChange={(next) => {
              setSort(next);
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
        <span className="ml-auto inline-flex items-center gap-3 text-[12px] text-muted-foreground">
          <span className="inline-flex items-center gap-1.5" title="Prices and trades for the markets on screen">
            <LiveDot status={live.status} />
            {live.status === "open" ? `Live · ${live.tradesPerMin.toLocaleString()} trades/min` : live.status === "idle" ? "Live" : "Connecting"}
          </span>
          <span className="inline-flex items-center gap-1.5" title="Polymarket announces each new market on this feed">
            <LiveDot status={discoveryStatus} />
            {discoveryStatus === "open" ? "Watching for new markets" : "Connecting to new markets"}
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
        ) : (
          <MarketBrowseTable {...tableProps} markets={markets} resetKey={`${feed}|${sort}|${resetKey}`} empty={emptyText} />
        )}
      </div>
    </section>
  );
}
