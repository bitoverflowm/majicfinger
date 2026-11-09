"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { polymarketGet } from "@/components/dashboardComposer/recipes/polymarketTradeHistorySource";
import { cn } from "@/lib/utils";
import { Segmented } from "./browse/holderMarketBrowser";
import { pnlTone, signedUsd } from "./traderPositionsTable";
import { usd } from "./traderTradesTable";

const WON_COLOR = "#10b981";
const LOST_COLOR = "#f43f5e";
/** Gamma returns at most 100 events a request. */
const EVENT_BATCH = 100;
const EVENT_CONCURRENCY = 4;
const HOUR_MS = 60 * 60_000;
const DAY_MS = 24 * HOUR_MS;
const CATEGORY_ROW_PX = 34;
/** Categories with more sub-categories than this start folded. */
const FOLDED_OVER_SUBS = 10;
const OTHER = "Other";
const GENERAL = "General";

const USD_AXIS = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 });
const MONTH = new Intl.DateTimeFormat(undefined, { month: "short", year: "2-digit" });

/** Sports by the tags Polymarket puts on their events. Football goes last: soccer events are sometimes tagged "football" too. */
const SPORTS = [
  ["Soccer", ["soccer", "epl", "premier league", "champions league", "ucl", "la liga", "serie a", "bundesliga", "ligue 1", "mls", "europa league", "world cup", "fifa world cup", "fifa", "uefa"]],
  ["Basketball", ["basketball", "nba", "nba playoffs", "nba finals", "wnba", "ncaab", "march madness", "cbb"]],
  ["Hockey", ["hockey", "nhl"]],
  ["Baseball", ["baseball", "mlb", "world series"]],
  ["Tennis", ["tennis", "atp", "wta", "wimbledon"]],
  ["Golf", ["golf", "pga", "the masters"]],
  ["MMA", ["mma", "ufc"]],
  ["Boxing", ["boxing"]],
  ["Formula 1", ["f1", "formula 1", "formula one"]],
  ["Esports", ["esports", "cs2", "counter-strike", "league of legends", "dota 2", "valorant"]],
  ["Cricket", ["cricket", "ipl"]],
  ["Football", ["football", "nfl", "nfl (all)", "superbowl", "super bowl", "fantasy football", "cfb", "cfb (all)", "college football", "ncaaf", "cfp"]],
].map(([label, tags]) => ({ label, tags: new Set(tags) }));

/** Broad categories, first match wins: an event tagged both Geopolitics and Politics counts as Geopolitics. */
const CATEGORIES = [
  ["Sports", ["sports", ...SPORTS.flatMap((sport) => [...sport.tags])]],
  ["Crypto", ["crypto", "cryptocurrency", "crypto prices", "bitcoin", "ethereum", "solana", "stablecoins", "airdrops", "memecoins"]],
  ["Weather", ["weather", "climate", "global temp", "temperature"]],
  ["Tech", ["tech", "technology", "ai", "big tech", "openai"]],
  ["Culture", ["culture", "pop culture", "movies", "music", "awards", "box office", "entertainment", "celebrities", "tv"]],
  ["Economics", ["economy", "economics", "fed", "fed rates", "inflation", "macro", "economic policy"]],
  ["Finance", ["finance", "stocks", "equities", "business", "earnings"]],
  ["Science", ["science", "space"]],
  ["Geopolitics", ["geopolitics", "world", "world affairs", "foreign policy", "middle east", "ukraine", "war"]],
  ["Politics", ["politics", "elections", "global elections", "us election", "u.s. politics", "us politics", "trump", "trump presidency"]],
].map(([label, tags]) => ({ label, tags: new Set(tags) }));

/** Tags too broad to name a sub-category. */
const BROAD_TAGS = new Set([
  ...CATEGORIES.map((category) => category.label.toLowerCase()),
  "cryptocurrency",
  "technology",
  "economy",
  "business",
  "world",
  "elections",
  "pop culture",
]);
/** Tags Polymarket uses for its own plumbing or retired ones. */
const NOISE_TAG = /^(all|news|deprec\b|hide from new|recurring|trending|predictions?$|forecasting|future predictions|creators|earn \d|hfc|parent for derivative|pre-market|pyth|season stats)/i;

const PERIODS = [
  { id: "weekday", label: "Day of week" },
  { id: "month", label: "Month" },
  { id: "quarter", label: "Quarter" },
  { id: "year", label: "Year" },
];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const HOLDS = [
  { label: "Under an hour", max: HOUR_MS },
  { label: "1 to 24 hours", max: DAY_MS },
  { label: "1 to 7 days", max: 7 * DAY_MS },
  { label: "1 to 4 weeks", max: 30 * DAY_MS },
  { label: "1 to 3 months", max: 91 * DAY_MS },
  { label: "Over 3 months", max: Infinity },
];

/** event id → its tag labels, or null when Gamma doesn't know it. Shared across wallets. */
const eventTagCache = new Map();

function tagLabels(tags) {
  return (Array.isArray(tags) ? tags : []).map((tag) => String(tag?.label || "").trim()).filter(Boolean);
}

async function loadEventTags(ids, signal) {
  const missing = ids.filter((id) => !eventTagCache.has(id));
  const batches = [];
  for (let at = 0; at < missing.length; at += EVENT_BATCH) batches.push(missing.slice(at, at + EVENT_BATCH));
  let next = 0;
  const worker = async () => {
    while (next < batches.length) {
      const batch = batches[next];
      next += 1;
      try {
        const body = await polymarketGet("listEvents", { id: batch.join(","), limit: String(batch.length) }, signal, { retries: 2 });
        const found = new Map((Array.isArray(body) ? body : []).map((event) => [String(event?.id ?? ""), tagLabels(event?.tags)]));
        for (const id of batch) eventTagCache.set(id, found.get(id) ?? null);
      } catch (err) {
        if (signal.aborted) throw err;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(EVENT_CONCURRENCY, batches.length) }, worker));
}

/** The tags on every event these bets are in, looked up in batches as more bets load. */
function useEventTags(bets) {
  const ids = useMemo(() => [...new Set((bets || []).map((bet) => String(bet.event_id ?? "")).filter(Boolean))].sort().join(","), [bets]);
  const [state, setState] = useState({ tags: new Map(), checked: null });
  useEffect(() => {
    const list = ids ? ids.split(",") : [];
    const abort = new AbortController();
    loadEventTags(list, abort.signal)
      .catch(() => {})
      .finally(() => {
        if (!abort.signal.aborted) setState({ tags: new Map(eventTagCache), checked: ids });
      });
    return () => abort.abort();
  }, [ids]);
  return { tags: state.tags, loading: state.checked !== ids };
}

function classify(labels) {
  const lower = labels.map((label) => label.toLowerCase());
  const has = (set) => lower.some((tag) => set.has(tag));
  const category = CATEGORIES.find((item) => has(item.tags));
  if (!category) return { category: OTHER, sport: "", candidates: [] };
  return {
    category: category.label,
    sport: category.label === "Sports" ? SPORTS.find((sport) => has(sport.tags))?.label || "" : "",
    candidates: labels.filter((label, at) => !BROAD_TAGS.has(lower[at]) && !NOISE_TAG.test(label)),
  };
}

/** "U.S. Politics" and "US politics" are the same tag. */
function tagKey(label) {
  return label.toLowerCase().replace(/\./g, "").replace(/\s+/g, " ").trim();
}

function capitalized(label) {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function emptyStats() {
  return { bets: 0, won: 0, lost: 0, winSum: 0, lossSum: 0, pnl: 0, cost: 0 };
}

function addBet(stats, bet) {
  stats.bets += 1;
  stats.pnl += bet.pnl;
  stats.cost += bet.cost;
  if (bet.result === "won") {
    stats.won += 1;
    stats.winSum += bet.pnl;
  } else if (bet.result === "lost") {
    stats.lost += 1;
    stats.lossSum += bet.pnl;
  }
}

function summary(stats) {
  const decided = stats.won + stats.lost;
  return {
    ...stats,
    winRate: decided ? stats.won / decided : null,
    avgWin: stats.won ? stats.winSum / stats.won : null,
    avgLoss: stats.lost ? stats.lossSum / stats.lost : null,
    roi: stats.cost > 0 ? stats.pnl / stats.cost : null,
  };
}

function byPnl(a, b) {
  if ((a.label === OTHER) !== (b.label === OTHER)) return a.label === OTHER ? 1 : -1;
  return b.pnl - a.pnl;
}

/**
 * Bets grouped by their event's broad category, then by sub-category: the sport for sports, otherwise
 * the tag shared by most of this wallet's events in that category, so related markets land together.
 * While `loading`, bets whose event hasn't been looked up yet wait; after that they count as Other.
 */
function byCategory(bets, tags, loading) {
  const events = new Map();
  let pending = 0;
  for (const bet of bets) {
    const id = String(bet.event_id ?? "");
    if (loading && id && !tags.has(id)) {
      pending += 1;
      continue;
    }
    if (!events.has(id)) events.set(id, classify((id && tags.get(id)) || []));
  }

  const counts = new Map();
  for (const event of events.values()) {
    if (event.sport) continue;
    const tally = counts.get(event.category) || new Map();
    counts.set(event.category, tally);
    for (const label of new Set(event.candidates)) {
      const entry = tally.get(tagKey(label)) || { count: 0, labels: new Map() };
      entry.count += 1;
      entry.labels.set(label, (entry.labels.get(label) || 0) + 1);
      tally.set(tagKey(label), entry);
    }
  }
  for (const event of events.values()) {
    if (event.sport) {
      event.sub = event.sport;
      continue;
    }
    const tally = counts.get(event.category);
    let best = null;
    for (const candidate of event.candidates) {
      const entry = tally.get(tagKey(candidate));
      if (!best || entry.count > best.count) best = entry;
    }
    event.sub = best ? capitalized([...best.labels].sort((a, b) => b[1] - a[1])[0][0]) : GENERAL;
  }

  const groups = new Map();
  for (const bet of bets) {
    const id = String(bet.event_id ?? "");
    const event = events.get(id);
    if (!event) continue;
    let group = groups.get(event.category);
    if (!group) {
      group = { label: event.category, stats: emptyStats(), subs: new Map() };
      groups.set(event.category, group);
    }
    addBet(group.stats, bet);
    const key = tagKey(event.sub);
    let sub = group.subs.get(key);
    if (!sub) {
      sub = { label: event.sub, stats: emptyStats() };
      group.subs.set(key, sub);
    }
    addBet(sub.stats, bet);
  }
  const list = [...groups.values()]
    .map((group) => ({
      label: group.label,
      ...summary(group.stats),
      subs: [...group.subs.values()].map((sub) => ({ label: sub.label, ...summary(sub.stats) })).sort(byPnl),
    }))
    .sort(byPnl);
  return { groups: list, pending };
}

function periodStart(date, period) {
  if (period === "year") return date.getFullYear();
  if (period === "quarter") return date.getFullYear() * 4 + Math.floor(date.getMonth() / 3);
  return date.getFullYear() * 12 + date.getMonth();
}

function periodLabel(key, period) {
  if (period === "year") return String(key);
  if (period === "quarter") return `Q${(key % 4) + 1} ${Math.floor(key / 4)}`;
  return MONTH.format(new Date(Math.floor(key / 12), key % 12, 1));
}

/** PnL by when each bet finished, in local time: per weekday, or per calendar month, quarter or year with empty ones kept. */
function byPeriod(bets, period) {
  const dated = bets.filter((bet) => bet.finishedAt != null);
  if (period === "weekday") {
    const days = WEEKDAYS.map(() => emptyStats());
    for (const bet of dated) addBet(days[(new Date(bet.finishedAt).getDay() + 6) % 7], bet);
    return days.map((stats, at) => ({ label: WEEKDAYS[at], ...summary(stats) }));
  }
  if (!dated.length) return [];
  const buckets = new Map();
  let first = Infinity;
  let last = -Infinity;
  for (const bet of dated) {
    const key = periodStart(new Date(bet.finishedAt), period);
    first = Math.min(first, key);
    last = Math.max(last, key);
    if (!buckets.has(key)) buckets.set(key, emptyStats());
    addBet(buckets.get(key), bet);
  }
  const rows = [];
  for (let key = first; key <= last; key += 1) rows.push({ label: periodLabel(key, period), ...summary(buckets.get(key) || emptyStats()) });
  return rows;
}

function byHold(bets) {
  const buckets = HOLDS.map(() => emptyStats());
  let unknown = 0;
  for (const bet of bets) {
    if (bet.openedAt == null || bet.finishedAt == null) {
      unknown += 1;
      continue;
    }
    const held = Math.max(0, bet.finishedAt - bet.openedAt);
    addBet(buckets[HOLDS.findIndex((hold) => held < hold.max)], bet);
  }
  return { rows: buckets.map((stats, at) => ({ label: HOLDS[at].label, ...summary(stats) })).filter((row) => row.bets), unknown };
}

function percent(value) {
  return value == null ? "—" : `${Math.round(value * 100)}%`;
}

function signedPercent(value) {
  if (value == null) return "—";
  const pct = value * 100;
  return `${pct > 0.05 ? "+" : pct < -0.05 ? "−" : ""}${Math.abs(pct).toFixed(1)}%`;
}

function betCount(count) {
  return `${count.toLocaleString()} ${count === 1 ? "bet" : "bets"}`;
}

function Panel({ title, detail, action, children, className, bare }) {
  return (
    <figure className={cn("min-w-0 bg-background", bare ? "px-4 pb-4 pt-3" : "rounded-xl border border-border/70 p-4 shadow-sm", className)}>
      <figcaption className={cn("flex items-start justify-between gap-3", bare && "pr-5")}>
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-foreground">{title}</div>
          {detail ? <div className="mt-0.5 text-[12px] text-muted-foreground">{detail}</div> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </figcaption>
      <div className="mt-3">{children}</div>
    </figure>
  );
}

function Empty({ children }) {
  return <p className="flex h-full min-h-[140px] items-center justify-center px-6 text-center text-[12px] text-muted-foreground">{children}</p>;
}

function BarTip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-md border border-border/70 bg-background px-2.5 py-2 text-[12px] shadow-md">
      <div className="font-medium text-foreground">{row.label}</div>
      <div className={cn("font-mono font-semibold tabular-nums", pnlTone(row.pnl))}>{signedUsd(row.pnl)}</div>
      <div className="text-[11.5px] text-muted-foreground">
        {betCount(row.bets)}
        {row.winRate != null ? ` · ${percent(row.winRate)} won` : ""}
        {row.roi != null ? ` · ${signedPercent(row.roi)} return` : ""}
      </div>
    </div>
  );
}

const axisTick = { fontSize: 11, fill: "var(--muted-foreground)" };

export function CategoryChart({ groups, pending, bare = false }) {
  const height = Math.max(160, groups.length * CATEGORY_ROW_PX + 36);
  return (
    <Panel
      bare={bare}
      title="PnL by category"
      detail={pending ? `Sorting ${betCount(pending)} into categories` : "Each bet counted under its event's broad category"}
      action={pending ? <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden /> : null}
    >
      {groups.length ? (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={groups} layout="vertical" margin={{ top: 4, right: 12, bottom: 0, left: 4 }} barCategoryGap={6}>
              <CartesianGrid horizontal={false} stroke="currentColor" strokeOpacity={0.08} />
              <XAxis type="number" tickFormatter={(value) => USD_AXIS.format(value)} tick={axisTick} tickLine={false} axisLine={false} />
              <YAxis type="category" dataKey="label" width={92} tick={axisTick} tickLine={false} axisLine={false} interval={0} />
              <ReferenceLine x={0} stroke="var(--muted-foreground)" strokeOpacity={0.4} />
              <Tooltip content={<BarTip />} cursor={{ fill: "var(--muted-foreground)", fillOpacity: 0.08 }} />
              <Bar dataKey="pnl" radius={3} isAnimationActive={false}>
                {groups.map((group) => (
                  <Cell key={group.label} fill={group.pnl >= 0 ? WON_COLOR : LOST_COLOR} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <Empty>{pending ? "Looking up categories" : "No finished bets yet."}</Empty>
      )}
    </Panel>
  );
}

export function PeriodChart({ bets, bare = false }) {
  const [period, setPeriod] = useState("weekday");
  const rows = useMemo(() => byPeriod(bets, period), [bets, period]);
  const best = rows.reduce((top, row) => (row.bets && (!top || row.pnl > top.pnl) ? row : top), null);
  const worst = rows.reduce((low, row) => (row.bets && (!low || row.pnl < low.pnl) ? row : low), null);
  const name = PERIODS.find((item) => item.id === period).label.toLowerCase();
  return (
    <Panel
      bare={bare}
      title={`PnL by ${name}`}
      detail={best && worst && best !== worst ? `Best ${best.label} ${signedUsd(best.pnl)} · worst ${worst.label} ${signedUsd(worst.pnl)}` : "By when each bet finished, in your time zone"}
      action={<Segmented label="Group PnL by" value={period} options={PERIODS} onChange={setPeriod} />}
    >
      {rows.some((row) => row.bets) ? (
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: 4 }} barCategoryGap={rows.length > 24 ? 1 : "18%"}>
              <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} />
              <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={8} />
              <YAxis tickFormatter={(value) => USD_AXIS.format(value)} tick={axisTick} tickLine={false} axisLine={false} width={56} />
              <ReferenceLine y={0} stroke="var(--muted-foreground)" strokeOpacity={0.4} />
              <Tooltip content={<BarTip />} cursor={{ fill: "var(--muted-foreground)", fillOpacity: 0.08 }} />
              <Bar dataKey="pnl" radius={3} isAnimationActive={false}>
                {rows.map((row) => (
                  <Cell key={row.label} fill={row.pnl >= 0 ? WON_COLOR : LOST_COLOR} fillOpacity={row.bets ? 0.85 : 0} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <Empty>No finished bets with a date yet.</Empty>
      )}
    </Panel>
  );
}

const TABLE_HEAD = "px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground";
const TABLE_CELL = "px-3 py-2 text-right font-mono text-[12.5px] tabular-nums";

function StatCells({ row, muted }) {
  return (
    <>
      <td className={cn(TABLE_CELL, "text-muted-foreground")}>{row.bets.toLocaleString()}</td>
      <td className={cn(TABLE_CELL, muted ? "text-muted-foreground" : "text-foreground")}>{percent(row.winRate)}</td>
      <td className={cn(TABLE_CELL, "text-emerald-600 dark:text-emerald-400", muted && "opacity-80")}>{row.avgWin == null ? "—" : usd(row.avgWin)}</td>
      <td className={cn(TABLE_CELL, "text-rose-600 dark:text-rose-400", muted && "opacity-80")}>{row.avgLoss == null ? "—" : `−${usd(Math.abs(row.avgLoss))}`}</td>
      <td className={cn(TABLE_CELL, pnlTone(row.roi ?? NaN))}>{signedPercent(row.roi)}</td>
      <td className={cn(TABLE_CELL, "font-semibold", pnlTone(row.pnl))}>{signedUsd(row.pnl)}</td>
    </>
  );
}

export function CategoryTable({ groups, pending, bare = false }) {
  const [flipped, setFlipped] = useState(() => new Set());
  const toggle = (label) =>
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  return (
    <section
      aria-label="PnL by category and sub-category"
      className={cn("overflow-hidden bg-background", bare ? "border-t border-border/60" : "rounded-xl border border-border/70 shadow-sm")}
    >
      {groups.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead className="border-b border-border/60 bg-muted/30">
              <tr>
                <th className={cn(TABLE_HEAD, "text-left")}>Category</th>
                <th className={cn(TABLE_HEAD, "text-right")}>Bets</th>
                <th className={cn(TABLE_HEAD, "text-right")}>Win rate</th>
                <th className={cn(TABLE_HEAD, "text-right")}>Avg win</th>
                <th className={cn(TABLE_HEAD, "text-right")}>Avg loss</th>
                <th className={cn(TABLE_HEAD, "text-right")} title="PnL over what was paid in">
                  Return
                </th>
                <th className={cn(TABLE_HEAD, "text-right")}>PnL</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => {
                const open = (group.subs.length <= FOLDED_OVER_SUBS) !== flipped.has(group.label);
                return (
                  <Fragment key={group.label}>
                    <tr className="border-t border-border/60 bg-muted/20">
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => toggle(group.label)}
                          aria-expanded={open}
                          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-foreground"
                        >
                          <ChevronRight className={cn("size-3.5 text-muted-foreground transition-transform", open && "rotate-90")} aria-hidden />
                          {group.label}
                          <span className="text-[11.5px] font-normal text-muted-foreground">{group.subs.length.toLocaleString()}</span>
                        </button>
                      </td>
                      <StatCells row={group} />
                    </tr>
                    {open
                      ? group.subs.map((sub) => (
                          <tr key={sub.label} className="border-t border-border/40">
                            <td className="py-1.5 pl-9 pr-3 text-[12.5px] text-muted-foreground">{sub.label}</td>
                            <StatCells row={sub} muted />
                          </tr>
                        ))
                      : null}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>{pending ? "Looking up categories" : "No finished bets yet."}</Empty>
      )}
    </section>
  );
}

export function HoldingEdge({ bets, bare = false }) {
  const { rows, unknown } = useMemo(() => byHold(bets), [bets]);
  const widest = rows.reduce((max, row) => Math.max(max, Math.abs(row.roi ?? 0)), 0) || 1;
  return (
    <Panel
      bare={bare}
      title="Edge by holding duration"
      detail={`Does the edge fade the longer a bet is held? Return is PnL over what was paid in.${unknown ? ` ${betCount(unknown)} without dates left out.` : ""}`}
    >
      {rows.length ? (
        <div className="overflow-x-auto">
          <div className="min-w-[560px]">
            <div className="grid grid-cols-[minmax(110px,1fr)_72px_72px_minmax(160px,2fr)_96px] gap-3 border-b border-border/60 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              <span>Held</span>
              <span className="text-right">Bets</span>
              <span className="text-right">Win rate</span>
              <span className="text-center">Return</span>
              <span className="text-right">PnL</span>
            </div>
            {rows.map((row) => {
              const share = Math.min(50, (Math.abs(row.roi ?? 0) / widest) * 50);
              const up = (row.roi ?? 0) >= 0;
              return (
                <div key={row.label} className="grid grid-cols-[minmax(110px,1fr)_72px_72px_minmax(160px,2fr)_96px] items-center gap-3 border-b border-border/40 py-2 last:border-b-0">
                  <span className="text-[13px] text-foreground">{row.label}</span>
                  <span className="text-right font-mono text-[12.5px] tabular-nums text-muted-foreground">{row.bets.toLocaleString()}</span>
                  <span className="text-right font-mono text-[12.5px] tabular-nums text-foreground">{percent(row.winRate)}</span>
                  <span className="flex items-center gap-2">
                    <span className="relative h-2 flex-1 rounded-full bg-muted">
                      <span className="absolute inset-y-[-3px] left-1/2 w-px bg-muted-foreground/40" aria-hidden />
                      <span
                        className="absolute inset-y-0 rounded-full"
                        style={{ [up ? "left" : "right"]: "50%", width: `${share}%`, backgroundColor: up ? WON_COLOR : LOST_COLOR, opacity: 0.85 }}
                        aria-hidden
                      />
                    </span>
                    <span className={cn("w-14 text-right font-mono text-[12px] tabular-nums", pnlTone(row.roi ?? NaN))}>{signedPercent(row.roi)}</span>
                  </span>
                  <span className={cn("text-right font-mono text-[12.5px] font-semibold tabular-nums", pnlTone(row.pnl))}>{signedUsd(row.pnl)}</span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <Empty>No finished bets with open and close dates yet.</Empty>
      )}
    </Panel>
  );
}

export const CATEGORY_TABLE_DETAIL = `Each broad category totals the sub-categories under it: the sport for sports bets, otherwise the Polymarket tag most of this wallet's markets in that category share. Click a category to open or fold it; ones with more than ${FOLDED_OVER_SUBS} start folded.`;

/** Finished bets grouped by category and sub-category, from the tags on each bet's event. `bets` null while they load. */
export function useCategoryGroups(bets) {
  const eventTags = useEventTags(bets);
  return useMemo(() => byCategory(bets || [], eventTags.tags, eventTags.loading), [bets, eventTags.tags, eventTags.loading]);
}
