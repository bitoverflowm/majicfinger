"use client";

/* eslint-disable @next/next/no-img-element */
import { ArrowBigUp, MessageSquare, Repeat2 } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { mulberry32 } from "../features/feature-kit";
import { DataCardFrame } from "./data-card-frame";
import { seriesPath, seriesPoint, useDemoVisibility, useTick } from "./demo-hooks";

const CHART_W = 320;
const CHART_H = 100;
const SERIES_LENGTH = 48;
const REVEAL_FROM = 10;
const HOLD_TICKS = 14;

type SignalEvent = { at: number; move: number; time: string; text: string; handle?: string; reach?: string };

function buildSeries(seed: number, start: number, events: readonly SignalEvent[]) {
  const rand = mulberry32(seed);
  const values: number[] = [];
  let value = start;
  for (let i = 0; i < SERIES_LENGTH; i++) {
    const event = events.find((e) => e.at === i || e.at + 1 === i);
    value += event ? event.move / 2 : (rand() - 0.5) * 1.4;
    values.push(Math.round(value * 10) / 10);
  }
  return values;
}

/** How many points are drawn: the full chart at rest, a replaying reveal while animating. */
function revealed(tick: number) {
  if (tick === 0) return SERIES_LENGTH;
  const cycle = SERIES_LENGTH - REVEAL_FROM + HOLD_TICKS;
  return Math.min(SERIES_LENGTH, REVEAL_FROM + (tick % cycle));
}

function Reaction({ move }: { move: number }) {
  return (
    <span className={cn("font-mono tabular-nums", move >= 0 ? "text-[#0f9f6e]" : "text-[#e5484d]")}>
      {move >= 0 ? "+" : "−"}
      {Math.abs(move)}¢
    </span>
  );
}

/** Market line that draws in, dropping a marker and an overlaid card where each signal landed. */
function SignalTimeline({
  title,
  market,
  color,
  series,
  events,
  renderCard,
  ticker,
  bars,
}: {
  title: string;
  market: string;
  color: string;
  series: readonly number[];
  events: readonly SignalEvent[];
  renderCard: (event: SignalEvent) => ReactNode;
  ticker?: (event: SignalEvent) => ReactNode;
  bars?: readonly number[];
}) {
  const { ref, running } = useDemoVisibility();
  const tick = useTick(160, running);
  const shown = revealed(tick);
  const visible = series.slice(0, shown);
  const box = { w: CHART_W, h: CHART_H, min: Math.min(...series) - 4, max: Math.max(...series) + 4, slots: SERIES_LENGTH, pad: 6 };
  const landed = events.filter((e) => e.at + 1 < shown);
  const latest = landed[landed.length - 1];
  const head = seriesPoint(series, shown - 1, box);
  const maxBar = bars ? Math.max(...bars) : 1;

  return (
    <DataCardFrame title={title} frameRef={ref} compact>
      {ticker ? (
        <div className="flex h-7 shrink-0 items-center gap-2 overflow-hidden border-b border-border px-3 text-[10.5px]">
          <span className="shrink-0 rounded bg-[#e5484d] px-1.5 py-px text-[9px] font-semibold uppercase tracking-wider text-white">
            Breaking
          </span>
          {latest ? (
            <span key={latest.at} className="ds-row-in min-w-0 truncate text-primary">
              {ticker(latest)}
            </span>
          ) : (
            <span className="truncate text-muted-foreground">Waiting for the next headline…</span>
          )}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2 px-3.5 pb-1 pt-2 text-[10px] text-muted-foreground">
        <span className="truncate">{market}</span>
        <span className="shrink-0 font-mono text-[11px] tabular-nums text-primary">
          {Math.round(series[shown - 1])}¢
        </span>
      </div>

      <div className="relative mx-3.5 min-h-0 flex-1">
        <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden>
          <path
            d={seriesPath(visible, box)}
            fill="none"
            stroke={color}
            strokeWidth="1.75"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        {landed.map((event) => {
          const p = seriesPoint(series, event.at, box);
          return (
            <span
              key={event.at}
              className={cn(
                "ds-fade absolute flex size-3.5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-background text-[7px] font-bold text-white",
                event === latest ? "bg-[#e5484d]" : "bg-neutral-400",
              )}
              style={{ left: `${(p.x / CHART_W) * 100}%`, top: `${(p.y / CHART_H) * 100}%` }}
              aria-hidden
            >
              {events.indexOf(event) + 1}
            </span>
          );
        })}
        <span
          className="absolute size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{ left: `${(head.x / CHART_W) * 100}%`, top: `${(head.y / CHART_H) * 100}%`, backgroundColor: color }}
          aria-hidden
        />
        {latest ? (
          <SignalCard key={latest.at} event={latest} box={box} series={series}>
            {renderCard(latest)}
          </SignalCard>
        ) : null}
      </div>

      {bars ? (
        <div className="mx-3.5 mb-2 mt-1 flex h-6 shrink-0 items-end gap-px" aria-hidden>
          {bars.map((bar, i) => (
            <span
              key={i}
              className={cn("flex-1 rounded-t-[1px] transition-opacity duration-300", i < shown ? "opacity-100" : "opacity-0")}
              style={{ height: `${Math.max(8, (bar / maxBar) * 100)}%`, backgroundColor: i < shown ? `${color}66` : undefined }}
            />
          ))}
        </div>
      ) : (
        <div className="h-2.5 shrink-0" />
      )}
    </DataCardFrame>
  );
}

function SignalCard({
  event,
  box,
  series,
  children,
}: {
  event: SignalEvent;
  box: { w: number; h: number; min: number; max: number; slots: number; pad: number };
  series: readonly number[];
  children: ReactNode;
}) {
  const markerOnRight = seriesPoint(series, event.at, box).x > CHART_W / 2;
  return (
    <div
      className={cn(
        "ds-row-in absolute top-0 w-[72%] max-w-[15rem] rounded-lg border border-border bg-background p-2 text-[10.5px] leading-snug shadow-[0_8px_24px_-12px_rgba(15,23,42,0.45)]",
        markerOnRight ? "left-0" : "right-0",
      )}
    >
      {children}
    </div>
  );
}

/* News */

const NEWS_EVENTS: readonly SignalEvent[] = [
  { at: 14, move: 8, time: "10:42 ET", text: "Fed chair signals openness to a December cut" },
  { at: 29, move: -7, time: "8:30 ET", text: "Core inflation comes in hotter than expected" },
  { at: 40, move: 6, time: "8:31 ET", text: "Jobless claims jump to a three-month high" },
];
const NEWS_SERIES = buildSeries(3, 54, NEWS_EVENTS);

export function NewsDemo() {
  return (
    <SignalTimeline
      title="News terminal"
      market="Fed cuts rates in December? · Yes"
      color="#2f6fed"
      series={NEWS_SERIES}
      events={NEWS_EVENTS}
      ticker={(e) => e.text}
      renderCard={(e) => (
        <>
          <p className="text-[9.5px] text-muted-foreground">{e.time} · Newswire</p>
          <p className="mt-0.5 font-medium text-primary">{e.text}</p>
          <p className="mt-1 text-muted-foreground">
            Market reacted <Reaction move={e.move} /> in 4 min
          </p>
        </>
      )}
    />
  );
}

/* X */

const X_EVENTS: readonly SignalEvent[] = [
  { at: 12, move: 6, time: "2m", handle: "@macro_desk", reach: "4.1K", text: "Spot ETF inflows just printed the biggest day this quarter." },
  { at: 27, move: -5, time: "1m", handle: "@onchain_eli", reach: "2.7K", text: "Large wallet moving 12K BTC to an exchange. Watching closely." },
  { at: 39, move: 7, time: "now", handle: "@flowtrader", reach: "6.3K", text: "Shorts getting squeezed across majors. $100k back in play?" },
];
const X_SERIES = buildSeries(11, 36, X_EVENTS);
const X_BARS = (() => {
  const rand = mulberry32(19);
  return Array.from({ length: SERIES_LENGTH }, (_, i) => {
    const burst = X_EVENTS.reduce((sum, e) => (i >= e.at ? sum + 40 * Math.exp(-(i - e.at) / 2.5) : sum), 0);
    return 8 + rand() * 10 + burst;
  });
})();

export function XDemo() {
  return (
    <SignalTimeline
      title="X mentions"
      market="Bitcoin above $100k on Dec 31? · Yes"
      color="#0f172a"
      series={X_SERIES}
      events={X_EVENTS}
      bars={X_BARS}
      renderCard={(e) => (
        <>
          <div className="flex items-center gap-1.5">
            <span className="flex size-4 items-center justify-center rounded-full bg-black p-[3px]">
              <img src="/landing/logos/x.png" alt="" className="size-full object-contain invert" />
            </span>
            <span className="font-medium text-primary">{e.handle}</span>
            <span className="text-muted-foreground">· {e.time}</span>
          </div>
          <p className="mt-1 text-primary">{e.text}</p>
          <p className="mt-1 flex items-center gap-2 text-muted-foreground">
            <span className="inline-flex items-center gap-0.5">
              <Repeat2 className="size-3" /> {e.reach}
            </span>
            <span>
              Odds <Reaction move={e.move} />
            </span>
          </p>
        </>
      )}
    />
  );
}

/* Reddit */

const REDDIT_POSTS = [
  { title: "Fed cut odds just flipped. Who's positioned for December?", sub: "r/wallstreetbets", base: 2140, rate: 9, comments: 312 },
  { title: "CPI tomorrow: what the prediction markets are pricing", sub: "r/economics", base: 1385, rate: 5, comments: 188 },
  { title: "Is anyone else tracking Kalshi vs Polymarket spreads?", sub: "r/PredictionMarkets", base: 642, rate: 4, comments: 97 },
  { title: "BTC to $100k by year end, yes or no?", sub: "r/CryptoCurrency", base: 1904, rate: 7, comments: 455 },
] as const;

export function RedditDemo() {
  const { ref, running } = useDemoVisibility();
  const tick = useTick(700, running);
  const hot = tick % REDDIT_POSTS.length;
  const bullish = Math.round(58 + 8 * Math.sin(tick / 5));

  return (
    <DataCardFrame title="Reddit" frameRef={ref} compact>
      {REDDIT_POSTS.map((post, i) => {
        const score = post.base + post.rate * tick + (i === hot && tick ? 12 : 0);
        return (
          <div key={post.title} className="flex h-9 shrink-0 items-center gap-2.5 border-b border-border px-3 text-[11px]">
            <span
              className={cn(
                "flex w-11 shrink-0 items-center gap-0.5 font-mono tabular-nums transition-colors",
                i === hot && tick ? "text-[#FF4500]" : "text-muted-foreground",
              )}
            >
              <ArrowBigUp className="size-3.5 shrink-0" />
              {score >= 1000 ? `${(score / 1000).toFixed(1)}k` : score}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-primary">{post.title}</span>
              <span className="flex items-center gap-1.5 truncate text-[9.5px] text-muted-foreground">
                {post.sub}
                <MessageSquare className="size-2.5" />
                {post.comments + Math.floor((post.rate * tick) / 6)}
              </span>
            </span>
          </div>
        );
      })}
      <div className="px-3.5 pt-2.5 text-[10px] text-muted-foreground">
        <div className="flex justify-between">
          <span>Sentiment on &ldquo;Fed cut&rdquo;</span>
          <span className="font-mono tabular-nums">
            <span className="text-[#0f9f6e]">{bullish}%</span> / <span className="text-[#e5484d]">{100 - bullish}%</span>
          </span>
        </div>
        <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-[#e5484d]/70">
          <span
            className="h-full bg-[#10b981] transition-[width] duration-700 ease-landing-smooth"
            style={{ width: `${bullish}%` }}
          />
        </div>
      </div>
    </DataCardFrame>
  );
}

/* Product Hunt */

const LAUNCHES = [
  { id: "orbit", name: "Orbit Notes", tagline: "Notes that link themselves", base: 412, rate: 2, color: "#0ea5e9" },
  { id: "paperclip", name: "Paperclip", tagline: "Receipts to a spreadsheet in one snap", base: 455, rate: 1.5, color: "#64748b" },
  { id: "fieldwork", name: "Fieldwork AI", tagline: "Site reports written for you", base: 380, rate: 5, color: "#da552f" },
  { id: "tally", name: "Tally Cam", tagline: "Count anything with your camera", base: 300, rate: 3, color: "#16a34a" },
] as const;
const LAUNCH_ROW_H = 36;
const LAUNCH_CYCLE = 42;

export function ProductHuntDemo() {
  const { ref, running } = useDemoVisibility();
  const tick = useTick(450, running);
  const t = tick % LAUNCH_CYCLE;
  const votes = LAUNCHES.map((l) => Math.floor(l.base + l.rate * t));
  const ranking = LAUNCHES.map((_, i) => i).sort((a, b) => votes[b] - votes[a]);
  const rankOf = (i: number) => ranking.indexOf(i);
  const lead = votes[2] - Math.max(...votes.filter((_, i) => i !== 2));
  const odds = Math.round(Math.min(96, Math.max(4, 100 / (1 + Math.exp(-lead / 18)))));

  return (
    <DataCardFrame title="Product Hunt · Today" frameRef={ref} compact>
      <div className="relative shrink-0" style={{ height: LAUNCHES.length * LAUNCH_ROW_H }}>
        {LAUNCHES.map((launch, i) => (
          <div
            key={launch.id}
            className="absolute inset-x-0 flex items-center gap-2.5 border-b border-border px-3 text-[11px] transition-[top] duration-700 ease-landing-smooth"
            style={{ top: rankOf(i) * LAUNCH_ROW_H, height: LAUNCH_ROW_H }}
          >
            <span className="w-4 shrink-0 font-mono text-[10px] text-muted-foreground">#{rankOf(i) + 1}</span>
            <span
              className="flex size-6 shrink-0 items-center justify-center rounded-md text-[10px] font-semibold text-white"
              style={{ backgroundColor: launch.color }}
              aria-hidden
            >
              {launch.name[0]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-primary">{launch.name}</span>
              <span className="block truncate text-[9.5px] text-muted-foreground">{launch.tagline}</span>
            </span>
            <span className="flex w-12 shrink-0 flex-col items-center rounded-md border border-border py-0.5 font-mono text-[10px] tabular-nums text-primary">
              <ArrowBigUp className="size-3 text-[#da552f]" />
              {votes[i]}
            </span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 text-[10px]">
        <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
          <img src="/landing/logos/product-hunt.png" alt="" className="size-3.5 shrink-0 rounded-sm object-contain" />
          <span className="truncate">Fieldwork AI is #1 Product of the Day?</span>
        </span>
        <span className="shrink-0 font-mono tabular-nums text-primary">Yes {odds}¢</span>
      </div>
    </DataCardFrame>
  );
}
