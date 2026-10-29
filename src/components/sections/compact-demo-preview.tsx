"use client";

import { Check, Filter, Laptop, LineChart, Loader2, Search, Sheet } from "lucide-react";
import { useRef, type CSSProperties } from "react";

import { AgentSteps } from "@/components/dashboardComposer/agentSteps";
import { DEMO_WINDOW_TITLE } from "@/components/sections/dashboard-demo-layout";
import { DemoBackdrop } from "@/components/sections/demo-backdrop";
import { DemoWindowMockup } from "@/components/sections/demo-window-mockup";
import { linePath, mulberry32, useInView, usePhases, useReducedMotion } from "@/components/sections/features/feature-kit";
import { openDesktopOnlyNotice } from "@/lib/desktopOnly";
import { cn } from "@/lib/utils";

// pick a source, tap it, type the market, pick columns, three pull steps, rows stream in, hold
const PHASE_MS = [1900, 700, 1700, 1400, 750, 750, 750, 2200, 3400] as const;
const PRESS = 1;
const SEARCH = 2;
const COLUMNS = 3;
const PULL = 4;
const ROWS = 7;
const DONE = PHASE_MS.length - 1;

const MARKET_QUERY = "Fed cut in December";
const ROW_COUNT = "2,400";

const STYLES = `
@keyframes cdp-type { from { clip-path: inset(0 100% 0 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes cdp-caret { 50% { opacity: 0; } }
@keyframes cdp-tap { from { transform: scale(.35); opacity: .5; } to { transform: scale(2.6); opacity: 0; } }
@keyframes cdp-draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
.cdp-type { animation: cdp-type 1.1s steps(${MARKET_QUERY.length}, end) .15s both; }
.cdp-caret { animation: cdp-caret 1s step-end infinite; }
.cdp-tap { animation: cdp-tap .7s cubic-bezier(.2,.7,.3,1) both; }
.cdp-draw { stroke-dasharray: 1; animation: cdp-draw 1.6s cubic-bezier(.4,0,.2,1) .3s both; }
@media (prefers-reduced-motion: reduce) {
  .cdp *, .cdp *::before, .cdp *::after { animation: none !important; transition: none !important; }
}
`;

/**
 * The homepage demo on phones and small tablets. The real app needs a desktop, so this lays a lightweight,
 * non-interactive mock out at desktop size and lets the backdrop crop it; the sidebar carries the motion
 * on the narrowest screens. Tapping it explains why and offers a link for later.
 */
export function CompactDemoFrame() {
  return (
    <DemoBackdrop className="h-[27rem] !p-0 sm:h-[34rem] md:h-[40rem]">
      <div
        aria-hidden
        ref={(el) => el?.setAttribute("inert", "")}
        className="absolute left-4 top-5 w-[68rem] sm:left-8 sm:top-8 md:left-10 md:top-10"
      >
        <DemoWindowMockup title={DEMO_WINDOW_TITLE} contentClassName="h-[44rem]">
          <CompactDemoPreview />
        </DemoWindowMockup>
      </div>
      <button
        type="button"
        onClick={openDesktopOnlyNotice}
        aria-label="The live demo runs on laptops and desktops. Get a link to try it there."
        className="absolute inset-0 z-10 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      />
      <span
        aria-hidden
        className="pointer-events-none absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-full bg-zinc-900/90 px-3.5 py-2 text-xs font-medium text-white shadow-lg sm:bottom-5"
      >
        <Laptop className="size-3.5" />
        Try the live demo on your laptop
        <span className="text-white/60">→</span>
      </span>
    </DemoBackdrop>
  );
}

function CompactDemoPreview() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef, 0.1);
  const reduced = useReducedMotion();
  const { phase: livePhase, loop } = usePhases(PHASE_MS, inView && !reduced);
  const phase = reduced ? DONE : livePhase;

  return (
    <div ref={rootRef} className="cdp flex h-full min-h-0 w-full">
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <Sidebar phase={phase} loop={loop} />
      <main className="relative min-w-0 flex-1 overflow-hidden bg-background px-8 py-7">
        {phase <= PRESS ? (
          <SourcePicker pressed={phase === PRESS} />
        ) : phase <= COLUMNS ? (
          <BuildStep key={`build-${loop}`} phase={phase} />
        ) : phase < ROWS ? (
          <PullStep key={`pull-${loop}`} phase={phase} />
        ) : (
          <SheetStep key={`sheet-${loop}`} animate={!reduced} />
        )}
      </main>
    </div>
  );
}

/* Sidebar: past research plus the task this loop is building. */

const HISTORY = [
  { title: "Election odds gap", detail: "Kalshi vs Polymarket", time: "12m", live: true },
  { title: "BTC 15-min terminal", detail: "Chainlink + Polymarket", time: "1h", live: true },
  { title: "Hurricane markets", detail: "NOAA storms + Kalshi", time: "3h" },
  { title: "Kalshi trade history", detail: "Recipe · CSV export", time: "1d" },
  { title: "Are 90% markets 90% likely?", detail: "Polymarket resolved markets", time: "2d" },
] as const;

function taskDetail(phase: number) {
  if (phase === PRESS) return "Kalshi Historical";
  if (phase === SEARCH) return "Finding the market…";
  if (phase === COLUMNS) return "Choosing columns…";
  if (phase < ROWS) return `Pulling trades… ${["620", "1,480", "2,160"][phase - PULL]} rows`;
  if (phase === ROWS) return `${ROW_COUNT} rows · building sheet`;
  return `${ROW_COUNT} rows · Sheet`;
}

function Sidebar({ phase, loop }: { phase: number; loop: number }) {
  const showTask = phase >= PRESS;
  const running = phase < DONE;
  return (
    <aside className="flex w-[13.5rem] shrink-0 flex-col border-r border-border bg-muted/40 sm:w-[16rem]">
      <p className="px-4 pb-2 pt-4 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Your research <span className="tabular-nums">{HISTORY.length + (showTask ? 1 : 0)}</span>
      </p>
      <ul className="flex flex-col">
        {showTask ? (
          <li
            key={`task-${loop}`}
            className="flex gap-2.5 bg-background/80 px-4 py-2.5 shadow-[inset_2px_0_0_#2f6fed] animate-in fade-in-0 slide-in-from-top-2 duration-500 fill-mode-both"
          >
            <span className="mt-0.5 grid size-4 shrink-0 place-items-center">
              {running ? (
                <Loader2 className="size-3.5 animate-spin text-[#2f6fed]" />
              ) : (
                <span className="grid size-4 place-items-center rounded-full bg-[#10b981] text-white animate-in zoom-in-50 duration-300">
                  <Check className="size-2.5" strokeWidth={3.5} />
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[13px] font-medium text-primary">Fed cut trades</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">now</span>
              </span>
              <span
                key={phase}
                className={cn(
                  "mt-0.5 block truncate text-[11.5px] animate-in fade-in-0 duration-300",
                  running ? "text-[#2f6fed]" : "text-muted-foreground",
                )}
              >
                {taskDetail(phase)}
              </span>
            </span>
          </li>
        ) : null}
        {HISTORY.map((item) => (
          <li key={item.title} className="flex gap-2.5 px-4 py-2.5">
            <span className="mt-0.5 grid size-4 shrink-0 place-items-center">
              <span className="grid size-4 place-items-center rounded-full border border-border text-muted-foreground">
                <Check className="size-2.5" strokeWidth={3} />
              </span>
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[13px] text-primary">{item.title}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{item.time}</span>
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 truncate text-[11.5px] text-muted-foreground">
                {"live" in item ? (
                  <span className="size-1.5 shrink-0 rounded-full bg-[#10b981] motion-safe:animate-pulse" />
                ) : null}
                <span className="truncate">{item.detail}</span>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/* Step 1: pick a venue. */

const SOURCES = [
  { name: "Kalshi Historical", detail: "Every Kalshi market, trade, and price since launch", logo: "/landing/logos/kalshi.png", tile: "bg-[#28CC95]" },
  { name: "Kalshi Live", detail: "Live prices, trades, and order books", logo: "/landing/logos/kalshi.png", tile: "bg-[#28CC95]", live: true },
  { name: "Polymarket Historical", detail: "Markets, trades, and holders since launch", logo: "/polymarket.png", tile: "bg-[#2E5CFF]" },
  { name: "Polymarket Live", detail: "Real-time odds and order flow", logo: "/polymarket.png", tile: "bg-[#2E5CFF]", live: true },
  { name: "Chainlink", detail: "Crypto price feeds that settle Polymarket markets", logo: "/chainlink.png", tile: "bg-[#375BD2]", live: true },
] as const;

function SourcePicker({ pressed }: { pressed: boolean }) {
  return (
    <div className="max-w-[36rem]">
      <h3 className="text-[1.375rem] font-semibold leading-snug tracking-tight text-primary">
        What is the first venue you want to research with Lychee?
      </h3>
      <p className="mt-1.5 text-sm text-muted-foreground">Pick a source. You’ll shape the pull in the next step.</p>
      <ul className="mt-5 flex flex-col gap-2.5">
        {SOURCES.map((source, i) => {
          const active = pressed && i === 0;
          return (
            <li
              key={source.name}
              className={cn(
                "relative flex items-center gap-3 rounded-xl border bg-background p-3 transition-all duration-300",
                active ? "scale-[0.99] border-[#2f6fed] bg-[#2f6fed]/[0.06] ring-2 ring-[#2f6fed]/25" : "border-border",
              )}
            >
              <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg p-1.5", source.tile)}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={source.logo} alt="" className="size-full object-contain" />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-medium text-primary">
                  {source.name}
                  {"live" in source ? (
                    <span className="flex items-center gap-1 rounded-full bg-[#10b981]/10 px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-wide text-[#0f9f6e]">
                      <span className="size-1 rounded-full bg-[#10b981]" />
                      Real-time
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block truncate text-xs text-muted-foreground">{source.detail}</span>
              </span>
              {active ? (
                <span className="cdp-tap pointer-events-none absolute left-7 top-1/2 -ml-4 -mt-4 size-8 rounded-full bg-[#2f6fed]/40" />
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* Step 2: find the market and choose columns. */

const RESULTS = [
  { title: "Will the Fed cut rates in December?", ticker: "KXFEDDECISION-25DEC", volume: "$18.2M vol" },
  { title: "Fed cuts 50bps in December?", ticker: "KXFEDDECISION-25DEC-C50", volume: "$2.4M vol" },
] as const;

const COLUMN_CHIPS = ["created_time", "yes_price", "count", "taker_side", "no_price"] as const;

function BuildStep({ phase }: { phase: number }) {
  const choosing = phase >= COLUMNS;
  return (
    <div className="max-w-[36rem]">
      <p className="text-xs text-muted-foreground">
        Sources <span className="px-1">/</span> <span className="text-primary">Kalshi Historical</span>
      </p>
      <div className="mt-3 flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#28CC95] p-1.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/landing/logos/kalshi.png" alt="" className="size-full object-contain" />
        </span>
        <h3 className="text-lg font-semibold tracking-tight text-primary">Pull Kalshi trades</h3>
      </div>

      <p className="mt-5 text-xs font-medium text-primary">Market</p>
      <div className="mt-1.5 flex h-10 items-center gap-2 rounded-lg border border-[#2f6fed] bg-background px-3 ring-2 ring-[#2f6fed]/15">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        {choosing ? (
          <span className="text-sm text-primary">{MARKET_QUERY}</span>
        ) : (
          <>
            <span className="cdp-type whitespace-nowrap text-sm text-primary">{MARKET_QUERY}</span>
            <span className="cdp-caret -ml-1.5 h-4 w-px bg-primary" />
          </>
        )}
      </div>

      <ul className="mt-2 overflow-hidden rounded-lg border border-border">
        {RESULTS.map((result, i) => (
          <li
            key={result.ticker}
            style={{ animationDelay: choosing ? "0ms" : `${1300 + i * 120}ms` } as CSSProperties}
            className={cn(
              "flex items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0 animate-in fade-in-0 slide-in-from-top-1 duration-300 fill-mode-both",
              i === 0 && "bg-[#2f6fed]/[0.06]",
            )}
          >
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] text-primary">{result.title}</span>
              <span className="mt-0.5 block truncate font-mono text-[10.5px] text-muted-foreground">
                {result.ticker} · {result.volume}
              </span>
            </span>
            {i === 0 ? (
              <span className="grid size-4 shrink-0 place-items-center rounded-full bg-[#2f6fed] text-white">
                <Check className="size-2.5" strokeWidth={3.5} />
              </span>
            ) : null}
          </li>
        ))}
      </ul>

      {choosing ? (
        <>
          <p className="mt-5 text-xs font-medium text-primary animate-in fade-in-0 duration-300">Columns</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {COLUMN_CHIPS.map((chip, i) => {
              const on = i < 4;
              return (
                <span
                  key={chip}
                  style={{ animationDelay: `${i * 110}ms` }}
                  className={cn(
                    "flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[11px] animate-in fade-in-0 zoom-in-95 duration-300 fill-mode-both",
                    on ? "border-[#2f6fed]/40 bg-[#2f6fed]/[0.07] text-primary" : "border-border text-muted-foreground",
                  )}
                >
                  {on ? <Check className="size-3 text-[#2f6fed]" strokeWidth={3} /> : null}
                  {chip}
                </span>
              );
            })}
          </div>
          <span
            style={{ animationDelay: "700ms" }}
            className="mt-5 inline-flex h-9 items-center rounded-full bg-secondary px-4 text-sm text-primary-foreground animate-in fade-in-0 duration-300 fill-mode-both dark:text-secondary-foreground"
          >
            Pull {ROW_COUNT} trades
          </span>
        </>
      ) : null}
    </div>
  );
}

/* Step 3: the pull runs. */

const PULL_STEPS = [
  { name: "connect_kalshi", args: { venue: "kalshi", dataset: "historical" } },
  { name: "fetch_trades", args: { market: "KXFEDDECISION-25DEC", columns: 4 } },
  { name: "build_sheet", args: { rows: 2400, name: "Fed cut trades" } },
] as const;

function PullStep({ phase }: { phase: number }) {
  const current = phase - PULL;
  const steps = PULL_STEPS.map((step, i) => ({
    ...step,
    id: step.name,
    status: i < current ? "success" : i === current ? "running" : "pending",
  }));
  return (
    <div className="max-w-[30rem] animate-in fade-in-0 duration-300">
      <p className="text-xs text-muted-foreground">Kalshi Historical · Fed cut in December</p>
      <h3 className="mt-1 text-lg font-semibold tracking-tight text-primary">Pulling your trades</h3>
      <div className="mt-5 rounded-xl border border-border bg-background p-4">
        <AgentSteps steps={steps} variant="Compact" />
      </div>
    </div>
  );
}

/* Step 4: the sheet fills in, with a chart beside it on wider screens. */

const SHEET_ROWS = (() => {
  const rand = mulberry32(12);
  let price = 61;
  return Array.from({ length: 13 }, (_, i) => {
    price = Math.max(52, Math.min(78, price + Math.round((rand() - 0.4) * 4)));
    const minute = 59 - i * 4;
    return {
      time: `Dec 9 · 14:${String(Math.max(0, minute)).padStart(2, "0")}`,
      side: rand() > 0.42 ? "yes" : "no",
      price,
      count: Math.round(20 + rand() * 480),
    };
  });
})();

const CHART_VALUES = [48, 50, 49, 53, 55, 54, 58, 57, 61, 60, 64, 63, 67, 66, 70];

function SheetStep({ animate }: { animate: boolean }) {
  return (
    <div className="flex gap-6">
      <div className="w-[33rem] shrink-0 overflow-hidden rounded-xl border border-border">
        <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-2">
          <Sheet className="size-4 shrink-0 text-[#10b981]" />
          <span className="text-[13px] font-medium text-primary">Fed cut trades</span>
          <span className="text-[11px] tabular-nums text-muted-foreground">{ROW_COUNT} rows</span>
          <span className="ml-auto flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
            <Filter className="size-3" />
            Filter
          </span>
          <span className="flex items-center gap-1 rounded-md border border-border bg-background px-2 py-0.5 text-[11px] text-muted-foreground">
            Group by hour
          </span>
        </div>
        <table className="w-full text-left font-mono text-[11.5px] tabular-nums">
          <thead className="text-[10.5px] text-muted-foreground">
            <tr className="border-b border-border">
              <th className="px-3 py-1.5 font-medium">created_time</th>
              <th className="px-3 py-1.5 font-medium">taker_side</th>
              <th className="px-3 py-1.5 text-right font-medium">yes_price</th>
              <th className="px-3 py-1.5 text-right font-medium">count</th>
            </tr>
          </thead>
          <tbody>
            {SHEET_ROWS.map((row, i) => (
              <tr
                key={i}
                style={animate ? { animationDelay: `${i * 110}ms` } : undefined}
                className="border-b border-border/70 text-primary last:border-b-0 animate-in fade-in-0 slide-in-from-top-1 duration-300 fill-mode-both"
              >
                <td className="px-3 py-1.5 text-muted-foreground">{row.time}</td>
                <td className={cn("px-3 py-1.5", row.side === "yes" ? "text-[#0f9f6e]" : "text-[#e5484d]")}>{row.side}</td>
                <td className="px-3 py-1.5 text-right">{row.price}¢</td>
                <td className="px-3 py-1.5 text-right">{row.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div
        style={animate ? { animationDelay: "900ms" } : undefined}
        className="w-[17rem] shrink-0 self-start rounded-xl border border-border p-3.5 animate-in fade-in-0 slide-in-from-right-2 duration-500 fill-mode-both"
      >
        <p className="flex items-center gap-1.5 text-[12px] font-medium text-primary">
          <LineChart className="size-3.5 text-[#2f6fed]" />
          Yes price, last 24h
        </p>
        <p className="mt-1 text-[1.375rem] font-semibold tabular-nums tracking-tight text-primary">
          70¢ <span className="text-xs font-medium text-[#0f9f6e]">+22¢</span>
        </p>
        <svg viewBox="0 0 240 90" className="mt-2 h-24 w-full" aria-hidden>
          <path
            d={linePath(CHART_VALUES, 240, 90)}
            pathLength={1}
            fill="none"
            stroke="#2f6fed"
            strokeWidth="2"
            strokeLinejoin="round"
            className={animate ? "cdp-draw" : undefined}
          />
        </svg>
      </div>
    </div>
  );
}
