"use client";

import { Check, CornerDownLeft, Download, LineChart, Loader2, Plus, Search, Table2 } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";
import { BLUE, FeatureWindow, GREEN, VIOLET, useInView, useReducedMotion } from "./feature-kit";

type Listing = { title: string; ticker: string; last: number };
type Market = Listing & {
  query: string;
  trades: number;
  volume: string;
  oi: string;
  seed: number;
  decoys: readonly Listing[];
};

const MARKETS: readonly Market[] = [
  {
    query: "fed cut in december",
    title: "Fed cuts rates in December?",
    ticker: "KXFEDDECISION-26DEC-C25",
    last: 62,
    trades: 24180,
    volume: "1.4M",
    oi: "312K",
    seed: 3,
    decoys: [
      { title: "Fed cuts 50bps in December?", ticker: "KXFEDDECISION-26DEC-C50", last: 9 },
      { title: "Fed holds rates in December?", ticker: "KXFEDDECISION-26DEC-H0", last: 31 },
    ],
  },
  {
    query: "bitcoin above 100k",
    title: "Bitcoin above $100k on Dec 31?",
    ticker: "KXBTCY-26DEC31-B100000",
    last: 38,
    trades: 51904,
    volume: "3.2M",
    oi: "845K",
    seed: 11,
    decoys: [
      { title: "Bitcoin above $120k on Dec 31?", ticker: "KXBTCY-26DEC31-B120000", last: 14 },
      { title: "Bitcoin above $90k on Dec 31?", ticker: "KXBTCY-26DEC31-B90000", last: 57 },
    ],
  },
  {
    query: "celtics win the finals",
    title: "Celtics win the NBA Finals?",
    ticker: "KXNBA-26-BOS",
    last: 44,
    trades: 9412,
    volume: "620K",
    oi: "128K",
    seed: 23,
    decoys: [
      { title: "Celtics win the Eastern Conference?", ticker: "KXNBAEAST-26-BOS", last: 58 },
      { title: "Celtics win 60+ games?", ticker: "KXNBAWINS-26-BOS-60", last: 21 },
    ],
  },
];

const EXTRAS = [
  { id: "candles", label: "Price history", column: "Mid", select: "c.mid", join: "kalshi.candles c", using: "ticker, minute", color: VIOLET },
  { id: "book", label: "Order book", column: "Spread", select: "b.spread", join: "kalshi.orderbook b", using: "ticker, ts", color: BLUE },
  { id: "x", label: "X mentions", column: "Mentions", select: "x.mentions", join: "x.mentions x", using: "minute", color: GREEN },
] as const;

type ExtraId = (typeof EXTRAS)[number]["id"];
type Stage = "typing" | "results" | "inspect" | "related" | "chart" | "download" | "done";
type Trade = { id: number; secs: number; side: "yes" | "no"; price: number; count: number; spread: number; mentions: number };

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Endless, deterministic trade tape for a market, oldest first. */
function makeFeed(market: Listing & { seed: number }) {
  const rand = mulberry32(market.seed);
  let price = market.last;
  let secs = 14 * 3600 + 32 * 60 + 5;
  let id = 0;
  return (): Trade => {
    price = Math.min(97, Math.max(3, price + Math.round((rand() - 0.5) * 4)));
    secs += 1 + Math.floor(rand() * 18);
    return {
      id: id++,
      secs,
      side: rand() < 0.56 ? "yes" : "no",
      price,
      count: Math.round(4 + rand() ** 2 * 1200),
      spread: 1 + Math.floor(rand() * 2),
      mentions: Math.floor(rand() ** 3 * 40),
    };
  };
}

/** Price path leading up to `market.last`, so the live tape continues where the history ends. */
function seedHistory(market: Listing & { seed: number }) {
  const rand = mulberry32(market.seed * 7 + 1);
  const walk: number[] = [];
  let price = 0;
  for (let i = 0; i < 48; i++) {
    price += (rand() - 0.38) * 3;
    walk.push(price);
  }
  const offset = market.last - price;
  return walk.map((p) => Math.min(97, Math.max(3, p + offset)));
}

function clock(secs: number) {
  const h = Math.floor(secs / 3600) % 24;
  const m = Math.floor(secs / 60) % 60;
  const s = secs % 60;
  return [h, m, s].map((n) => String(n).padStart(2, "0")).join(":");
}

const Kw = ({ children }: { children: ReactNode }) => <span className="text-[#2f6fed]">{children}</span>;
const Str = ({ children }: { children: ReactNode }) => <span className="text-[#0f9f6e]">{children}</span>;

export function TradeHistoryDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef);
  const reduced = useReducedMotion();
  const feedRef = useRef<(() => Trade) | null>(null);

  const [marketIdx, setMarketIdx] = useState(0);
  const [stage, setStage] = useState<Stage>("typing");
  const [typed, setTyped] = useState(0);
  const [selected, setSelected] = useState<(Market & { listingTitle: string }) | null>(null);
  const [rows, setRows] = useState<Trade[]>([]);
  const [history, setHistory] = useState<number[]>([]);
  const [streamed, setStreamed] = useState(0);
  const [view, setView] = useState<"sheet" | "chart">("sheet");
  const [extras, setExtras] = useState<ExtraId[]>([]);
  const [download, setDownload] = useState<"idle" | "working" | "done">("idle");
  const [manual, setManual] = useState(false);
  const [lastAdded, setLastAdded] = useState("search");

  const market = MARKETS[marketIdx];
  const results: Listing[] = [market, ...market.decoys];

  const select = (listing: Listing, index = 0) => {
    const picked = { ...market, ...listing, seed: market.seed + index, listingTitle: listing.title };
    const feed = makeFeed(picked);
    feedRef.current = feed;
    setRows(Array.from({ length: 7 }, feed).reverse());
    setHistory(seedHistory(picked));
    setStreamed(0);
    setSelected(picked);
    setTyped(market.query.length);
    setStage("inspect");
    setLastAdded("where");
  };

  const toggleExtra = (id: ExtraId, auto = false) => {
    if (!selected) return;
    if (!auto) setManual(true);
    setExtras((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
    setLastAdded(id);
  };

  const showView = (next: "sheet" | "chart") => {
    if (!selected) return;
    setManual(true);
    setView(next);
    setLastAdded(next === "chart" ? "chart" : "where");
  };

  const startDownload = (auto = false) => {
    if (!selected || download === "working") return;
    if (!auto) setManual(true);
    setDownload("working");
  };

  const nextSearch = () => {
    setMarketIdx((i) => (i + 1) % MARKETS.length);
    setSelected(null);
    setRows([]);
    setView("sheet");
    setExtras([]);
    setDownload("idle");
    setTyped(0);
    setStage("typing");
    setManual(false);
    setLastAdded("search");
  };

  useEffect(() => {
    if (!reduced) return;
    select(MARKETS[0]);
    setExtras(["candles"]);
    // Only the first render under reduced motion needs the finished state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  useEffect(() => {
    if (!inView || reduced || manual) return;
    let timer = 0;
    if (stage === "typing") {
      timer =
        typed < market.query.length
          ? window.setTimeout(() => setTyped(typed + 1), 45 + Math.random() * 45)
          : window.setTimeout(() => setStage("results"), 350);
    } else if (stage === "results") {
      timer = window.setTimeout(() => select(market), 1300);
    } else if (stage === "inspect") {
      timer = window.setTimeout(() => {
        toggleExtra("candles", true);
        setStage("related");
      }, 2800);
    } else if (stage === "related") {
      timer = window.setTimeout(() => {
        setView("chart");
        setLastAdded("chart");
        setStage("chart");
      }, 1900);
    } else if (stage === "chart") {
      timer = window.setTimeout(() => {
        startDownload(true);
        setStage("download");
      }, 2600);
    } else if (stage === "download") {
      timer = window.setTimeout(() => setStage("done"), 1400);
    } else if (stage === "done") {
      timer = window.setTimeout(nextSearch, 2600);
    }
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, reduced, manual, stage, typed, market]);

  useEffect(() => {
    if (!inView || reduced || !selected) return;
    const timer = window.setInterval(() => {
      const next = feedRef.current?.();
      if (!next) return;
      setRows((current) => [next, ...current].slice(0, 12));
      setHistory((current) => [...current.slice(1), next.price]);
      setStreamed((n) => n + 1);
    }, 650);
    return () => window.clearInterval(timer);
  }, [inView, reduced, selected]);

  useEffect(() => {
    if (download !== "working") return;
    const timer = window.setTimeout(() => {
      setDownload("done");
      setLastAdded("export");
    }, 1100);
    return () => window.clearTimeout(timer);
  }, [download]);

  const searching = !selected;
  const showResults = searching && (stage === "results" || typed > 4);
  const searchText = searching ? market.query.slice(0, typed) : selected.listingTitle;
  const activeExtras = EXTRAS.filter((e) => extras.includes(e.id));
  const last = rows[0]?.price ?? selected?.last ?? 0;
  const tradeCount = selected ? selected.trades + streamed : 0;

  const query = (() => {
    const lines: { key: string; text: ReactNode }[] = [];
    if (!selected) {
      lines.push({
        key: "search",
        text: (
          <>
            <Kw>search</Kw> kalshi.markets <Str>&quot;{market.query.slice(0, typed)}&quot;</Str>
            {stage === "results" ? <span className="text-muted-foreground"> → 3 matches</span> : null}
          </>
        ),
      });
      return lines;
    }
    lines.push({
      key: "select",
      text: (
        <>
          <Kw>select</Kw> time, side, price, count{activeExtras.map((e) => `, ${e.select}`).join("")}
        </>
      ),
    });
    lines.push({ key: "from", text: <><Kw>from</Kw> kalshi.trades</> });
    for (const e of activeExtras) {
      lines.push({ key: e.id, text: <><Kw>join</Kw> {e.join} <Kw>using</Kw> ({e.using})</> });
    }
    lines.push({ key: "where", text: <><Kw>where</Kw> ticker = <Str>&apos;{selected.ticker}&apos;</Str></> });
    if (view === "chart") lines.push({ key: "chart", text: <><Kw>chart</Kw> line(price) <Kw>by</Kw> time</> });
    if (download === "done") lines.push({ key: "export", text: <><Kw>export</Kw> csv</> });
    return lines;
  })();

  return (
    <div ref={rootRef} className="size-full">
      <FeatureWindow title="Download Kalshi Trade History" className="size-full">
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="relative z-10 border-b border-border p-3">
            <button
              type="button"
              onClick={nextSearch}
              className="flex h-9 w-full items-center gap-2 rounded-lg border border-border bg-background px-3 text-left transition-colors hover:border-[#2f6fed]/50"
              aria-label="Search another market"
            >
              <Search className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className={cn("min-w-0 truncate text-xs", searchText ? "text-primary" : "text-muted-foreground")}>
                {searchText || "Search by name, ticker, or plain English"}
              </span>
              {searching && stage === "typing" ? (
                <span className="-ml-1 h-3.5 w-px shrink-0 animate-pulse bg-primary" aria-hidden />
              ) : null}
              {selected ? (
                <span className="ml-auto shrink-0 rounded bg-black/[0.05] px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground dark:bg-white/[0.08]">
                  {selected.ticker}
                </span>
              ) : null}
            </button>

            {showResults ? (
              <ul className="absolute inset-x-3 top-[calc(100%-0.5rem)] overflow-hidden rounded-lg border border-border bg-background shadow-[0_18px_40px_-16px_rgba(15,23,42,0.4)] [animation:fx-rise_.25s_both]">
                {results.map((listing, i) => {
                  const target = i === 0 && stage === "results";
                  return (
                    <li key={listing.ticker}>
                      <button
                        type="button"
                        onClick={() => select(listing, i)}
                        className={cn(
                          "flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-muted",
                          target && "bg-[#2f6fed]/[0.07]",
                        )}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-xs text-primary">{listing.title}</span>
                          <span className="block truncate font-mono text-[10px] text-muted-foreground">{listing.ticker}</span>
                        </span>
                        <span className="shrink-0 font-mono text-[11px] tabular-nums text-[#0f9f6e]">{listing.last}¢</span>
                        {target ? <CornerDownLeft className="size-3 shrink-0 text-[#2f6fed]" aria-hidden /> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>

          <div className="flex items-center gap-4 border-b border-border px-3 py-2.5">
            {selected ? (
              <>
                <div className="min-w-0 flex-1 [animation:fx-rise_.35s_both]" key={selected.ticker}>
                  <p className="flex items-center gap-1.5 truncate text-[13px] text-primary">
                    <span className="size-1.5 shrink-0 rounded-full bg-[#10b981]" aria-hidden />
                    <span className="truncate">{selected.listingTitle}</span>
                  </p>
                  <p className="text-[10.5px] text-muted-foreground">Kalshi · Open</p>
                </div>
                <Stat label="Last" value={`${last}¢`} tone={last >= selected.last ? "up" : "down"} />
                <Stat label="Trades" value={tradeCount.toLocaleString()} />
                <Stat label="Volume" value={selected.volume} className="hidden sm:block" />
                <Stat label="Open int." value={selected.oi} className="hidden md:block" />
              </>
            ) : (
              <p className="py-[3px] text-xs text-muted-foreground">Pick a market to inspect its trades</p>
            )}
          </div>

          <div className="flex items-center gap-1.5 border-b border-border px-3 py-2">
            <div className="flex rounded-md bg-black/[0.04] p-0.5 dark:bg-white/[0.06]">
              {(["sheet", "chart"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => showView(v)}
                  className={cn(
                    "inline-flex h-6 items-center gap-1 rounded px-2 text-[11px] font-medium capitalize transition-colors",
                    view === v ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-primary",
                  )}
                >
                  {v === "sheet" ? <Table2 className="size-3" aria-hidden /> : <LineChart className="size-3" aria-hidden />}
                  {v}
                </button>
              ))}
            </div>
            {EXTRAS.map((e, i) => {
              const on = extras.includes(e.id);
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => toggleExtra(e.id)}
                  className={cn(
                    "h-6 items-center gap-1 rounded-md border px-2 text-[11px] transition-colors",
                    i === 0 ? "inline-flex" : "hidden lg:inline-flex",
                    on
                      ? "border-transparent bg-black/[0.06] text-primary dark:bg-white/[0.1]"
                      : "border-dashed border-border text-muted-foreground hover:text-primary",
                  )}
                >
                  {on ? (
                    <span className="size-1.5 rounded-full" style={{ background: e.color }} aria-hidden />
                  ) : (
                    <Plus className="size-3" aria-hidden />
                  )}
                  {e.label}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => startDownload()}
              disabled={!selected}
              className={cn(
                "ml-auto inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-2 text-[11px] font-medium text-white transition-colors disabled:opacity-40",
                download === "done" ? "bg-[#10b981]" : "bg-[#2f6fed] hover:bg-[#2a63d4]",
              )}
            >
              {download === "working" ? (
                <Loader2 className="size-3 animate-spin" aria-hidden />
              ) : download === "done" ? (
                <Check className="size-3" aria-hidden />
              ) : (
                <Download className="size-3" aria-hidden />
              )}
              {download === "working" ? "Preparing" : download === "done" ? "Downloaded" : "CSV"}
            </button>
          </div>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            {!selected ? (
              <EmptySheet />
            ) : view === "sheet" ? (
              <TradeSheet rows={rows} extras={activeExtras.map((e) => e.id)} />
            ) : (
              <TradeChart key={selected.ticker} history={history} extras={extras} />
            )}
            {download === "done" && selected ? (
              <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 shadow-[0_12px_30px_-12px_rgba(15,23,42,0.35)] [animation:fx-rise_.3s_both]">
                <span className="grid size-5 place-items-center rounded-full bg-[#10b981] text-white">
                  <Check className="size-3" strokeWidth={3} aria-hidden />
                </span>
                <span>
                  <span className="block font-mono text-[10.5px] text-primary">{selected.ticker.toLowerCase()}_trades.csv</span>
                  <span className="block text-[10px] text-muted-foreground">
                    {tradeCount.toLocaleString()} rows · {4 + activeExtras.length} columns
                  </span>
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex h-[5.25rem] shrink-0 flex-col justify-end overflow-hidden border-t border-border bg-black/[0.02] px-3 py-2 font-mono text-[10.5px] leading-[1.55] text-primary dark:bg-white/[0.02]">
            {query.map((line) => (
              <p
                key={line.key}
                className={cn(
                  "-mx-1 shrink-0 truncate rounded px-1 transition-colors duration-700",
                  line.key === lastAdded ? "bg-[#2f6fed]/10 [animation:fx-rise_.35s_both]" : "bg-transparent",
                )}
              >
                {line.text}
              </p>
            ))}
          </div>
        </div>
      </FeatureWindow>
    </div>
  );
}

function Stat({ label, value, tone, className }: { label: string; value: string; tone?: "up" | "down"; className?: string }) {
  return (
    <div className={cn("shrink-0 text-right", className)}>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "font-mono text-xs tabular-nums",
          tone === "up" ? "text-[#0f9f6e]" : tone === "down" ? "text-[#e5484d]" : "text-primary",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function EmptySheet() {
  return (
    <div className="absolute inset-0">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 border-b border-border/60 px-3 py-[9px]">
          <span className="h-2 w-16 rounded-full bg-black/[0.05] dark:bg-white/[0.06]" />
          <span className="h-2 w-8 rounded-full bg-black/[0.05] dark:bg-white/[0.06]" />
          <span className="h-2 w-10 rounded-full bg-black/[0.05] dark:bg-white/[0.06]" />
          <span className="ml-auto h-2 w-12 rounded-full bg-black/[0.05] dark:bg-white/[0.06]" />
        </div>
      ))}
      <p className="absolute inset-0 grid place-items-center text-[11px] text-muted-foreground">
        Every trade since the market opened lands here.
      </p>
    </div>
  );
}

function TradeSheet({ rows, extras }: { rows: Trade[]; extras: ExtraId[] }) {
  const columns = ["Time", "Side", "Price", "Contracts", ...EXTRAS.filter((e) => extras.includes(e.id)).map((e) => e.column)];
  const template = { gridTemplateColumns: `1.1fr 0.7fr 0.7fr 1fr${" 0.9fr".repeat(columns.length - 4)}` };
  return (
    <div className="absolute inset-0 text-[11px]">
      <div className="grid gap-2 border-b border-border bg-muted px-3 py-1.5 text-[10px] font-medium text-muted-foreground" style={template}>
        {columns.map((c, i) => (
          <span key={c} className={cn(i > 1 && "text-right", i >= 4 && "[animation:fx-rise_.35s_both]")}>
            {c}
          </span>
        ))}
      </div>
      {rows.map((row, index) => (
        <div
          key={row.id}
          className={cn(
            "grid gap-2 border-b border-border/60 px-3 py-[5px] font-mono tabular-nums",
            index === 0 && "[animation:fx-slide-in_.35s_both]",
          )}
          style={template}
        >
          <span className="text-muted-foreground">{clock(row.secs)}</span>
          <span className={row.side === "yes" ? "text-[#0f9f6e]" : "text-[#e5484d]"}>{row.side === "yes" ? "Yes" : "No"}</span>
          <span className="text-right text-primary">{row.side === "yes" ? row.price : 100 - row.price}¢</span>
          <span className="text-right text-primary">{row.count.toLocaleString()}</span>
          {extras.includes("candles") ? <span className="text-right text-muted-foreground">{(row.price - 0.5).toFixed(1)}¢</span> : null}
          {extras.includes("book") ? <span className="text-right text-muted-foreground">{row.spread}¢</span> : null}
          {extras.includes("x") ? <span className="text-right text-muted-foreground">{row.mentions}</span> : null}
        </div>
      ))}
    </div>
  );
}

function TradeChart({ history, extras }: { history: number[]; extras: ExtraId[] }) {
  const W = 300;
  const H = 120;
  const smooth = history.map((_, i) => {
    const slice = history.slice(Math.max(0, i - 5), i + 1);
    return slice.reduce((a, b) => a + b, 0) / slice.length;
  });
  const all = [...history, ...smooth];
  const lo = Math.min(...all) - 2;
  const hi = Math.max(...all) + 2;
  const y = (v: number) => 6 + (1 - (v - lo) / (hi - lo)) * (H - 12);
  const path = (values: number[]) =>
    values.map((v, i) => `${i ? "L" : "M"}${((i / (values.length - 1)) * W).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  const yes = path(history);
  const last = history[history.length - 1] ?? 0;
  return (
    <div className="absolute inset-0 flex flex-col px-3 pb-3 pt-2.5">
      <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-0.5 w-3 rounded-full" style={{ background: GREEN }} />
          Yes price
        </span>
        {extras.includes("candles") ? (
          <span className="flex items-center gap-1 [animation:fx-rise_.35s_both]">
            <span className="h-0 w-3 border-t border-dashed" style={{ borderColor: VIOLET }} />
            Mid (1m)
          </span>
        ) : null}
        {extras.includes("x") ? (
          <span className="flex items-center gap-1 [animation:fx-rise_.35s_both]">
            <span className="size-2 rounded-sm" style={{ background: `${GREEN}55` }} />
            X mentions
          </span>
        ) : null}
        <span className="ml-auto font-mono tabular-nums text-primary">{Math.round(last)}¢</span>
      </div>
      <div className="relative mt-2 min-h-0 flex-1">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
          {[0.25, 0.5, 0.75].map((f) => (
            <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} className="stroke-border" strokeWidth="1" vectorEffect="non-scaling-stroke" />
          ))}
          {extras.includes("x")
            ? history.map((_, i) => {
                const h = 4 + mulberry32(i + 5)() ** 2 * 26;
                return (
                  <rect
                    key={i}
                    x={(i / history.length) * W}
                    width={W / history.length - 1.5}
                    y={H - h}
                    height={h}
                    fill={`${GREEN}33`}
                  />
                );
              })
            : null}
          <g className="[animation:fx-draw_1.1s_cubic-bezier(.165,.84,.44,1)_both]">
            <path d={`${yes} L${W} ${H} L0 ${H} Z`} fill={`${GREEN}1f`} />
            <path d={yes} fill="none" stroke={GREEN} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </g>
          {extras.includes("candles") ? (
            <path
              d={path(smooth)}
              fill="none"
              stroke={VIOLET}
              strokeWidth="1.5"
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
          ) : null}
        </svg>
        <span
          className="absolute right-0 size-2 -translate-y-1/2 translate-x-1/2 rounded-full"
          style={{ top: `${(y(last) / H) * 100}%`, background: GREEN, boxShadow: `0 0 0 4px ${GREEN}33` }}
        />
      </div>
      {extras.includes("book") ? (
        <p className="mt-1.5 text-[10px] text-muted-foreground [animation:fx-rise_.35s_both]">
          Spread averaged <span className="font-mono text-primary">1.4¢</span> across the window
        </p>
      ) : null}
    </div>
  );
}
