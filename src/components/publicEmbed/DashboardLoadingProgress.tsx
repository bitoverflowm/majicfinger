"use client";

import { useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_STEPS = ["Opening dashboard", "Reading layout", "Fetching chart data", "Rendering charts"];

/**
 * Step-by-step loading readout for published dashboards (and War Room). Steps advance on a
 * timer until the real content replaces it; with `progress` it tracks chart loading instead.
 * Never gates rendering — overlay only.
 */
export function DashboardLoadingProgress({
  progress,
  steps = DEFAULT_STEPS,
  tone = "default",
  className,
}: {
  progress?: { loaded: number; total: number } | null;
  /** Override step labels (e.g. War Room). Defaults to dashboard copy. */
  steps?: string[];
  /** Dark glass chip for overlays on black stages (War Room map). */
  tone?: "default" | "dark";
  className?: string;
}) {
  const [timedStep, setTimedStep] = useState(0);
  useEffect(() => {
    if (progress) return;
    setTimedStep(0);
    const id = window.setInterval(
      () => setTimedStep((s) => Math.min(s + 1, steps.length - 1)),
      700,
    );
    return () => window.clearInterval(id);
  }, [progress, steps]);

  const total = progress?.total || 0;
  const loaded = Math.min(progress?.loaded || 0, total);
  const step = progress ? (loaded >= total ? steps.length : loaded > 0 ? 3 : 2) : timedStep;
  const pct = progress
    ? total
      ? Math.round(30 + (70 * loaded) / total)
      : 100
    : Math.round(((timedStep + 1) / steps.length) * 70);

  const dark = tone === "dark";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "inline-flex min-w-0 items-center gap-3 rounded-full border py-1.5 pl-2 pr-3 text-[12px] backdrop-blur",
        dark
          ? "border-white/12 bg-black/80 text-slate-200 shadow-[0_8px_28px_rgba(0,0,0,0.45)]"
          : "border-border/70 bg-background/90 text-foreground shadow-sm",
        className,
      )}
    >
      <span className="relative inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[#0d99ff]/10 text-[#0d99ff]">
        <Sparkles className="size-3 motion-safe:animate-pulse" aria-hidden />
      </span>
      <ol className="flex min-w-0 items-center gap-2">
        {steps.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <li
              key={label}
              className={cn(
                "flex items-center gap-1 whitespace-nowrap transition-colors duration-300",
                done
                  ? dark
                    ? "text-slate-500"
                    : "text-muted-foreground"
                  : active
                    ? dark
                      ? "text-white"
                      : "text-foreground"
                    : dark
                      ? "hidden text-slate-600 sm:flex"
                      : "hidden text-muted-foreground/50 sm:flex",
              )}
            >
              {done ? (
                <Check className={cn("size-3", dark ? "text-emerald-400" : "text-emerald-600")} aria-hidden />
              ) : null}
              <span className={cn(active && "font-medium")}>
                {label}
                {active && progress && i === 3 && total ? ` ${loaded}/${total}` : null}
              </span>
            </li>
          );
        })}
      </ol>
      <span
        className={cn(
          "relative hidden h-1 w-16 shrink-0 overflow-hidden rounded-full sm:block",
          dark ? "bg-white/10" : "bg-muted",
        )}
        aria-hidden
      >
        <span
          className="absolute inset-y-0 left-0 rounded-full bg-[#0d99ff] transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </span>
    </div>
  );
}
