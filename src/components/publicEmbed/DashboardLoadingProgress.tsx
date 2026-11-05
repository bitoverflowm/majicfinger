"use client";

import { useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Opening dashboard", "Reading layout", "Fetching chart data", "Rendering charts"];

/**
 * Step-by-step loading readout for published dashboards. Steps advance on a timer until the
 * real content replaces it; with `progress` it tracks chart loading instead.
 */
export function DashboardLoadingProgress({
  progress,
  className,
}: {
  progress?: { loaded: number; total: number } | null;
  className?: string;
}) {
  const [timedStep, setTimedStep] = useState(0);
  useEffect(() => {
    if (progress) return;
    const id = window.setInterval(() => setTimedStep((s) => Math.min(s + 1, STEPS.length - 1)), 700);
    return () => window.clearInterval(id);
  }, [progress]);

  const total = progress?.total || 0;
  const loaded = Math.min(progress?.loaded || 0, total);
  const step = progress ? (loaded >= total ? STEPS.length : loaded > 0 ? 3 : 2) : timedStep;
  const pct = progress
    ? total
      ? Math.round(30 + (70 * loaded) / total)
      : 100
    : Math.round(((timedStep + 1) / STEPS.length) * 70);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex min-w-0 items-center gap-3 rounded-full border border-border/70 bg-background/90 py-1.5 pl-2 pr-3 text-[12px] shadow-sm backdrop-blur",
        className,
      )}
    >
      <span className="relative inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[#0d99ff]/10 text-[#0d99ff]">
        <Sparkles className="size-3 motion-safe:animate-pulse" aria-hidden />
      </span>
      <ol className="flex min-w-0 items-center gap-2">
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li
              key={label}
              className={cn(
                "flex items-center gap-1 whitespace-nowrap transition-colors duration-300",
                done ? "text-muted-foreground" : active ? "text-foreground" : "hidden text-muted-foreground/50 sm:flex",
              )}
            >
              {done ? <Check className="size-3 text-emerald-600" aria-hidden /> : null}
              <span className={cn(active && "font-medium")}>
                {label}
                {active && progress && i === 3 && total ? ` ${loaded}/${total}` : null}
              </span>
            </li>
          );
        })}
      </ol>
      <span className="relative hidden h-1 w-16 shrink-0 overflow-hidden rounded-full bg-muted sm:block" aria-hidden>
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-[#0d99ff] transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  );
}
