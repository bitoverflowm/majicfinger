"use client";

import { Bell, Mail, Play, RefreshCw, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { BLUE, FeatureWindow, GREEN, linePath, useInView, useReducedMotion } from "./feature-kit";

const TICK_MS = 700;
const CADENCES = [1, 5, 15] as const;
const START_POINTS = [64, 64.5, 64.2, 65, 65.4, 65.1, 66, 66.6, 66.2, 67, 67.4, 68];
const MAX_POINTS = 16;

type Kind = "refresh" | "alert" | "report";
type LogEntry = { id: number; kind: Kind; text: string; time: string };

const KIND_ICON: Record<Kind, LucideIcon> = { refresh: RefreshCw, alert: Bell, report: Mail };
const KIND_TINT: Record<Kind, string> = {
  refresh: "bg-[#2f6fed]/10 text-[#2f6fed]",
  alert: "bg-[#f59e0b]/15 text-[#c27803]",
  report: "bg-[#10b981]/10 text-[#0f9f6e]",
};

function clock(minute: number) {
  const total = 9 * 60 + minute;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function AutomateDemo() {
  const rootRef = useRef<HTMLDivElement>(null);
  const inView = useInView(rootRef);
  const reduced = useReducedMotion();
  const [minute, setMinute] = useState(0);
  const [points, setPoints] = useState<number[]>(START_POINTS);
  const [log, setLog] = useState<LogEntry[]>([
    { id: -1, kind: "report", text: "Weekly report emailed to 4 people", time: "Mon" },
  ]);
  const [enabled, setEnabled] = useState({ refresh: true, alert: true, report: true });
  const [cadenceIndex, setCadenceIndex] = useState(1);
  const [lastRefresh, setLastRefresh] = useState(0);
  const [flash, setFlash] = useState(0);
  const refreshes = useRef(0);
  const nextId = useRef(0);

  const cadence = CADENCES[cadenceIndex];

  const push = useCallback((kind: Kind, text: string, at: number) => {
    setLog((l) => [{ id: nextId.current++, kind, text, time: clock(at) }, ...l].slice(0, 5));
  }, []);

  const refresh = useCallback(
    (at: number) => {
      refreshes.current += 1;
      const rows = 600 + Math.round(Math.random() * 900);
      setPoints((p) => {
        const last = p[p.length - 1];
        const drift = last > 76 ? -1.2 : last < 58 ? 1.2 : 0.35;
        const next = Math.round((last + drift + (Math.random() - 0.5) * 2.4) * 10) / 10;
        return [...p, next].slice(-MAX_POINTS);
      });
      setLastRefresh(at);
      setFlash((f) => f + 1);
      push("refresh", `Refreshed fed-cut sheet · ${rows.toLocaleString()} new rows`, at);
      if (enabled.alert && refreshes.current % 3 === 2) {
        const spread = (3 + Math.random() * 0.9).toFixed(1);
        window.setTimeout(() => push("alert", `Spread hit ${spread}¢ · alert sent to #trading`, at), 450);
      }
    },
    [enabled.alert, push],
  );

  useEffect(() => {
    if (!inView || reduced) return;
    const id = window.setInterval(() => setMinute((m) => m + 1), TICK_MS);
    return () => window.clearInterval(id);
  }, [inView, reduced]);

  useEffect(() => {
    if (minute === 0) return;
    if (enabled.refresh && minute % cadence === 0) refresh(minute);
    if (enabled.report && minute % 30 === 22) push("report", "Daily summary emailed to 4 people", minute);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minute]);

  const latest = points[points.length - 1];
  const change = latest - points[0];
  const sinceMin = minute - lastRefresh;

  return (
    <div ref={rootRef} className="size-full">
      <FeatureWindow title="Lychee Terminal" className="size-full">
        <div className="flex w-[44%] min-w-[12rem] shrink-0 flex-col gap-2 border-r border-border p-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Automations</p>
            <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground">{clock(minute)}</span>
          </div>

          <AutomationCard
            icon={RefreshCw}
            title="Refresh fed-cut sheet"
            on={enabled.refresh}
            onToggle={() => setEnabled((e) => ({ ...e, refresh: !e.refresh }))}
            spinning={enabled.refresh && sinceMin === 0 && minute > 0}
          >
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCadenceIndex((i) => (i + 1) % CADENCES.length)}
                className="rounded-md border border-border px-1.5 py-0.5 text-[10.5px] text-primary transition-colors hover:bg-muted"
              >
                Every {cadence} min
              </button>
              <button
                type="button"
                onClick={() => refresh(minute)}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
              >
                <Play className="size-2.5" /> Run now
              </button>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
              {enabled.refresh && !reduced ? (
                <div
                  key={`${cadence}-${Math.floor(minute / cadence)}`}
                  className="h-full origin-left rounded-full [animation:fx-fill_linear_both]"
                  style={{
                    backgroundColor: BLUE,
                    animationDuration: `${cadence * TICK_MS}ms`,
                    animationPlayState: inView ? "running" : "paused",
                  }}
                />
              ) : null}
            </div>
          </AutomationCard>

          <AutomationCard
            icon={Bell}
            title="Alert when spread > 3¢"
            on={enabled.alert}
            onToggle={() => setEnabled((e) => ({ ...e, alert: !e.alert }))}
          >
            <p className="text-[10.5px] text-muted-foreground">Kalshi vs Polymarket · Slack #trading</p>
          </AutomationCard>

          <AutomationCard
            icon={Mail}
            title="Email daily summary"
            on={enabled.report}
            onToggle={() => setEnabled((e) => ({ ...e, report: !e.report }))}
          >
            <p className="text-[10.5px] text-muted-foreground">Every day at 09:22 · 4 people</p>
          </AutomationCard>

          <div className="mt-auto flex items-center gap-2 rounded-lg border border-dashed border-border px-2.5 py-2 text-[10.5px] text-muted-foreground">
            <span
              className={cn("size-1.5 shrink-0 rounded-full", enabled.refresh ? "animate-pulse bg-[#10b981]" : "bg-neutral-400")}
            />
            {enabled.refresh
              ? `Next refresh at ${clock(minute + cadence - (minute % cadence))}`
              : "Refresh paused. Your sheet stays as it is."}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col bg-muted p-3">
          <div
            key={flash}
            className="relative overflow-hidden rounded-lg border border-border bg-background p-3 [animation:fx-flash_1.1s_ease-out]"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-[11px] text-muted-foreground">Fed cuts rates in December?</p>
                <p className="mt-0.5 font-mono text-xl font-medium tabular-nums tracking-tight text-primary">
                  {latest.toFixed(1)}¢
                  <span className={cn("ml-1.5 text-[11px]", change >= 0 ? "text-[#0f9f6e]" : "text-[#e5484d]")}>
                    {change >= 0 ? "+" : ""}
                    {change.toFixed(1)}
                  </span>
                </p>
              </div>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                  enabled.refresh ? "bg-[#10b981]/10 text-[#0f9f6e]" : "bg-muted text-muted-foreground",
                )}
              >
                <span className={cn("size-1.5 rounded-full", enabled.refresh ? "bg-[#10b981]" : "bg-neutral-400")} />
                {enabled.refresh ? (sinceMin === 0 ? "Updated just now" : `Updated ${sinceMin}m ago`) : "Paused"}
              </span>
            </div>
            <svg viewBox="0 0 300 60" preserveAspectRatio="none" className="mt-2 h-14 w-full">
              <defs>
                <linearGradient id="fx-auto-fill" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor={GREEN} stopOpacity="0.25" />
                  <stop offset="100%" stopColor={GREEN} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`${linePath(points, 300, 60)} L300 60 L0 60 Z`} fill="url(#fx-auto-fill)" className="fx-morph" />
              <path d={linePath(points, 300, 60)} fill="none" stroke={GREEN} strokeWidth="2" vectorEffect="non-scaling-stroke" className="fx-morph" />
            </svg>
          </div>

          <p className="mb-1.5 mt-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Activity</p>
          <ul className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
            {log.map((entry) => {
              const Icon = KIND_ICON[entry.kind];
              return (
                <li
                  key={entry.id}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 [animation:fx-slide-in_.45s_ease-out_both]"
                >
                  <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-md", KIND_TINT[entry.kind])}>
                    <Icon className="size-3" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[11px] text-primary">{entry.text}</span>
                  <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{entry.time}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </FeatureWindow>
    </div>
  );
}

function AutomationCard({
  icon: Icon,
  title,
  on,
  onToggle,
  spinning,
  children,
}: {
  icon: LucideIcon;
  title: string;
  on: boolean;
  onToggle: () => void;
  spinning?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-background p-2.5 transition-opacity", !on && "opacity-60")}>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
          <Icon className={cn("size-3", spinning && "animate-spin")} />
        </span>
        <p className="min-w-0 flex-1 truncate text-[11.5px] font-medium text-primary">{title}</p>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={`Toggle ${title}`}
          onClick={onToggle}
          className={cn(
            "relative h-4 w-7 shrink-0 rounded-full transition-colors",
            on ? "bg-[#2f6fed]" : "bg-black/20 dark:bg-white/20",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 size-3 rounded-full bg-white shadow transition-transform",
              on ? "translate-x-3.5" : "translate-x-0.5",
            )}
          />
        </button>
      </div>
      {children}
    </div>
  );
}
