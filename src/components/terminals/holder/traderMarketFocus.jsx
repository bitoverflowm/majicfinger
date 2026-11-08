"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronsUpDown, ExternalLink, Loader2, Search, X, ZoomIn, ZoomOut } from "lucide-react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { LiveDot } from "./holderMarketView";
import { DAY_MS, DAY_YEAR, FULL_TIME, HOUR, MINUTE, timeTicks } from "./chartTime";
import { NEWS_COLOR, NewsList, NewsMarkers, NewsNearMove, NewsTermsBar, NewsVolumeBars, newsVolume, useNewsTerms } from "./marketNews";
import { useMarketNews } from "./useMarketNews";
import { SummaryTile } from "./traderFinishedBets";
import { isResolved, num, pnlTone, secondsMs, signedUsd, when } from "./traderPositionsTable";
import { MarketIcon, cents, shares, tradeValue, usd } from "./traderTradesTable";
import { useLiveMarketMeta, useLiveMarketStats } from "./useLiveMarketMeta";
import { fetchPriceHistory } from "./useMarketPriceHistory";

const CONDITION_ID = /^0x[a-fA-F0-9]{64}$/;
const PAGE = 1000;
const MAX_PAGES = 10;
/** Trades move the position; redeeming, merging and splitting settle or create shares, so realized PnL needs them too. */
const ACTIVITY_TYPES = "TRADE,REDEEM,MERGE,SPLIT";
/** Same-second events: shares arrive before they leave. */
const TYPE_ORDER = { SPLIT: 0, TRADE: 1, MERGE: 2, RESOLVE: 3, REDEEM: 4 };
const POLL_MS = 10_000;
const POLL_ROWS = 100;
const PRICE_REFRESH_MS = 60_000;
/** Quotes closer together than this replace the last live point instead of adding one. */
const LIVE_GAP_SEC = 2;
/** Past this many dots, moves close in time on the same side and outcome share one dot. */
const MAX_MARKERS = 400;
const FRESH_MS = 15_000;
const MIN_PAD_MS = 15 * 60_000;
const FALLBACK_SPAN_MS = 30 * 24 * 60 * 60_000;
const PICKER_ROWS = 200;
const MIN_RADIUS = 3.5;
const RADIUS_RANGE = 13;
/** Dots size against the market's biggest move, but never against less than this, so a lone $2 trade stays small. */
const SIZE_FLOOR_USD = 100;
const OUTCOME_COLORS = ["#10b981", "#f43f5e"];
const EMPTY = [];

const PRICE_STEPS = [0.01, 0.02, 0.05, 0.1, 0.25];
const MIN_VIEW_MS = 5 * MINUTE;
/** Wait this long after the view stops moving before fetching finer prices for it. */
const DETAIL_DELAY_MS = 350;
/** Plot area offsets inside the chart: the left margin plus the price axis, the right margin, the top margin and the time axis. */
const PLOT_LEFT = 48;
const PLOT_RIGHT = 18;
const PLOT_TOP = 18;
const X_AXIS_HEIGHT = 30;

const USD_AXIS = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });

const STATES = {
  open: { rank: 2, label: "Open position" },
  finished: { rank: 1, label: "Finished" },
  traded: { rank: 0, label: "Traded" },
};

/**
 * Every market the trader has a trade, position or finished bet in, most recent first. The market
 * they were found from (`fromMarket`) leads the list.
 */
export function marketChoices({ trades, positions, bets, fromMarket }) {
  const byId = new Map();
  const touch = (id, row, ms, state) => {
    const conditionId = String(id || "");
    if (!CONDITION_ID.test(conditionId)) return null;
    let entry = byId.get(conditionId);
    if (!entry) {
      entry = { conditionId, title: "", slug: "", icon: "", lastMs: 0, state: "traded", pnl: null, origin: false };
      byId.set(conditionId, entry);
    }
    entry.title ||= String(row.title || "");
    entry.slug ||= String(row.slug || "");
    entry.icon ||= String(row.icon || "");
    if (ms) entry.lastMs = Math.max(entry.lastMs, ms);
    if (STATES[state].rank > STATES[entry.state].rank) entry.state = state;
    return entry;
  };
  const addPnl = (entry, value) => {
    if (entry && Number.isFinite(value)) entry.pnl = (entry.pnl ?? 0) + value;
  };
  for (const row of trades) touch(row.condition_id, row, secondsMs(row.timestamp), "traded");
  for (const row of positions) {
    if (isResolved(row)) continue;
    const entry = touch(row.condition_id, row, secondsMs(row.last_event_at), (num(row.current_size) ?? 0) > 0 ? "open" : "traded");
    addPnl(entry, num(row.total_pnl));
  }
  for (const bet of bets) addPnl(touch(bet.condition_id, bet, bet.finishedAt, "finished"), bet.pnl);
  if (fromMarket) {
    const entry = touch(fromMarket.conditionId, fromMarket, 0, "traded");
    if (entry) entry.origin = true;
  }
  return [...byId.values()].sort((a, b) => Number(b.origin) - Number(a.origin) || b.lastMs - a.lastMs);
}

function choiceDetail(choice) {
  return [
    choice.origin ? "Where you found this trader" : "",
    STATES[choice.state].label,
    choice.lastMs ? `last move ${when(choice.lastMs)}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

function MarketPicker({ choices, selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const current = choices.find((choice) => choice.conditionId === selected);
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? choices.filter((choice) => choice.title.toLowerCase().includes(q)) : choices;
  }, [choices, query]);
  const close = () => {
    setOpen(false);
    setQuery("");
  };
  return (
    <Popover open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex min-w-0 max-w-2xl flex-1 items-center gap-2.5 rounded-lg border border-border/70 bg-background px-3 py-2 text-left shadow-sm transition-colors hover:bg-muted/40"
        >
          {current ? <MarketIcon src={current.icon} title={current.title} size={30} /> : null}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[13.5px] font-medium text-foreground">{current?.title || "Pick a market"}</span>
            <span className="block truncate text-[11.5px] text-muted-foreground">
              {current ? choiceDetail(current) : `${choices.length.toLocaleString()} markets`}
            </span>
          </span>
          {current?.pnl != null ? (
            <span className={cn("shrink-0 font-mono text-[12px] tabular-nums", pnlTone(current.pnl))}>{signedUsd(current.pnl)}</span>
          ) : null}
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(640px,calc(100vw-2rem))] p-0">
        <div className="flex items-center gap-2 border-b border-border/70 px-3">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${choices.length.toLocaleString()} markets`}
            className="h-10 min-w-0 flex-1 bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
          />
        </div>
        <ul role="listbox" aria-label="Markets this trader has traded" className="max-h-[360px] overflow-y-auto py-1">
          {matches.slice(0, PICKER_ROWS).map((choice) => (
            <li key={choice.conditionId}>
              <button
                type="button"
                role="option"
                aria-selected={choice.conditionId === selected}
                onClick={() => {
                  onSelect(choice.conditionId);
                  close();
                }}
                className={cn(
                  "flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-muted/60",
                  choice.conditionId === selected && "bg-muted/60",
                )}
              >
                <MarketIcon src={choice.icon} title={choice.title} size={24} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-foreground">{choice.title || choice.conditionId}</span>
                  <span className="block truncate text-[11.5px] text-muted-foreground">{choiceDetail(choice)}</span>
                </span>
                {choice.pnl != null ? (
                  <span className={cn("shrink-0 font-mono text-[12px] tabular-nums", pnlTone(choice.pnl))}>{signedUsd(choice.pnl)}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
        {matches.length > PICKER_ROWS || !matches.length ? (
          <p className="border-t border-border/70 px-3 py-2 text-[11.5px] text-muted-foreground">
            {matches.length
              ? `Showing the ${PICKER_ROWS} most recent of ${matches.length.toLocaleString()}. Search to narrow.`
              : "No market matches."}
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

function fillKey(row) {
  return [
    String(row.type || "TRADE").toUpperCase(),
    String(row.transaction_hash || "").toLowerCase(),
    String(row.side || "").toUpperCase(),
    Number(row.outcome_index),
    Number(row.size),
    Number(row.timestamp),
  ].join("|");
}

function activityType(row) {
  return String(row.type || "TRADE").toUpperCase();
}

async function fillsPage(wallet, conditionId, limit, cursor, signal) {
  const params = new URLSearchParams({
    query: "getTraderActivity",
    user: wallet,
    type: ACTIVITY_TYPES,
    condition: conditionId,
    limit: String(limit),
    sort_direction: "DESC",
    skipFlatten: "true",
  });
  if (cursor) params.set("cursor", cursor);
  const res = await fetch(`/api/integrations/polymarket?${params.toString()}`, {
    headers: { Accept: "application/json" },
    credentials: "same-origin",
    signal,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.message || "Couldn't load this trader's trades in the market.");
  const body = Array.isArray(data) ? data[0] : data;
  return {
    rows: Array.isArray(body?.data) ? body.data : [],
    next: body?.pagination?.has_more ? String(body.pagination.next_cursor || "") : "",
  };
}

const NO_FILLS = { key: "", rows: EMPTY, status: "loading", error: "", truncated: false, updatedAt: 0 };

/**
 * Every fill the wallet has in one market, newest first: all of them up front, then checked every
 * 10 seconds and straight away when `lastTrade` (the wallet's newest trade anywhere) lands here.
 * `arrivals` maps fills that came in after the first load to when they arrived.
 */
function useMarketFills(wallet, conditionId, lastTrade) {
  const key = wallet && conditionId ? `${wallet}|${conditionId}` : "";
  const [part, setPart] = useState(NO_FILLS);
  const arrivals = useRef(new Map());
  const kick = useRef(null);

  useEffect(() => {
    if (!key) return undefined;
    const abort = new AbortController();
    let timer = 0;
    let ready = false;
    arrivals.current = new Map();
    setPart({ ...NO_FILLS, key });
    const schedule = () => {
      window.clearTimeout(timer);
      if (!abort.signal.aborted) timer = window.setTimeout(poll, POLL_MS);
    };
    const poll = () =>
      fillsPage(wallet, conditionId, POLL_ROWS, "", abort.signal)
        .then(({ rows }) => {
          if (abort.signal.aborted) return;
          setPart((prev) => {
            const seen = new Set(prev.rows.map(fillKey));
            const added = rows.filter((row) => {
              const id = fillKey(row);
              if (seen.has(id)) return false;
              seen.add(id);
              arrivals.current.set(id, Date.now());
              return true;
            });
            return {
              ...prev,
              rows: added.length ? added.concat(prev.rows) : prev.rows,
              status: "ready",
              error: "",
              updatedAt: Date.now(),
            };
          });
        })
        .catch(() => {})
        .finally(schedule);
    kick.current = () => {
      if (ready) void poll();
    };
    (async () => {
      let rows = [];
      let cursor = "";
      let pages = 0;
      do {
        const page = await fillsPage(wallet, conditionId, PAGE, cursor, abort.signal);
        rows = rows.concat(page.rows);
        cursor = page.next;
        pages += 1;
      } while (cursor && pages < MAX_PAGES);
      return { rows, truncated: !!cursor };
    })()
      .then(({ rows, truncated }) => {
        if (abort.signal.aborted) return;
        setPart({ key, rows, status: "ready", error: "", truncated, updatedAt: Date.now() });
      })
      .catch((err) => {
        if (abort.signal.aborted || err?.name === "AbortError") return;
        setPart((prev) => ({ ...prev, status: "error", error: err?.message || "Couldn't load this trader's trades in the market." }));
      })
      .finally(() => {
        ready = true;
        schedule();
      });
    return () => {
      abort.abort();
      window.clearTimeout(timer);
      kick.current = null;
    };
  }, [key, wallet, conditionId]);

  const lastCondition = String(lastTrade?.condition_id || "");
  useEffect(() => {
    if (lastTrade && lastCondition === conditionId) kick.current?.();
    // Only a new newest trade should trigger a check.
  }, [lastTrade]);

  return part.key === key ? { ...part, arrivals: arrivals.current } : { ...NO_FILLS, arrivals: arrivals.current };
}

function withPrice(move) {
  return { ...move, p: move.shares > 0 ? Math.min(1, Math.max(0, move.usd / move.shares)) : null };
}

/** Fills grouped into moves: one per order, i.e. per transaction, side and outcome. Oldest first. */
function movesOf(fills, arrivals) {
  const groups = new Map();
  for (const fill of fills) {
    if (activityType(fill) !== "TRADE") continue;
    const ms = secondsMs(fill.timestamp);
    const size = num(fill.size);
    if (ms == null || !size) continue;
    const side = String(fill.side || "").toUpperCase() === "SELL" ? "SELL" : "BUY";
    const index = Number(fill.outcome_index) === 1 ? 1 : 0;
    const hash = String(fill.transaction_hash || "");
    const key = `${hash || ms}|${side}|${index}`;
    let move = groups.get(key);
    if (!move) {
      move = { key, t: ms, side, index, outcome: String(fill.outcome || ""), shares: 0, usd: 0, fills: 0, hash, arrivedAt: 0, merged: 1 };
      groups.set(key, move);
    }
    move.t = Math.min(move.t, ms);
    move.shares += size;
    move.usd += tradeValue(fill) || 0;
    move.fills += 1;
    move.arrivedAt = Math.max(move.arrivedAt, arrivals.get(fillKey(fill)) || 0);
  }
  return [...groups.values()].map(withPrice).sort((a, b) => a.t - b.t);
}

function thin(moves) {
  if (moves.length <= MAX_MARKERS) return moves;
  const first = moves[0].t;
  const bucket = Math.max(1, (moves[moves.length - 1].t - first) / (MAX_MARKERS / 4));
  const groups = new Map();
  for (const move of moves) {
    const key = `${Math.floor((move.t - first) / bucket)}|${move.side}|${move.index}`;
    const group = groups.get(key);
    if (!group) {
      groups.set(key, { ...move, key });
      continue;
    }
    group.shares += move.shares;
    group.usd += move.usd;
    group.fills += move.fills;
    group.merged += move.merged;
    group.arrivedAt = Math.max(group.arrivedAt, move.arrivedAt);
    group.hash = "";
  }
  return [...groups.values()].map(withPrice).sort((a, b) => a.t - b.t);
}

function marketTotals(moves, positions, bets, conditionId) {
  const totals = { bought: 0, sold: 0, boughtShares: [0, 0], soldShares: [0, 0], fills: 0, holdings: [], value: 0, pnl: null };
  for (const move of moves) {
    totals.fills += move.fills;
    if (move.side === "BUY") {
      totals.bought += move.usd;
      totals.boughtShares[move.index] += move.shares;
    } else {
      totals.sold += move.usd;
      totals.soldShares[move.index] += move.shares;
    }
  }
  const addPnl = (value) => {
    if (Number.isFinite(value)) totals.pnl = (totals.pnl ?? 0) + value;
  };
  for (const row of positions) {
    if (row.condition_id !== conditionId || isResolved(row)) continue;
    addPnl(num(row.total_pnl));
    const size = num(row.current_size) ?? 0;
    if (size <= 0) continue;
    totals.holdings.push({ outcome: row.outcome, size });
    totals.value += num(row.current_value) ?? 0;
  }
  for (const bet of bets) if (bet.condition_id === conditionId) addPnl(bet.pnl);
  return totals;
}

/**
 * Realized PnL through time on average cost, per outcome. A buy adds shares at what it cost, a split
 * adds a share of each outcome for 50¢ apiece. A sell, a redeem or a merge realizes what came back
 * minus the average cost of the shares that left. Shares sold or redeemed beyond what the history
 * shows held realize nothing, since their cost isn't known. Once the market resolves (`resolution`:
 * `{ t, prices }`), whatever is still held is settled at the final prices, redeemed or not.
 */
export function realizedSeries(fills, resolution) {
  const rows = fills.filter((row) => secondsMs(row.timestamp) != null && TYPE_ORDER[activityType(row)] != null);
  if (resolution?.t) rows.push({ type: "RESOLVE", timestamp: resolution.t / 1000, size: 1 });
  const ordered = rows.sort(
    (a, b) => Number(a.timestamp) - Number(b.timestamp) || TYPE_ORDER[activityType(a)] - TYPE_ORDER[activityType(b)],
  );
  const held = [
    { shares: 0, cost: 0 },
    { shares: 0, cost: 0 },
  ];
  const takeOut = (index, qty) => {
    const pos = held[index];
    const taken = Math.min(qty, pos.shares);
    const basis = pos.shares > 0 ? (pos.cost / pos.shares) * taken : 0;
    pos.shares -= taken;
    pos.cost -= basis;
    if (pos.shares < 1e-9) {
      pos.shares = 0;
      pos.cost = 0;
    }
    return { taken, basis };
  };
  const points = [];
  const events = [];
  const totals = { realized: 0, fromSells: 0, fromSettling: 0 };
  for (const row of ordered) {
    const type = activityType(row);
    const t = secondsMs(row.timestamp);
    const size = num(row.size) ?? 0;
    const usdc = num(row.usdc_size) ?? 0;
    const index = Number(row.outcome_index) === 1 ? 1 : 0;
    if (!points.length) points.push({ t, realized: 0 });
    if (size <= 0) continue;
    let gain = null;
    let detail = null;
    if (type === "TRADE" && String(row.side || "").toUpperCase() !== "SELL") {
      held[index].shares += size;
      held[index].cost += usdc;
    } else if (type === "SPLIT") {
      for (const pos of held) {
        pos.shares += size;
        pos.cost += usdc / 2;
      }
    } else if (type === "RESOLVE") {
      const legs = [];
      gain = 0;
      held.forEach((pos, outcome) => {
        if (pos.shares <= 0) return;
        const price = num(resolution.prices?.[outcome]) ?? 0;
        const { taken, basis } = takeOut(outcome, pos.shares);
        gain += price * taken - basis;
        if (taken >= 0.01) legs.push({ index: outcome, outcome: String(resolution.outcomes?.[outcome] || ""), shares: taken, price });
      });
      if (!legs.length && Math.abs(gain) < 0.005) continue;
      detail = { kind: "Resolved", legs, index: legs[0]?.index ?? 0 };
    } else if (type === "MERGE") {
      const a = takeOut(0, size);
      const b = takeOut(1, size);
      const pairs = Math.min(a.taken, b.taken);
      gain = (usdc / size) * pairs - a.basis - b.basis;
      detail = { kind: "Merged", shares: size, price: usdc / size, basis: a.basis + b.basis };
    } else {
      const { taken, basis } = takeOut(index, size);
      if (type === "REDEEM" && taken === 0) continue;
      const price = usdc / size;
      gain = price * taken - basis;
      detail = { kind: type === "REDEEM" ? "Redeemed" : "Sold", shares: size, price, basis, avg: taken > 0 ? basis / taken : null };
    }
    if (gain == null) continue;
    totals.realized += gain;
    if (type === "TRADE") totals.fromSells += gain;
    else totals.fromSettling += gain;
    const event = { key: fillKey(row), t, gain, realized: totals.realized, index, outcome: String(row.outcome || ""), ...detail };
    if (type === "RESOLVE") event.key = "resolve";
    events.push(event);
    points.push({ t, realized: totals.realized, event });
  }
  totals.openCost = held[0].cost + held[1].cost;
  totals.openShares = [held[0].shares, held[1].shares];
  return { points, events, totals };
}

function RealizedTip({ active, payload, clock }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  const event = point.event;
  return (
    <div className="max-w-[260px] rounded-md border border-border/70 bg-background px-2.5 py-2 text-[12px] shadow-md">
      <div className="text-muted-foreground">{(clock ? FULL_TIME : DAY_YEAR).format(point.t)}</div>
      <div className={cn("font-mono font-semibold tabular-nums", pnlTone(point.realized))}>{signedUsd(point.realized)} realized</div>
      {event ? (
        <div className="mt-1.5 border-t border-border/60 pt-1.5">
          {event.legs ? (
            event.legs.map((leg) => (
              <div key={leg.index}>
                <span className="font-medium">{event.kind}</span> {shares(leg.shares)}{" "}
                <span style={{ color: OUTCOME_COLORS[leg.index] }}>{leg.outcome}</span> at {cents(leg.price)}
              </div>
            ))
          ) : (
            <div>
              <span className="font-medium">{event.kind}</span> {shares(event.shares)}{" "}
              <span style={{ color: OUTCOME_COLORS[event.index] }}>{event.kind === "Merged" ? "pairs" : event.outcome}</span> at {cents(event.price)}
            </div>
          )}
          {event.avg != null ? <div className="text-muted-foreground">Average cost {cents(event.avg)}</div> : null}
          <div className={cn("font-mono tabular-nums", pnlTone(event.gain))}>{signedUsd(event.gain)} on this</div>
        </div>
      ) : (
        <div className="text-[11px] text-muted-foreground">{point.live ? "Now" : "First move"}</div>
      )}
    </div>
  );
}

function RealizedDot({ cx, cy, payload, biggest }) {
  if (!payload?.event || !Number.isFinite(cx) || !Number.isFinite(cy)) return null;
  const { gain } = payload.event;
  const r = 2.5 + 8 * Math.sqrt(Math.abs(gain) / biggest);
  return <circle cx={cx} cy={cy} r={r} fill={gain >= 0 ? "#10b981" : "#f43f5e"} fillOpacity={0.85} stroke="var(--background)" strokeWidth={1.25} />;
}

/**
 * The wallet's realized PnL in one market as it builds up, a step for each sell, redeem or merge.
 * Follows the market live: new activity lands within seconds and the line runs on to now.
 */
function RealizedPnlChart({ fills, status, truncated, meta, now, polymarketRealized }) {
  const resolvedAt = meta?.closed && meta.winner ? meta.closeMs : 0;
  const finalPrices = (meta?.prices || []).join(",");
  const outcomeNames = (meta?.outcomes || []).join("\u0000");
  const series = useMemo(
    () =>
      realizedSeries(
        fills,
        resolvedAt ? { t: resolvedAt, prices: finalPrices.split(",").map(Number), outcomes: outcomeNames.split("\u0000") } : null,
      ),
    [fills, resolvedAt, finalPrices, outcomeNames],
  );
  const { events, totals } = series;
  const following = meta && !meta.closed;
  const points = useMemo(() => {
    if (!series.points.length) return [];
    const last = series.points[series.points.length - 1];
    const end = following ? Math.max(now, last.t) : last.t;
    return end > last.t ? [...series.points, { t: end, realized: last.realized, live: true }] : series.points;
  }, [series.points, following, now]);
  const biggest = useMemo(() => events.reduce((max, event) => Math.max(max, Math.abs(event.gain)), 0) || 1, [events]);
  const from = points[0]?.t ?? 0;
  const to = points[points.length - 1]?.t ?? 0;
  const xAxis = useMemo(() => timeTicks(from, Math.max(to, from + MINUTE)), [from, to]);
  const clock = to - from < 2 * DAY_MS;
  const color = totals.realized >= 0 ? "#10b981" : "#f43f5e";
  const gaps = Number.isFinite(polymarketRealized) && Math.abs(polymarketRealized - totals.realized) >= 1;

  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryTile
          label="Realized PnL"
          value={status === "loading" ? "…" : signedUsd(totals.realized)}
          tone={pnlTone(totals.realized)}
          detail={`${events.length.toLocaleString()} ${events.length === 1 ? "step" : "steps"}: sells, merges and resolution`}
        />
        <SummaryTile label="From selling" value={signedUsd(totals.fromSells)} tone={pnlTone(totals.fromSells)} detail="Sale price over average cost" />
        <SummaryTile
          label="From resolution"
          value={signedUsd(totals.fromSettling)}
          tone={pnlTone(totals.fromSettling)}
          detail="Settled at resolution, or merged"
        />
        <SummaryTile
          label="Cost still open"
          value={usd(totals.openCost)}
          detail={totals.openCost > 0.005 ? "Not realized until sold or resolved" : "Nothing left at risk"}
          title="What the shares still held cost, at their average price"
        />
      </dl>
      <section aria-label="Cumulative realized PnL" className="rounded-xl border border-border/70 bg-background p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2">
          <p className="text-[12px] text-muted-foreground">
            {gaps
              ? `Polymarket reports ${signedUsd(polymarketRealized)} realized here; the line rebuilds it from each fill.`
              : "Each step is a sell, a merge or the market resolving. Dot size shows how much it realized."}
            {truncated ? ` Based on the first ${(PAGE * MAX_PAGES).toLocaleString()} fills.` : ""}
          </p>
          {meta ? <LiveDot on={following && status === "ready"} label={meta.closed ? "Market closed" : "Live"} /> : null}
        </div>
        <div className="h-[260px]">
          {status === "loading" ? (
            <Waiting label="Reading their activity in this market" />
          ) : !events.length || points.length < 2 ? (
            <p className="flex h-full items-center justify-center px-6 text-center text-[12px] text-muted-foreground">
              {fills.length
                ? "Nothing realized here yet. This wallet still holds what it bought, so its PnL here is all unrealized."
                : "No activity by this wallet in this market."}
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={points} margin={{ top: 12, right: PLOT_RIGHT, bottom: 0, left: 4 }}>
                <defs>
                  <linearGradient id="market-realized-pnl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={color} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} />
                <XAxis
                  dataKey="t"
                  type="number"
                  scale="time"
                  domain={[from, to]}
                  ticks={xAxis.ticks}
                  tickFormatter={xAxis.format}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  height={X_AXIS_HEIGHT}
                />
                <YAxis
                  tickFormatter={(value) => USD_AXIS.format(value)}
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={56}
                />
                <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.4} strokeDasharray="3 3" />
                <Tooltip content={<RealizedTip clock={clock} />} cursor={{ stroke: "var(--muted-foreground)", strokeOpacity: 0.4 }} />
                <Area
                  type="stepAfter"
                  dataKey="realized"
                  stroke={color}
                  strokeWidth={2}
                  fill="url(#market-realized-pnl)"
                  isAnimationActive={false}
                  dot={(props) => <RealizedDot key={props.index} {...props} biggest={biggest} />}
                  activeDot={{ r: 3, fill: color, stroke: "var(--background)" }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
    </div>
  );
}

function sharesByOutcome(counts, outcomes) {
  return counts
    .map((count, index) => (count > 0 ? `${shares(count)} ${outcomes[index]}` : ""))
    .filter(Boolean)
    .join(" · ");
}

/** The stretch of time the chart covers: around the trader's moves, or the market's whole life. */
function chartWindow(range, meta, moves, now) {
  const closeAt = meta.closed ? Math.min(meta.closeMs || now, now) : now;
  const openAt = meta.openMs || closeAt - FALLBACK_SPAN_MS;
  if (range === "all" || !moves.length) return { start: openAt, end: closeAt, follow: !meta.closed };
  const first = moves[0].t;
  const last = moves[moves.length - 1].t;
  const pad = Math.max(MIN_PAD_MS, (last - first) * 0.08);
  const start = Math.max(openAt, first - pad);
  const stop = last + Math.max(pad * 3, (last - first) * 0.25);
  if (!meta.closed && stop >= now) return { start, end: now, follow: true };
  return { start, end: Math.max(Math.min(closeAt, stop), last + 60_000), follow: false };
}

/** A zoomed view kept inside `full` and no narrower than five minutes; null once it covers everything. */
function clampView(start, end, full) {
  const fullSpan = full.end - full.start;
  const span = Math.min(Math.max(end - start, MIN_VIEW_MS), fullSpan);
  if (span >= fullSpan * 0.995) return null;
  const from = Math.min(Math.max(start, full.start), full.end - span);
  return { start: from, end: from + span, anchored: full.follow && from + span >= full.end - span * 0.005 };
}

/** The time range on screen. A view pushed to the live edge keeps following it. */
function resolveView(view, full) {
  if (!view) return [full.start, full.end];
  if (view.anchored) return [full.end - (view.end - view.start), full.end];
  return [view.start, view.end];
}

/** A price axis fitted to what's on screen, in steps of 1¢ up to 25¢. */
function priceAxis(lines, dots, from, to) {
  let lo = Infinity;
  let hi = -Infinity;
  const take = (p) => {
    if (p < lo) lo = p;
    if (p > hi) hi = p;
  };
  for (const points of lines) {
    let before = null;
    for (const point of points) {
      if (point.t < from) {
        before = point;
        continue;
      }
      if (before) {
        take(before.p);
        before = null;
      }
      take(point.p);
      if (point.t > to) break;
    }
    if (before) take(before.p);
  }
  for (const dot of dots) take(dot.p);
  if (!Number.isFinite(lo)) return { domain: [0, 1], ticks: [0, 0.25, 0.5, 0.75, 1] };
  const pad = Math.max(0.02, (hi - lo) * 0.08);
  lo = Math.max(0, lo - pad);
  hi = Math.min(1, hi + pad);
  const step = PRICE_STEPS.find((size) => (hi - lo) / size <= 6) ?? PRICE_STEPS[PRICE_STEPS.length - 1];
  lo = Math.max(0, Math.floor(lo / step + 1e-9) * step);
  hi = Math.min(1, Math.ceil(hi / step - 1e-9) * step);
  const ticks = [];
  for (let value = lo; value <= hi + 1e-9; value += step) ticks.push(Math.round(value * 100) / 100);
  return { domain: [lo, hi], ticks };
}

function livePriceList(prices) {
  return (prices || []).slice(0, 2).map((price) => (price == null || price === "" ? NaN : Number(price)));
}

/**
 * Both outcomes' price lines over `win`, refreshed each minute and extended by each live price while it
 * follows now. Inside `detail` (a zoomed range) the line is swapped for a finer fetch of just that range.
 */
function usePriceWindow(meta, win, livePrices, detail) {
  const tokens = (meta?.tokenIds || []).slice(0, 2).join(",");
  const startSec = win ? Math.floor(win.start / 60_000) * 60 : 0;
  const endSec = win && !win.follow ? Math.ceil(win.end / 1000) : 0;
  const key = tokens && win ? `${tokens}|${startSec}|${endSec}` : "";
  const [state, setState] = useState({ key: "", history: null, error: "" });
  const [live, setLive] = useState([[], []]);

  useEffect(() => {
    if (!key) return undefined;
    const abort = new AbortController();
    let timer = 0;
    setLive([[], []]);
    const load = () =>
      fetchPriceHistory(tokens.split(","), startSec, endSec || Date.now() / 1000, abort.signal)
        .then((history) => {
          if (abort.signal.aborted) return;
          setState({ key, history, error: "" });
          setLive((prev) => prev.map((points, index) => points.filter((point) => point.t > (history[index]?.at(-1)?.t ?? 0))));
        })
        .catch((err) => {
          if (abort.signal.aborted || err?.name === "AbortError") return;
          setState((prev) => (prev.key === key && prev.history ? prev : { key, history: null, error: err?.message || "Couldn't load the price history." }));
        })
        .finally(() => {
          if (!abort.signal.aborted && !endSec) timer = window.setTimeout(load, PRICE_REFRESH_MS);
        });
    void load();
    return () => {
      abort.abort();
      window.clearTimeout(timer);
    };
  }, [key, tokens, startSec, endSec]);

  const history = state.key === key ? state.history : null;
  const priceKey = win?.follow ? livePriceList(livePrices).join(",") : "";
  useEffect(() => {
    if (!history || !priceKey) return;
    const now = Date.now() / 1000;
    const prices = priceKey.split(",").map(Number);
    setLive((prev) => {
      let changed = false;
      const next = prev.map((points, index) => {
        const price = prices[index];
        if (!Number.isFinite(price)) return points;
        const last = points.at(-1) ?? history[index]?.at(-1);
        if (last && last.p === price) return points;
        changed = true;
        const recent = points.length && now - points[points.length - 1].t < LIVE_GAP_SEC;
        return [...(recent ? points.slice(0, -1) : points), { t: now, p: price }];
      });
      return changed ? next : prev;
    });
  }, [history, priceKey]);

  const detailKey =
    key && detail ? `${key}|${Math.floor(detail.start / MINUTE)}|${detail.anchored ? "now" : Math.ceil(detail.end / MINUTE)}` : "";
  const [fine, setFine] = useState({ key: "", start: 0, end: 0, history: null });
  useEffect(() => {
    if (!detailKey) return undefined;
    const abort = new AbortController();
    const end = detail.anchored ? Date.now() : detail.end;
    fetchPriceHistory(tokens.split(","), detail.start / 1000, end / 1000, abort.signal)
      .then((history) => {
        if (!abort.signal.aborted) setFine({ key: detailKey, start: detail.start, end, history });
      })
      .catch(() => {});
    return () => abort.abort();
    // The key captures everything about `detail` that changes the fetch.
  }, [detailKey]);
  const fineHistory = detailKey && fine.history && fine.key.startsWith(`${key}|`) ? fine : null;

  const lines = useMemo(() => {
    if (!history) return null;
    return [0, 1].map((index) => {
      const base = history[index] || [];
      const sharp = fineHistory?.history[index] || [];
      const points = sharp.length
        ? [
            ...base.filter((point) => point.t * 1000 < fineHistory.start),
            ...sharp,
            ...base.filter((point) => point.t * 1000 > fineHistory.end),
          ]
        : base;
      const lastT = points.at(-1)?.t ?? 0;
      return [...points, ...(live[index] || []).filter((point) => point.t > lastT)].map((point) => ({ t: point.t * 1000, p: point.p }));
    });
  }, [history, live, fineHistory]);
  return { lines, error: state.key === key ? state.error : "" };
}

function useBox(ref) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => setBox({ width: el.clientWidth, height: el.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return box;
}

function useNow(intervalMs) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!intervalMs) return undefined;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

function MoveDot({ cx, cy, payload, now, active, onEnter, onLeave, onPick }) {
  if (!Number.isFinite(cx) || !Number.isFinite(cy) || !payload) return null;
  const color = OUTCOME_COLORS[payload.index];
  const buy = payload.side === "BUY";
  const r = payload.r + (active ? 1.5 : 0);
  const fresh = payload.arrivedAt > 0 && now - payload.arrivedAt < FRESH_MS;
  return (
    <g
      className="cursor-pointer"
      onMouseEnter={() => onEnter(payload, cx, cy)}
      onMouseLeave={onLeave}
      onClick={(event) => {
        event.stopPropagation();
        onPick(payload, cx, cy);
      }}
    >
      {fresh ? (
        <circle cx={cx} cy={cy} r={r} fill={color} opacity={0.45} className="animate-ping" style={{ transformBox: "fill-box", transformOrigin: "center" }} />
      ) : null}
      {active ? <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke={color} strokeOpacity={0.35} strokeWidth={3} /> : null}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={buy ? color : "var(--background)"}
        fillOpacity={buy ? 0.78 : 0.9}
        stroke={buy ? "var(--background)" : color}
        strokeWidth={buy ? 1.25 : 2}
      />
    </g>
  );
}

function MoveTip({ shown, pinned, box, outcomes, livePrices, news, onClose }) {
  const { move, cx, cy } = shown;
  const buy = move.side === "BUY";
  const width = 272;
  const left = cx + 16 + width > box.width ? Math.max(0, cx - 16 - width) : cx + 16;
  const top = Math.min(Math.max(4, cy - 48), Math.max(4, box.height - (news.length ? 330 : 210)));
  const priceNow = livePriceList(livePrices)[move.index];
  const edge = Number.isFinite(priceNow) && move.p != null ? (buy ? priceNow - move.p : move.p - priceNow) : null;
  return (
    <div
      role="dialog"
      aria-label="Move details"
      style={{ left, top, width }}
      onClick={(event) => event.stopPropagation()}
      className={cn(
        "absolute z-10 rounded-lg border border-border/70 bg-background px-3 py-2.5 text-[12px] shadow-lg",
        pinned ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <span
            className={cn(
              "rounded px-1.5 py-0.5 text-[11px] font-semibold",
              buy ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300",
            )}
          >
            {buy ? "Bought" : "Sold"}
          </span>
          <span className="truncate font-medium" style={{ color: OUTCOME_COLORS[move.index] }}>
            {move.outcome || outcomes[move.index]}
          </span>
        </span>
        {pinned ? (
          <button type="button" onClick={onClose} className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close">
            <X className="size-3.5" aria-hidden />
          </button>
        ) : null}
      </div>
      <div className="mt-1 text-[11.5px] text-muted-foreground">{FULL_TIME.format(move.t)}</div>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <dt className="text-muted-foreground">Shares</dt>
        <dd className="text-right font-mono tabular-nums">{shares(move.shares)}</dd>
        <dt className="text-muted-foreground">Avg price</dt>
        <dd className="text-right font-mono tabular-nums">{cents(move.p)}</dd>
        <dt className="text-muted-foreground">Value</dt>
        <dd className="text-right font-mono font-semibold tabular-nums">{usd(move.usd)}</dd>
        {Number.isFinite(priceNow) ? (
          <>
            <dt className="text-muted-foreground">Price now</dt>
            <dd className="text-right font-mono tabular-nums">
              {cents(priceNow)}
              {edge != null && Math.abs(edge) >= 0.0005 ? (
                <span className={cn("ml-1.5", pnlTone(edge))} title={buy ? "Per share since buying" : "Per share versus selling"}>
                  {edge >= 0 ? "+" : "−"}
                  {cents(Math.abs(edge))}
                </span>
              ) : null}
            </dd>
          </>
        ) : null}
        {move.fills > 1 ? (
          <>
            <dt className="text-muted-foreground">Fills</dt>
            <dd className="text-right font-mono tabular-nums">{move.fills.toLocaleString()}</dd>
          </>
        ) : null}
      </dl>
      {move.merged > 1 ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {move.merged.toLocaleString()} moves close together, shown as one dot so the chart stays readable.
        </p>
      ) : null}
      <NewsNearMove articles={news} t={move.t} />
      {move.hash ? (
        pinned ? (
          <a
            href={`https://polygonscan.com/tx/${move.hash}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-medium text-[#2f6fed] hover:underline"
          >
            View transaction
            <ExternalLink className="size-3" aria-hidden />
          </a>
        ) : (
          <p className="mt-2 text-[11px] text-muted-foreground">Click the dot to pin this and open the transaction.</p>
        )
      ) : null}
    </div>
  );
}

/**
 * The price lines and move dots over `domain`. Pinch or ⌘/Ctrl-scroll zooms around the pointer,
 * sideways scroll or a drag pans, double-click zooms in. `onView(start, end)` asks for a new range.
 */
function MoveChart({ meta, lines, moves, domain, now, livePrices, pinned, setPinned, onView, zoomed, news, newsArrivals, pinnedNews, setPinnedNews }) {
  const [hover, setHover] = useState(null);
  const [dragging, setDragging] = useState(false);
  const wrapRef = useRef(null);
  const suppressClick = useRef(false);
  const box = useBox(wrapRef);
  const [from, to] = domain;
  const outcomes = [meta.outcomes?.[0] || "Yes", meta.outcomes?.[1] || "No"];
  const scaleUsd = useMemo(() => moves.reduce((max, move) => Math.max(max, move.usd), SIZE_FLOOR_USD), [moves]);
  const dots = useMemo(
    () =>
      moves
        .filter((move) => move.p != null)
        .map((move) => ({ ...move, r: MIN_RADIUS + RADIUS_RANGE * Math.sqrt(Math.max(0, move.usd) / scaleUsd) }))
        .sort((a, b) => b.usd - a.usd),
    [moves, scaleUsd],
  );
  const visible = useMemo(() => dots.filter((dot) => dot.t >= from && dot.t <= to), [dots, from, to]);
  const yAxis = useMemo(() => priceAxis(lines, visible, from, to), [lines, visible, from, to]);
  const xAxis = useMemo(() => timeTicks(from, to), [from, to]);
  const plot = {
    width: Math.max(1, box.width - PLOT_LEFT - PLOT_RIGHT),
    height: Math.max(1, box.height - PLOT_TOP - X_AXIS_HEIGHT),
  };
  const [low, high] = yAxis.domain;
  const shownMove = pinned || hover;
  const shown =
    shownMove && shownMove.t >= from && shownMove.t <= to && shownMove.p != null
      ? {
          move: shownMove,
          cx: PLOT_LEFT + ((shownMove.t - from) / (to - from)) * plot.width,
          cy: PLOT_TOP + (1 - (shownMove.p - low) / (high - low || 1)) * plot.height,
        }
      : null;

  const latest = useRef(null);
  latest.current = { from, to, plotWidth: plot.width, onView };
  const timeAt = (clientX) => {
    const rect = wrapRef.current.getBoundingClientRect();
    const { from: start, to: end, plotWidth } = latest.current;
    return start + ((clientX - rect.left - PLOT_LEFT) / plotWidth) * (end - start);
  };

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const onWheel = (event) => {
      const { from: start, to: end, plotWidth, onView: change } = latest.current;
      const span = end - start;
      const sideways = Math.abs(event.deltaX) > Math.abs(event.deltaY);
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const factor = Math.exp(Math.max(-0.5, Math.min(0.5, event.deltaY * 0.01)));
        const rect = el.getBoundingClientRect();
        const anchor = Math.min(end, Math.max(start, start + ((event.clientX - rect.left - PLOT_LEFT) / plotWidth) * span));
        const next = span * factor;
        const begin = anchor - (anchor - start) * (next / span);
        change(begin, begin + next);
      } else if (sideways || event.shiftKey) {
        event.preventDefault();
        const shift = ((sideways ? event.deltaX : event.deltaY) / plotWidth) * span;
        change(start + shift, end + shift);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (event) => {
    if (event.button !== 0 || event.target.closest?.("[role=dialog]")) return;
    const startX = event.clientX;
    const { from: start, to: end, plotWidth } = latest.current;
    let moved = false;
    const move = (next) => {
      const dx = next.clientX - startX;
      if (!moved && Math.abs(dx) < 4) return;
      if (!moved) {
        moved = true;
        setDragging(true);
        setHover(null);
      }
      const shift = (-dx / plotWidth) * (end - start);
      latest.current.onView(start + shift, end + shift);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (!moved) return;
      setDragging(false);
      suppressClick.current = true;
      window.setTimeout(() => (suppressClick.current = false), 0);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const shape = (props) => (
    <MoveDot
      {...props}
      now={now}
      active={shownMove?.key === props.payload?.key}
      onEnter={(move) => setHover(move)}
      onLeave={() => setHover(null)}
      onPick={(move) => {
        if (suppressClick.current) return;
        setPinned((prev) => (prev?.key === move.key ? null : move));
        setPinnedNews(null);
      }}
    />
  );

  return (
    <div
      ref={wrapRef}
      className={cn("relative h-full w-full select-none", zoomed && (dragging ? "cursor-grabbing" : "cursor-grab"))}
      onPointerDown={onPointerDown}
      onDoubleClick={(event) => {
        if (event.target.closest?.("[role=dialog]")) return;
        const anchor = timeAt(event.clientX);
        const begin = anchor - (anchor - from) / 2;
        onView(begin, begin + (to - from) / 2);
      }}
      onMouseLeave={() => setHover(null)}
      onClick={() => {
        if (suppressClick.current) return;
        setPinned(null);
        setPinnedNews(null);
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart margin={{ top: PLOT_TOP, right: PLOT_RIGHT, bottom: 0, left: PLOT_LEFT - 44 }}>
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={[from, to]}
            ticks={xAxis.ticks}
            allowDataOverflow
            tickFormatter={xAxis.format}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            height={X_AXIS_HEIGHT}
          />
          <YAxis
            type="number"
            domain={yAxis.domain}
            ticks={yAxis.ticks}
            allowDataOverflow
            tickFormatter={(value) => `${Math.round(value * 100)}¢`}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          {lines.map((points, index) => (
            <Line
              key={outcomes[index]}
              data={points}
              dataKey="p"
              name={outcomes[index]}
              type="linear"
              stroke={OUTCOME_COLORS[index]}
              strokeWidth={1.75}
              strokeOpacity={0.85}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          ))}
          <Scatter data={visible} dataKey="p" shape={shape} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <NewsMarkers
        articles={news}
        domain={domain}
        box={box}
        left={PLOT_LEFT}
        right={PLOT_RIGHT}
        guideBottom={PLOT_TOP + plot.height}
        arrivals={newsArrivals}
        now={now}
        pinned={pinnedNews}
        onPin={(key) => {
          setPinnedNews(key);
          if (key) setPinned(null);
        }}
      />
      {shown ? (
        <MoveTip shown={shown} pinned={!!pinned} box={box} outcomes={outcomes} livePrices={livePrices} news={news} onClose={() => setPinned(null)} />
      ) : null}
    </div>
  );
}

/**
 * The whole range in miniature with the zoomed part outlined. Drag the outline to move it, its edges
 * to resize it, or across the strip to pick a new range; a click centres the view there.
 */
function RangeStrip({ lines, moves, full, domain, zoomed, onView }) {
  const ref = useRef(null);
  const span = Math.max(1, full.end - full.start);
  const frac = (t) => Math.min(1, Math.max(0, (t - full.start) / span));
  const paths = useMemo(
    () =>
      lines.map((points) => {
        const inside = points.filter((point) => point.t >= full.start && point.t <= full.end);
        const step = Math.max(1, Math.ceil(inside.length / 600));
        let d = "";
        inside.forEach((point, index) => {
          if (index % step && index !== inside.length - 1) return;
          d += `${d ? "L" : "M"}${(((point.t - full.start) / span) * 1000).toFixed(1)} ${(37 - point.p * 32).toFixed(1)}`;
        });
        return d;
      }),
    [lines, full.start, span],
  );
  const [from, to] = domain;
  const left = frac(from) * 100;
  const width = Math.max(0.6, (frac(to) - frac(from)) * 100);

  const onPointerDown = (event) => {
    if (event.button !== 0) return;
    event.preventDefault();
    const rect = ref.current.getBoundingClientRect();
    const at = (clientX) => full.start + Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * span;
    const x0 = rect.left + frac(from) * rect.width;
    const x1 = rect.left + frac(to) * rect.width;
    const origin = at(event.clientX);
    const mode = !zoomed
      ? "pick"
      : Math.abs(event.clientX - x0) <= 6
        ? "left"
        : Math.abs(event.clientX - x1) <= 6
          ? "right"
          : event.clientX > x0 && event.clientX < x1
            ? "pan"
            : "pick";
    let moved = false;
    const move = (next) => {
      if (!moved && Math.abs(next.clientX - event.clientX) < 3) return;
      moved = true;
      const t = at(next.clientX);
      if (mode === "pan") onView(from + t - origin, to + t - origin);
      else if (mode === "left") onView(Math.min(t, to - MIN_VIEW_MS), to);
      else if (mode === "right") onView(from, Math.max(t, from + MIN_VIEW_MS));
      else onView(Math.min(origin, t), Math.max(origin, t));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (!moved && mode === "pick") onView(origin - (to - from) / 2, origin + (to - from) / 2);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <div
      ref={ref}
      role="group"
      aria-label="Whole range: drag to move or pick the zoomed part"
      onPointerDown={onPointerDown}
      className="relative h-10 cursor-crosshair touch-none select-none overflow-hidden rounded-md border border-border/60 bg-black/[0.02] dark:bg-white/[0.03]"
      style={{ marginLeft: PLOT_LEFT, marginRight: PLOT_RIGHT }}
    >
      <svg viewBox="0 0 1000 40" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" aria-hidden>
        {paths.map((d, index) => (
          <path key={index} d={d} fill="none" stroke={OUTCOME_COLORS[index]} strokeOpacity={0.6} strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ))}
        {moves.map((move) => (
          <line
            key={move.key}
            x1={frac(move.t) * 1000}
            x2={frac(move.t) * 1000}
            y1={1}
            y2={7}
            stroke={OUTCOME_COLORS[move.index]}
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
      {zoomed ? (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 bg-background/60" style={{ width: `${left}%` }} />
          <div className="pointer-events-none absolute inset-y-0 right-0 bg-background/60" style={{ width: `${Math.max(0, 100 - left - width)}%` }} />
          <div className="absolute inset-y-0 cursor-grab rounded-sm border border-[#2f6fed]/70 bg-[#2f6fed]/10" style={{ left: `${left}%`, width: `${width}%` }}>
            <span className="absolute inset-y-1.5 -left-[3px] w-[5px] cursor-ew-resize rounded-sm bg-[#2f6fed]" />
            <span className="absolute inset-y-1.5 -right-[3px] w-[5px] cursor-ew-resize rounded-sm bg-[#2f6fed]" />
          </div>
        </>
      ) : null}
    </div>
  );
}

function ZoomControls({ zoomed, onZoom, onReset }) {
  const button = "rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40";
  return (
    <div className="inline-flex items-center gap-0.5">
      <button type="button" className={button} onClick={() => onZoom(2)} disabled={!zoomed} aria-label="Zoom out" title="Zoom out">
        <ZoomOut className="size-4" aria-hidden />
      </button>
      <button type="button" className={button} onClick={() => onZoom(0.5)} aria-label="Zoom in" title="Zoom in">
        <ZoomIn className="size-4" aria-hidden />
      </button>
      {zoomed ? (
        <button
          type="button"
          onClick={onReset}
          className="rounded-md px-2 py-1 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          Reset zoom
        </button>
      ) : null}
    </div>
  );
}

function ChartLegend({ outcomes, livePrices, maxUsd, news }) {
  const prices = livePriceList(livePrices);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 pt-2 text-[11.5px] text-muted-foreground">
      {outcomes.map((outcome, index) => (
        <span key={outcome} className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: OUTCOME_COLORS[index] }} aria-hidden />
          {outcome}
          {Number.isFinite(prices[index]) ? <span className="font-mono tabular-nums text-foreground">{cents(prices[index])}</span> : null}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5">
        <svg width="12" height="12" aria-hidden>
          <circle cx="6" cy="6" r="5" fill="currentColor" fillOpacity={0.7} />
        </svg>
        Buy
      </span>
      <span className="inline-flex items-center gap-1.5">
        <svg width="12" height="12" aria-hidden>
          <circle cx="6" cy="6" r="4.5" fill="none" stroke="currentColor" strokeWidth={1.75} />
        </svg>
        Sell
      </span>
      <span className="inline-flex items-center gap-1.5">
        <svg width="30" height="16" aria-hidden>
          <circle cx="5" cy="8" r="3" fill="currentColor" fillOpacity={0.5} />
          <circle cx="20" cy="8" r="7" fill="currentColor" fillOpacity={0.5} />
        </svg>
        Bigger dot, bigger move{maxUsd > 0 ? ` (largest ${usd(maxUsd)})` : ""}
      </span>
      {news ? (
        <>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block size-2.5 rounded-[3px]" style={{ backgroundColor: NEWS_COLOR }} aria-hidden />
            Headlines, numbered when several are close together
          </span>
          <span className="inline-flex items-center gap-1.5">
            <svg width="14" height="12" aria-hidden>
              <rect x="1" y="6" width="3" height="6" fill={NEWS_COLOR} fillOpacity={0.6} />
              <rect x="5.5" y="2" width="3" height="10" fill={NEWS_COLOR} fillOpacity={0.6} />
              <rect x="10" y="8" width="3" height="4" fill={NEWS_COLOR} fillOpacity={0.6} />
            </svg>
            News volume
          </span>
        </>
      ) : null}
    </div>
  );
}

function RangeToggle({ range, onChange }) {
  const options = [
    { id: "moves", label: "Around their moves" },
    { id: "all", label: "Whole market" },
  ];
  return (
    <div className="inline-flex rounded-lg bg-black/[0.04] p-0.5 dark:bg-white/[0.06]" role="group" aria-label="Chart range">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={range === option.id}
          onClick={() => onChange(option.id)}
          className={cn(
            "rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors",
            range === option.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Waiting({ label }) {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-[12px] text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </div>
  );
}

/**
 * One market through this trader's eyes: pick any market they've traded, see its price with each of
 * their moves on it, sized by dollars, live as they trade. Opens on the market they were found from.
 */
export function TraderMarketFocus({ address, fromMarket, trades, positions, bets, lastTrade, onPickMarket }) {
  const wallet = String(address || "").toLowerCase();
  const originId = fromMarket?.conditionId || "";
  const originTitle = fromMarket?.title || "";
  const originSlug = fromMarket?.slug || "";
  const choices = useMemo(
    () => marketChoices({ trades, positions, bets, fromMarket: originId ? { conditionId: originId, title: originTitle, slug: originSlug } : null }),
    [trades, positions, bets, originId, originTitle, originSlug],
  );
  const [picked, setPicked] = useState("");
  useEffect(() => setPicked(""), [originId]);
  useEffect(() => {
    if (!picked && choices[0]) setPicked(choices[0].conditionId);
  }, [picked, choices]);
  const conditionId = picked;
  const choice = choices.find((item) => item.conditionId === conditionId);

  const [range, setRange] = useState("moves");
  const [pinned, setPinned] = useState(null);
  const [pinnedNews, setPinnedNews] = useState(null);
  const [view, setView] = useState(null);
  const [detail, setDetail] = useState(null);
  const chartRef = useRef(null);
  useEffect(() => {
    setPinned(null);
    setPinnedNews(null);
    setView(null);
  }, [conditionId, range]);

  const live = useLiveMarketMeta(conditionId);
  const meta = live.meta && live.meta.conditionId.toLowerCase() === conditionId.toLowerCase() ? live.meta : null;
  const stats = useLiveMarketStats(meta, live.quotes, EMPTY);
  const fills = useMarketFills(wallet, conditionId, lastTrade);
  const allMoves = useMemo(() => movesOf(fills.rows, fills.arrivals), [fills.rows, fills.arrivals]);
  const moves = useMemo(() => thin(allMoves), [allMoves]);
  const now = useNow(meta && !meta.closed ? 5000 : 0);
  const win = useMemo(
    () => (meta && fills.status !== "loading" ? chartWindow(range, meta, moves, now) : null),
    [meta, fills.status, range, moves, now],
  );
  const prices = usePriceWindow(meta, win, stats?.prices, detail);
  const totals = useMemo(() => marketTotals(allMoves, positions, bets, conditionId), [allMoves, positions, bets, conditionId]);
  const maxUsd = useMemo(() => moves.reduce((max, move) => Math.max(max, move.usd), 0), [moves]);
  const polymarketRealized = useMemo(() => {
    let sum = null;
    const add = (value) => {
      if (Number.isFinite(value)) sum = (sum ?? 0) + value;
    };
    for (const row of positions) if (row.condition_id === conditionId && !isResolved(row)) add(num(row.realized_pnl));
    for (const bet of bets) if (bet.condition_id === conditionId) add(bet.pnl);
    return sum;
  }, [positions, bets, conditionId]);

  const lastLine = prices.lines ? Math.max(prices.lines[0].at(-1)?.t ?? 0, prices.lines[1].at(-1)?.t ?? 0) : 0;
  const full = win
    ? { start: win.start, end: win.follow ? Math.max(now, lastLine, moves.at(-1)?.t ?? 0) : win.end, follow: win.follow }
    : null;
  const domain = full ? resolveView(view, full) : null;
  const changeView = (start, end) => {
    if (full) setView(clampView(start, end, full));
  };
  const zoomBy = (factor) => {
    if (!domain) return;
    const middle = (domain[0] + domain[1]) / 2;
    const half = ((domain[1] - domain[0]) * factor) / 2;
    changeView(middle - half, middle + half);
  };
  const wantsDetail = !!(view && full && domain[1] - domain[0] < (full.end - full.start) / 4);
  const detailSig = wantsDetail ? `${Math.floor(domain[0] / MINUTE)}|${view.anchored ? "now" : Math.ceil(domain[1] / MINUTE)}` : "";
  const domainRef = useRef(domain);
  domainRef.current = domain;
  useEffect(() => {
    if (!detailSig) {
      setDetail(null);
      return undefined;
    }
    const anchored = detailSig.endsWith("|now");
    const id = window.setTimeout(() => {
      const [start, end] = domainRef.current || [];
      if (start != null) setDetail({ start, end, anchored });
    }, DETAIL_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [detailSig]);

  const newsTerms = useNewsTerms(meta);
  const newsWin = !full
    ? null
    : detail
      ? { start: detail.start, end: detail.end, live: detail.anchored && full.follow }
      : { start: full.start, end: full.end, live: full.follow };
  const news = useMarketNews(newsTerms.terms, newsWin);
  const newsBars = domain ? newsVolume(news, domain) : null;
  const showNews = (article) => {
    if (!full) return;
    const span = Math.min(6 * HOUR, full.end - full.start);
    changeView(article.t - span / 2, article.t + span / 2);
    setPinned(null);
    setPinnedNews(null);
    chartRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  if (!choices.length) {
    return (
      <p className="rounded-xl border border-border/70 px-4 py-6 text-[13px] text-muted-foreground">
        No markets yet. Once this trader trades, their markets show up here.
      </p>
    );
  }

  const outcomes = [meta?.outcomes?.[0] || "Yes", meta?.outcomes?.[1] || "No"];
  const firstMove = allMoves[0];
  const lastMove = allMoves[allMoves.length - 1];
  const status =
    fills.status === "loading"
      ? "Reading their trades in this market"
      : fills.status === "error"
        ? fills.error
        : `${allMoves.length.toLocaleString()} moves${lastMove ? ` · last ${when(lastMove.t)}` : ""}${fills.truncated ? ` · first ${(PAGE * MAX_PAGES).toLocaleString()} fills` : ""}`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <MarketPicker choices={choices} selected={conditionId} onSelect={setPicked} />
        {choice && onPickMarket ? (
          <button
            type="button"
            onClick={() => onPickMarket({ kind: "market", conditionId, title: choice.title || meta?.title || "", slug: choice.slug || meta?.slug || "" })}
            className="rounded-lg border border-border/70 px-3 py-2 text-[12.5px] font-medium text-foreground shadow-sm transition-colors hover:bg-muted/50"
          >
            Open market
          </button>
        ) : null}
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryTile
          label="Moves"
          value={fills.status === "loading" ? "…" : allMoves.length.toLocaleString()}
          detail={firstMove ? `${totals.fills.toLocaleString()} fills · first ${when(firstMove.t)}` : "No trades here yet"}
          title="Orders placed in this market. One order can fill against several others at once."
        />
        <SummaryTile label="Bought" value={usd(totals.bought)} detail={sharesByOutcome(totals.boughtShares, outcomes) || "Nothing bought"} />
        <SummaryTile label="Sold" value={usd(totals.sold)} detail={sharesByOutcome(totals.soldShares, outcomes) || "Nothing sold"} />
        <SummaryTile
          label="Holding now"
          value={totals.holdings.length ? usd(totals.value) : "—"}
          detail={totals.holdings.length ? totals.holdings.map((item) => `${shares(item.size)} ${item.outcome}`).join(" · ") : "No open position"}
        />
        <SummaryTile
          label="PnL here"
          value={signedUsd(totals.pnl ?? NaN)}
          tone={pnlTone(totals.pnl ?? NaN)}
          detail={totals.pnl == null ? "No position recorded" : totals.holdings.length ? "Realized plus unrealized" : "Realized"}
        />
      </dl>

      {meta ? (
        <NewsTermsBar
          news={news}
          terms={newsTerms.terms}
          suggestions={newsTerms.suggestions}
          edited={newsTerms.edited}
          onChange={newsTerms.setTerms}
          onReset={newsTerms.reset}
        />
      ) : null}

      <section ref={chartRef} aria-label="Market price with this trader's moves" className="rounded-xl border border-border/70 bg-background p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2">
          <div className="flex flex-wrap items-center gap-2">
            <RangeToggle range={range} onChange={setRange} />
            {domain && prices.lines ? <ZoomControls zoomed={!!view} onZoom={zoomBy} onReset={() => setView(null)} /> : null}
          </div>
          <div className="flex min-w-0 items-center gap-3">
            <span className={cn("truncate text-[12px]", fills.status === "error" ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground")}>
              {status}
            </span>
            {meta ? <LiveDot on={!meta.closed && fills.status === "ready"} label={meta.closed ? "Market closed" : "Live"} /> : null}
          </div>
        </div>
        <div className="h-[380px]">
          {live.error && !meta ? (
            <p className="flex h-full items-center justify-center text-[12px] text-muted-foreground">{live.error}</p>
          ) : !meta || !win ? (
            <Waiting label={!meta ? "Loading the market" : "Reading their trades in this market"} />
          ) : prices.lines ? (
            <MoveChart
              meta={meta}
              lines={prices.lines}
              moves={moves}
              domain={domain}
              now={now}
              livePrices={stats?.prices}
              pinned={pinned}
              setPinned={setPinned}
              onView={changeView}
              zoomed={!!view}
              news={news.articles}
              newsArrivals={news.arrivals}
              pinnedNews={pinnedNews}
              setPinnedNews={setPinnedNews}
            />
          ) : prices.error ? (
            <p className="flex h-full items-center justify-center text-[12px] text-muted-foreground">{prices.error}</p>
          ) : (
            <Waiting label="Loading the price history" />
          )}
        </div>
        {meta && prices.lines && full ? (
          <div className="pt-1">
            {newsBars?.volume.length ? (
              <NewsVolumeBars volume={newsBars.volume} domain={domain} left={PLOT_LEFT} right={PLOT_RIGHT} label={newsBars.counted ? "Found" : "News"} />
            ) : null}
            <div className="h-2" />
            <RangeStrip lines={prices.lines} moves={moves} full={full} domain={domain} zoomed={!!view} onView={changeView} />
            <p className="mt-1.5 text-[11px] text-muted-foreground" style={{ marginLeft: PLOT_LEFT }}>
              Pinch, or hold ⌘ or Ctrl and scroll, to zoom. Drag the chart or scroll sideways to move along it. Drag across the
              strip to pick a range. Double-click to zoom in.
            </p>
          </div>
        ) : null}
        {meta ? <ChartLegend outcomes={outcomes} livePrices={stats?.prices} maxUsd={maxUsd} news={newsTerms.terms.length > 0} /> : null}
      </section>

      {meta && newsTerms.terms.length ? (
        <>
          <div className="max-w-3xl pt-2">
            <h3 className="text-[14px] font-semibold text-foreground">News in view</h3>
            <p className="mt-0.5 text-[13px] text-muted-foreground">
              Headlines that mention every word above, for the stretch on the chart. Each move&apos;s tooltip names the closest
              headline before and after it, so you can see who traded ahead of the news. Google News gives publish times for
              recent articles; GDELT gives the time it first saw an article, usually within 15 minutes. New headlines land
              here within a few minutes while the market is open.
            </p>
          </div>
          <NewsList
            articles={news.articles}
            terms={newsTerms.terms}
            domain={domain}
            arrivals={news.arrivals}
            now={now}
            onShow={showNews}
            empty={news.loading ? "Searching the news" : "No matching headlines in this stretch. Zoom out, or try fewer or different words."}
          />
        </>
      ) : null}

      <div className="max-w-3xl pt-5">
        <h3 className="text-[15px] font-semibold text-foreground">Cumulative realized PnL over time</h3>
        <p className="mt-0.5 text-[13px] text-muted-foreground">
          The money this wallet has locked in on this market, step by step. Each sell realizes its price over the average cost of
          the shares sold, and merging a pair back into $1 realizes the same way. When the market resolves, whatever is still held
          settles at $1 or $0, redeemed or not. Open shares count only once they leave. It updates live as new activity lands.
        </p>
      </div>
      <RealizedPnlChart
        fills={fills.rows}
        status={fills.status}
        truncated={fills.truncated}
        meta={meta}
        now={now}
        polymarketRealized={polymarketRealized}
      />
    </div>
  );
}
