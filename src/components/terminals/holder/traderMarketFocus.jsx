"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronsUpDown, ExternalLink, Loader2, Search, X } from "lucide-react";
import { CartesianGrid, ComposedChart, Line, ResponsiveContainer, Scatter, XAxis, YAxis } from "recharts";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { LiveDot } from "./holderMarketView";
import { SummaryTile } from "./traderFinishedBets";
import { isResolved, num, pnlTone, secondsMs, signedUsd, when } from "./traderPositionsTable";
import { MarketIcon, cents, shares, tradeValue, usd } from "./traderTradesTable";
import { useLiveMarketMeta, useLiveMarketStats } from "./useLiveMarketMeta";
import { fetchPriceHistory } from "./useMarketPriceHistory";

const CONDITION_ID = /^0x[a-fA-F0-9]{64}$/;
const PAGE = 1000;
const MAX_PAGES = 10;
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
const CLOCK_SPAN_MS = 2 * 24 * 60 * 60_000;
const PICKER_ROWS = 200;
const MIN_RADIUS = 3.5;
const RADIUS_RANGE = 13;
/** Dots size against the market's biggest move, but never against less than this, so a lone $2 trade stays small. */
const SIZE_FLOOR_USD = 100;
const OUTCOME_COLORS = ["#10b981", "#f43f5e"];
const EMPTY = [];

const DAY = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });
const CLOCK = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const FULL_TIME = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit",
});

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
  return [String(row.transaction_hash || "").toLowerCase(), String(row.side || "").toUpperCase(), Number(row.outcome_index), Number(row.size), Number(row.timestamp)].join("|");
}

async function fillsPage(wallet, conditionId, limit, cursor, signal) {
  const params = new URLSearchParams({
    query: "getTraderActivity",
    user: wallet,
    type: "TRADE",
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
  if (!meta.closed) return { start, end: now, follow: true };
  return { start, end: Math.max(Math.min(closeAt, last + pad * 3), last + 60_000), follow: false };
}

function livePriceList(prices) {
  return (prices || []).slice(0, 2).map((price) => (price == null || price === "" ? NaN : Number(price)));
}

/** Both outcomes' price lines over `win`, refreshed each minute and extended by each live price while it follows now. */
function usePriceWindow(meta, win, livePrices) {
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

  const lines = useMemo(
    () => (history ? [0, 1].map((index) => [...(history[index] || []), ...(live[index] || [])].map((point) => ({ t: point.t * 1000, p: point.p }))) : null),
    [history, live],
  );
  return { lines, error: state.key === key ? state.error : "" };
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

function MoveTip({ shown, pinned, box, outcomes, livePrices, onClose }) {
  const { move, cx, cy } = shown;
  const buy = move.side === "BUY";
  const width = 252;
  const left = cx + 16 + width > box.width ? Math.max(0, cx - 16 - width) : cx + 16;
  const top = Math.min(Math.max(4, cy - 48), Math.max(4, box.height - 210));
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

function MoveChart({ meta, lines, moves, win, now, livePrices, pinned, setPinned }) {
  const [hover, setHover] = useState(null);
  const wrapRef = useRef(null);
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
  const lastLine = Math.max(lines[0].at(-1)?.t ?? 0, lines[1].at(-1)?.t ?? 0);
  const end = win.follow ? Math.max(now, lastLine, moves.at(-1)?.t ?? 0) : win.end;
  const clock = end - win.start < CLOCK_SPAN_MS;
  const shown = pinned || hover;
  const box = { width: wrapRef.current?.clientWidth || 0, height: wrapRef.current?.clientHeight || 0 };

  const shape = (props) => (
    <MoveDot
      {...props}
      now={now}
      active={shown?.move.key === props.payload?.key}
      onEnter={(move, cx, cy) => setHover({ move, cx, cy })}
      onLeave={() => setHover(null)}
      onPick={(move, cx, cy) => setPinned((prev) => (prev?.move.key === move.key ? null : { move, cx, cy }))}
    />
  );

  return (
    <div ref={wrapRef} className="relative h-full w-full" onMouseLeave={() => setHover(null)} onClick={() => setPinned(null)}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart margin={{ top: 18, right: 18, bottom: 0, left: 4 }}>
          <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} />
          <XAxis
            dataKey="t"
            type="number"
            scale="time"
            domain={[win.start, end]}
            allowDataOverflow
            tickFormatter={(t) => (clock ? CLOCK : DAY).format(t)}
            tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            tickLine={false}
            axisLine={false}
            minTickGap={56}
          />
          <YAxis
            type="number"
            domain={[0, 1]}
            ticks={[0, 0.25, 0.5, 0.75, 1]}
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
          <Scatter data={dots} dataKey="p" shape={shape} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
      {shown ? (
        <MoveTip shown={shown} pinned={!!pinned} box={box} outcomes={outcomes} livePrices={livePrices} onClose={() => setPinned(null)} />
      ) : null}
    </div>
  );
}

function ChartLegend({ outcomes, livePrices, maxUsd }) {
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
  useEffect(() => setPinned(null), [conditionId, range]);

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
  const prices = usePriceWindow(meta, win, stats?.prices);
  const totals = useMemo(() => marketTotals(allMoves, positions, bets, conditionId), [allMoves, positions, bets, conditionId]);
  const maxUsd = useMemo(() => moves.reduce((max, move) => Math.max(max, move.usd), 0), [moves]);

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

      <section aria-label="Market price with this trader's moves" className="rounded-xl border border-border/70 bg-background p-3 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 px-1 pb-2">
          <RangeToggle range={range} onChange={setRange} />
          <div className="flex min-w-0 items-center gap-3">
            <span className={cn("truncate text-[12px]", fills.status === "error" ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground")}>
              {status}
            </span>
            {meta ? <LiveDot on={!meta.closed && fills.status === "ready"} label={meta.closed ? "Market closed" : "Live"} /> : null}
          </div>
        </div>
        <div className="h-[400px]">
          {live.error && !meta ? (
            <p className="flex h-full items-center justify-center text-[12px] text-muted-foreground">{live.error}</p>
          ) : !meta || !win ? (
            <Waiting label={!meta ? "Loading the market" : "Reading their trades in this market"} />
          ) : prices.lines ? (
            <MoveChart
              meta={meta}
              lines={prices.lines}
              moves={moves}
              win={win}
              now={now}
              livePrices={stats?.prices}
              pinned={pinned}
              setPinned={setPinned}
            />
          ) : prices.error ? (
            <p className="flex h-full items-center justify-center text-[12px] text-muted-foreground">{prices.error}</p>
          ) : (
            <Waiting label="Loading the price history" />
          )}
        </div>
        {meta ? <ChartLegend outcomes={outcomes} livePrices={stats?.prices} maxUsd={maxUsd} /> : null}
      </section>
    </div>
  );
}
