"use client";

import {
  Check,
  Copy,
  Database,
  Download,
  Globe,
  LineChart,
  Save,
  SquareTerminal,
  Table2,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { FeatureWindow, mulberry32, useInView, usePhases, useReducedMotion } from "./feature-kit";

const SAVED: readonly { icon: LucideIcon; kind: string; name: string }[] = [
  { icon: Database, kind: "Query", name: "Fed cut trades" },
  { icon: Table2, kind: "Sheet", name: "Hourly volume" },
  { icon: LineChart, kind: "Chart", name: "Fed odds vs CPI" },
  { icon: SquareTerminal, kind: "Terminal", name: "Morning research" },
];
const ACTIVE_ITEM = 2;

const FORMATS = [
  { id: "csv", label: "CSV", size: "2.4 MB" },
  { id: "xlsx", label: "Excel", size: "1.9 MB" },
  { id: "json", label: "JSON", size: "3.1 MB" },
] as const;

const ACTIONS = [
  { label: "Save", icon: Save },
  { label: "Export", icon: Download },
  { label: "Publish", icon: Globe },
] as const;
const PHASE_MS = [3400, 4400, 4800];

const PUBLISH_URL = "lycheedata.com/you/dashboards/fed-odds-vs-cpi";

const ODDS = (() => {
  const rand = mulberry32(5);
  let v = 52;
  return Array.from({ length: 28 }, (_, i) => {
    v += (rand() - 0.45) * 3 + (i === 18 ? 7 : 0);
    return Math.round(Math.min(90, Math.max(30, v)));
  });
})();
const chartPath = (values: readonly number[]) =>
  values.map((v, i) => `${i ? "L" : "M"}${((i / (values.length - 1)) * 300).toFixed(1)} ${(6 + (1 - (v - 30) / 60) * 88).toFixed(1)}`).join(" ");

export function SaveShareDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef);
  const reduced = useReducedMotion();
  const [manual, setManual] = useState(false);
  const { phase, loop, setPhase } = usePhases(PHASE_MS, inView && !reduced && !manual);
  const [format, setFormat] = useState(0);
  const [views, setViews] = useState(126);

  useEffect(() => {
    if (phase !== 2 || reduced) return;
    const id = window.setInterval(() => setViews((v) => v + 1 + Math.floor(Math.random() * 3)), 900);
    return () => window.clearInterval(id);
  }, [phase, reduced]);

  const pick = (next: number) => {
    setManual(true);
    setPhase(next);
  };
  const runKey = `${phase}-${loop}`;

  return (
    <div ref={rootRef} className="size-full">
      <FeatureWindow title="Lychee · Fed research" className="size-full">
        <aside className="hidden w-[36%] min-w-[9.5rem] shrink-0 flex-col gap-1 border-r border-border p-2.5 sm:flex">
          <p className="px-1 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Saved work</p>
          {SAVED.map((item, i) => {
            const Icon = item.icon;
            const active = i === ACTIVE_ITEM;
            return (
              <div
                key={item.name}
                className={cn(
                  "flex items-center gap-2 rounded-md px-1.5 py-1.5 text-[11px]",
                  active ? "bg-muted text-primary" : "text-muted-foreground",
                )}
              >
                <span className="flex size-5 shrink-0 items-center justify-center rounded bg-background ring-1 ring-inset ring-border">
                  <Icon className="size-3" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-primary">{item.name}</span>
                  <span className="block text-[9.5px]">{item.kind}</span>
                </span>
                {active && phase === 0 ? (
                  <Check key={runKey} className="size-3 shrink-0 text-[#0f9f6e] [animation:fx-rise_.3s_.9s_both]" strokeWidth={3} />
                ) : null}
              </div>
            );
          })}
        </aside>

        <div className="relative flex min-w-0 flex-1 flex-col">
          <div className="flex shrink-0 items-center gap-1 border-b border-border px-3 py-2">
            <span className="flex min-w-0 flex-1 items-center gap-1.5 text-[11px] text-muted-foreground">
              <LineChart className="size-3.5 shrink-0" />
              <span className="truncate">Chart</span>
            </span>
            {ACTIONS.map((action, i) => {
              const Icon = action.icon;
              const justSaved = i === 0 && phase === 0;
              return (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => pick(i)}
                  aria-pressed={phase === i}
                  className={cn(
                    "inline-flex h-6 shrink-0 items-center gap-1 rounded-md px-1.5 text-[10.5px] font-medium transition-colors",
                    phase === i ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-primary",
                  )}
                >
                  {justSaved ? (
                    <Check key={runKey} className="size-3 [animation:fx-rise_.3s_.9s_both]" strokeWidth={3} />
                  ) : (
                    <Icon className="size-3" />
                  )}
                  <span className="hidden sm:inline">{justSaved ? "Saved" : action.label}</span>
                </button>
              );
            })}
          </div>

          <div className="relative min-h-0 flex-1 p-3">
            <div className="flex h-full flex-col rounded-lg border border-border p-2.5">
              <p className="truncate text-[12px] font-medium text-primary">Fed odds vs CPI</p>
              <div className="mb-1 mt-0.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-[#2f6fed]" /> Fed cut odds
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-px bg-[#a855f7]" /> CPI release
                </span>
              </div>
              <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="min-h-0 w-full flex-1" aria-hidden>
                <line x1="200" x2="200" y1="0" y2="100" stroke="#a855f7" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
                <path d={chartPath(ODDS)} fill="none" stroke="#2f6fed" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>

            {phase === 0 ? (
              <Toast key={runKey} delay=".9s">
                Saved. Pick up where you left off.
              </Toast>
            ) : null}

            {phase === 1 ? (
              <div
                key={runKey}
                className="absolute right-3 top-1 z-10 w-48 rounded-lg border border-border bg-background p-1.5 shadow-lg [animation:fx-slide-in_.3s_both]"
              >
                <p className="px-1.5 pb-1 text-[10px] text-muted-foreground">Export results as</p>
                {FORMATS.map((f, i) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => {
                      setManual(true);
                      setFormat(i);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-md px-1.5 py-1 text-[11px] transition-colors hover:bg-muted",
                      i === format ? "bg-muted text-primary" : "text-primary",
                    )}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="w-9 rounded bg-background px-1 text-center font-mono text-[9.5px] ring-1 ring-inset ring-border">
                        .{f.id}
                      </span>
                      {f.label}
                    </span>
                    <span className="font-mono text-[10px] text-muted-foreground">{f.size}</span>
                  </button>
                ))}
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-muted">
                  <div key={`${runKey}-${format}`} className="h-full origin-left rounded-full bg-[#10b981] [animation:fx-fill_1.4s_.5s_ease-out_both]" />
                </div>
                <p key={`${runKey}-${format}-done`} className="px-0.5 pt-1 text-[10px] text-[#0f9f6e] [animation:fx-rise_.3s_1.9s_both]">
                  Downloaded fed-odds-vs-cpi.{FORMATS[format].id}
                </p>
              </div>
            ) : null}

            {phase === 2 ? (
              <div
                key={runKey}
                className="absolute inset-x-3 bottom-3 z-10 rounded-lg border border-border bg-background p-2.5 shadow-lg [animation:fx-rise_.35s_both]"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-primary">
                    <Globe className="size-3.5 text-[#2f6fed]" />
                    Published · interactive
                  </span>
                  <span className="font-mono text-[10px] tabular-nums text-muted-foreground">{views} views</span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 rounded-md bg-muted px-2 py-1.5">
                  <span className="min-w-0 flex-1 truncate font-mono text-[10px] text-primary">{PUBLISH_URL}</span>
                  <span className="inline-flex shrink-0 items-center gap-1 text-[10px] text-[#0f9f6e] [animation:fx-rise_.3s_1.1s_both]">
                    <Copy className="size-3" /> Copied
                  </span>
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  Anyone with the link can hover, zoom, and filter the chart.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </FeatureWindow>
    </div>
  );
}

function Toast({ children, delay }: { children: string; delay: string }) {
  return (
    <div className="pointer-events-none absolute inset-x-3 bottom-5 z-10 flex justify-center">
      <div
        className="flex items-center gap-2 truncate rounded-lg bg-primary px-3 py-2 text-[11px] text-primary-foreground shadow-lg [animation:fx-rise_.35s_both]"
        style={{ animationDelay: delay }}
      >
        <Check className="size-3.5 shrink-0 text-[#10b981]" strokeWidth={3} />
        {children}
      </div>
    </div>
  );
}
