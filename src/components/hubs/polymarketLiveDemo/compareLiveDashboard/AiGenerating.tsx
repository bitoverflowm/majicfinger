"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import { KALSHI_GREEN, POLYMARKET_BLUE, type AgentStep } from "./types";

export function AiPixelLoader({
  label = "Composing your workspace",
  className,
}: {
  label?: string;
  className?: string;
}) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const id = window.setInterval(() => setElapsed((Date.now() - started) / 1000), 80);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className={cn("flex flex-col items-center justify-center gap-5 px-6 py-10", className)}>
      <div className="grid grid-cols-12 gap-1">
        {Array.from({ length: 96 }, (_, i) => {
          const row = Math.floor(i / 12);
          const col = i % 12;
          const delay = (row + col) * 70;
          const color = (row + col) % 3 === 0 ? KALSHI_GREEN : (row + col) % 3 === 1 ? POLYMARKET_BLUE : undefined;
          return (
            <span
              key={i}
              className="size-2 rounded-[2px] bg-foreground/10 dark:bg-white/10"
              style={{
                animation: `dash-pixel 1.6s ease-in-out ${delay}ms infinite alternate`,
                backgroundColor: color,
                opacity: color ? undefined : 0.35,
              }}
            />
          );
        })}
      </div>
      <div className="text-center">
        <p className="bg-gradient-to-r from-foreground via-foreground/50 to-foreground bg-[length:200%_100%] bg-clip-text text-sm font-medium text-transparent animate-[dash-shimmer_2.4s_linear_infinite]">
          {label}
        </p>
        <p className="mt-1 font-mono text-[11px] text-muted-foreground">{elapsed.toFixed(1)}s</p>
      </div>
      <style>{`
        @keyframes dash-pixel {
          from { opacity: 0.18; transform: scale(0.86); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes dash-shimmer {
          from { background-position: 100% 0; }
          to { background-position: -100% 0; }
        }
      `}</style>
    </div>
  );
}

export function AgentSteps({ steps }: { steps: AgentStep[] }) {
  return (
    <ol className="space-y-3">
      {steps.map((step, index) => {
        const elapsed =
          step.startedAt != null
            ? ((step.endedAt || Date.now()) - step.startedAt) / 1000
            : 0;
        return (
          <li key={step.id} className="flex gap-3">
            <span
              className={cn(
                "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
                step.status === "done"
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  : step.status === "running"
                    ? "bg-secondary/20 text-foreground"
                    : step.status === "error"
                      ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                      : "bg-muted text-muted-foreground",
              )}
            >
              {index + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <code className="text-[12px] font-medium text-foreground">{step.tool}</code>
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                    step.status === "done"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : step.status === "running"
                        ? "text-foreground"
                        : "text-muted-foreground",
                  )}
                >
                  {step.status === "running" ? "running" : step.status}
                </span>
                {step.startedAt ? (
                  <span className="font-mono text-[10px] text-muted-foreground">{elapsed.toFixed(1)}s</span>
                ) : null}
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{step.label}</p>
              <pre className="mt-1 overflow-x-auto rounded-md border border-border/60 bg-muted/30 px-2 py-1.5 font-mono text-[10px] text-muted-foreground">
                {JSON.stringify(step.args)}
              </pre>
              {step.result ? (
                <p className="mt-1 text-[11px] leading-snug text-foreground/80">{step.result}</p>
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
