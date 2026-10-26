"use client";

import { useEffect, useState } from "react";
import { Check, Download, Search, Share2 } from "lucide-react";
import { cn } from "@/lib/utils";

const KEYFRAMES = `
@keyframes rp-draw { from { clip-path: inset(0 100% 0 0) } to { clip-path: inset(0 0 0 0) } }
@keyframes rp-scan { 0%, 100% { opacity: .35 } 50% { opacity: 1 } }
@keyframes rp-caret { 0%, 49% { opacity: 1 } 50%, 100% { opacity: 0 } }
`;

const QUERY = "will bitcoin close above 100k this year";
const TICKER = "KXBTCY-26DEC31-T100000";

export const PREVIEW_STEPS = [
  { label: "Search in plain English or paste a ticker", ms: 2800 },
  { label: "Lychee finds the market", ms: 2000 },
  { label: "Finds its trade history on Kalshi", ms: 2200 },
  { label: "Pulls every trade into a sheet", ms: 2400 },
  { label: "Charts it on your dashboard", ms: 2400 },
  { label: "Ready to share or download", ms: 2600 },
];

const RESULTS = [
  { title: "Bitcoin above $100,000 on Dec 31, 2026?", ticker: TICKER, status: "Open" },
  { title: "Bitcoin price range on Dec 31, 2026", ticker: "KXBTC-26DEC31-B99500", status: "Open" },
  { title: "Bitcoin above $100,000 on Dec 31, 2025?", ticker: "KXBTCY-25DEC31-T100000", status: "Settled" },
];

const SOURCES = ["Kalshi Live", "Historical v1", "Historical v2"];

const TRADES = [
  ["Oct 26, 11:02:14", "62¢", "38¢", "1,200", "Yes"],
  ["Oct 26, 11:01:58", "61¢", "39¢", "350", "No"],
  ["Oct 26, 10:59:31", "62¢", "38¢", "4,000", "Yes"],
  ["Oct 26, 10:57:06", "60¢", "40¢", "75", "No"],
  ["Oct 26, 10:54:47", "59¢", "41¢", "2,500", "Yes"],
  ["Oct 26, 10:51:12", "60¢", "40¢", "900", "Yes"],
];

const YES_LINE = "M0,62 L14,58 L28,60 L42,51 L56,54 L70,44 L84,47 L98,38 L112,41 L126,33 L140,36 L154,28 L168,31 L182,24 L200,22";
const NO_LINE = "M0,38 L14,42 L28,40 L42,49 L56,46 L70,56 L84,53 L98,62 L112,59 L126,67 L140,64 L154,72 L168,69 L182,76 L200,78";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const onChange = () => setReduced(query.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

function useStoryStep(paused) {
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (paused) return undefined;
    const timer = window.setTimeout(() => setStep((current) => (current + 1) % PREVIEW_STEPS.length), PREVIEW_STEPS[step].ms);
    return () => window.clearTimeout(timer);
  }, [paused, step]);
  return paused ? PREVIEW_STEPS.length - 1 : step;
}

function useTyped(text, active) {
  const [count, setCount] = useState(active ? 0 : text.length);
  useEffect(() => {
    if (!active) {
      setCount(text.length);
      return undefined;
    }
    setCount(0);
    const timer = window.setInterval(() => {
      setCount((current) => {
        if (current >= text.length) {
          window.clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, 38);
    return () => window.clearInterval(timer);
  }, [active, text]);
  return text.slice(0, count);
}

function useCountUp(target, active, ms = 1600) {
  const [value, setValue] = useState(active ? 0 : target);
  useEffect(() => {
    if (!active) {
      setValue(target);
      return undefined;
    }
    const started = performance.now();
    let frame = 0;
    const tick = (now) => {
      const t = Math.min(1, (now - started) / ms);
      setValue(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [active, ms, target]);
  return value;
}

function StatusPill({ status }) {
  const open = status === "Open";
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        open ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground",
      )}
    >
      {status}
    </span>
  );
}

function StepList({ step }) {
  return (
    <ol className="space-y-1">
      {PREVIEW_STEPS.map((item, index) => {
        const done = index < step;
        const current = index === step;
        return (
          <li
            key={item.label}
            className={cn(
              "flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-[12px] leading-snug transition-colors duration-300",
              current ? "bg-background text-foreground shadow-sm" : done ? "text-foreground" : "text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "mt-px grid size-4 shrink-0 place-items-center rounded-full text-[9px] font-semibold tabular-nums transition-colors duration-300",
                done ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : current ? "bg-[#2f6fed] text-white" : "bg-black/[0.06] dark:bg-white/[0.08]",
              )}
            >
              {done ? <Check className="size-2.5" strokeWidth={3} /> : index + 1}
            </span>
            {item.label}
          </li>
        );
      })}
    </ol>
  );
}

function MarketCard({ compact }) {
  return (
    <div className="rounded-xl border border-border/70 bg-background p-3 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold leading-snug text-foreground">{RESULTS[0].title}</p>
          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">{TICKER}</p>
        </div>
        <StatusPill status="Open" />
      </div>
      {compact ? null : (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {[
            ["Last price", "62¢"],
            ["Volume", "1.4M"],
            ["Open interest", "312K"],
            ["Closes", "Dec 31"],
          ].map(([label, value], index) => (
            <div
              key={label}
              className="rounded-lg bg-black/[0.03] px-2 py-1.5 animate-in fade-in zoom-in-95 duration-300 fill-mode-both dark:bg-white/[0.04]"
              style={{ animationDelay: `${180 + index * 70}ms` }}
            >
              <p className="text-[10px] text-muted-foreground">{label}</p>
              <p className="text-[13px] font-semibold tabular-nums text-foreground">{value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SearchScene({ step }) {
  const typed = useTyped(QUERY, step === 0);
  const showResults = step > 0 || typed.length === QUERY.length;
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex h-10 items-center gap-2 rounded-lg border border-border bg-background px-3 shadow-sm">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span className="truncate text-[13px] text-foreground">{typed}</span>
        {step === 0 ? <span className="-ml-1.5 h-4 w-px bg-foreground motion-safe:animate-[rp-caret_1s_steps(1)_infinite]" /> : null}
      </div>
      {step < 2 ? (
        <div className="space-y-1.5">
          {showResults
            ? RESULTS.map((result, index) => (
                <div
                  key={result.ticker}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors duration-300 animate-in fade-in slide-in-from-top-1 duration-300 fill-mode-both",
                    step >= 1 && index === 0
                      ? "border-[#2f6fed] bg-[#e7f0ff] dark:border-blue-400 dark:bg-blue-500/15"
                      : "border-border/70 bg-background",
                  )}
                  style={{ animationDelay: `${index * 90}ms` }}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12px] font-semibold text-foreground">{result.title}</span>
                    <span className="block truncate font-mono text-[10px] text-muted-foreground">{result.ticker}</span>
                  </span>
                  <StatusPill status={result.status} />
                </div>
              ))
            : null}
        </div>
      ) : null}
      {step >= 1 ? <MarketCard compact={step >= 2} /> : null}
      {step >= 2 ? (
        <div className="rounded-xl border border-border/70 bg-background p-3 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Where the trades live</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {SOURCES.map((source, index) => (
              <div
                key={source}
                className={cn(
                  "flex items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-[11px] font-medium",
                  index === 0
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 animate-in zoom-in-95 duration-300 fill-mode-both [animation-delay:900ms] dark:text-emerald-300"
                    : "border-border/70 text-muted-foreground motion-safe:animate-[rp-scan_0.9s_ease-in-out_1]",
                )}
                style={index === 0 ? undefined : { animationDelay: `${index * 250}ms` }}
              >
                {index === 0 ? <Check className="size-3" strokeWidth={3} /> : null}
                {source}
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground animate-in fade-in duration-500 fill-mode-both [animation-delay:1100ms]">
            Opened after the live cutoff, so every trade comes from Kalshi Live.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function DashboardScene({ step }) {
  const rows = useCountUp(2418, step === 3);
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both">
        <header className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2">
          <p className="truncate text-[12px] font-semibold text-foreground">Trades · {TICKER}</p>
          <span className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground">{rows.toLocaleString()} rows</span>
        </header>
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-border/50 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
              {["Time", "Yes", "No", "Contracts", "Taker"].map((column) => (
                <th key={column} className="px-3 py-1.5 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TRADES.slice(0, step >= 4 ? 3 : 6).map((cells, rowIndex) => (
              <tr
                key={cells[0]}
                className="border-b border-border/40 animate-in fade-in slide-in-from-top-1 duration-300 fill-mode-both last:border-0"
                style={{ animationDelay: step === 3 ? `${rowIndex * 160}ms` : "0ms" }}
              >
                {cells.map((cell, cellIndex) => (
                  <td
                    key={`${cell}-${cellIndex}`}
                    className={cn(
                      "px-3 py-1.5 text-[11px]",
                      cellIndex === 0 ? "text-foreground" : "font-mono text-muted-foreground",
                      cellIndex === 4 && cell === "Yes" && "text-emerald-700 dark:text-emerald-300",
                      cellIndex === 4 && cell === "No" && "text-rose-700 dark:text-rose-300",
                    )}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {step >= 4 ? (
        <div className="rounded-xl border border-border/70 bg-background p-3 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both">
          <div className="flex items-center justify-between">
            <p className="text-[12px] font-semibold text-foreground">Trades · {TICKER} chart</p>
            <span className="flex items-center gap-3 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-emerald-500" /> Yes
              </span>
              <span className="flex items-center gap-1">
                <span className="size-1.5 rounded-full bg-rose-500" /> No
              </span>
            </span>
          </div>
          <svg viewBox="0 0 200 90" className="mt-2 h-24 w-full" preserveAspectRatio="none" aria-hidden>
            {[22, 45, 68].map((y) => (
              <line key={y} x1="0" x2="200" y1={y} y2={y} className="stroke-black/[0.06] dark:stroke-white/[0.08]" strokeWidth="0.5" />
            ))}
            <path
              d={YES_LINE}
              fill="none"
              strokeWidth="1.8"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              className="stroke-emerald-500 motion-safe:animate-[rp-draw_1.4s_cubic-bezier(0.32,0.72,0,1)_both]"
            />
            <path
              d={NO_LINE}
              fill="none"
              strokeWidth="1.8"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              className="stroke-rose-500 motion-safe:animate-[rp-draw_1.4s_cubic-bezier(0.32,0.72,0,1)_200ms_both]"
            />
          </svg>
        </div>
      ) : null}
      {step >= 5 ? (
        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both">
          <span className="flex flex-1 items-center gap-1.5 text-[12px] font-medium text-emerald-700 dark:text-emerald-300">
            <Check className="size-3.5" strokeWidth={3} />
            Dashboard ready
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-[12px] font-medium text-foreground shadow-sm animate-in zoom-in-95 duration-300 fill-mode-both [animation-delay:150ms]">
            <Share2 className="size-3.5" aria-hidden />
            Share
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#2f6fed] px-2.5 py-1.5 text-[12px] font-medium text-white shadow-sm animate-in zoom-in-95 duration-300 fill-mode-both [animation-delay:300ms]">
            <Download className="size-3.5" aria-hidden />
            Download CSV
          </span>
        </div>
      ) : null}
    </div>
  );
}

/** A looping walkthrough of the trade history recipe, shown while its row is hovered. */
export function KalshiTradeHistoryPreview() {
  const reduced = usePrefersReducedMotion();
  const step = useStoryStep(reduced);
  return (
    <div className="grid h-full min-h-0 grid-cols-[minmax(0,15rem)_minmax(0,1fr)] gap-6">
      <style dangerouslySetInnerHTML={{ __html: KEYFRAMES }} />
      <div className="flex min-h-0 flex-col">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">How it works</p>
        <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-foreground">Download Kalshi Trade History</h3>
        <p className="mt-1 text-[12px] leading-relaxed text-muted-foreground">
          Any Kalshi market, open or settled. Lychee picks the right source for its dates.
        </p>
        <div className="mt-5">
          <StepList step={step} />
        </div>
        <p className="mt-auto pt-4 text-[12px] font-medium text-[#2f6fed] dark:text-blue-400">Click to start →</p>
      </div>
      <div className="min-h-0 overflow-hidden rounded-2xl bg-[#e6edf3] p-5 dark:bg-[#1c232b]">
        <div key={step < 3 ? "search" : "dashboard"} className="h-full animate-in fade-in duration-500">
          {step < 3 ? <SearchScene step={step} /> : <DashboardScene step={step} />}
        </div>
      </div>
    </div>
  );
}
