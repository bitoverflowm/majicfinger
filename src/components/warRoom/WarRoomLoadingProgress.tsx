"use client";

import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

function SkeletonRow({ wide }: { wide?: boolean }) {
  return (
    <div className="flex items-center gap-2 border-b border-white/[0.04] px-2.5 py-2" aria-hidden>
      <span className="size-5 shrink-0 animate-pulse rounded bg-white/10" />
      <span className="min-w-0 flex-1 space-y-1.5">
        <span className={cn("block h-2.5 animate-pulse rounded bg-white/10", wide ? "w-[88%]" : "w-[72%]")} />
        <span className="block h-2 w-[42%] animate-pulse rounded bg-white/[0.06]" />
      </span>
      <span className="h-3 w-8 shrink-0 animate-pulse rounded bg-white/10" />
    </div>
  );
}

/** Right-rail placeholder only when there is no snapshot yet (initial cold start). */
export function WarRoomRailSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col" aria-busy="true" aria-label="Loading markets">
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} wide={i % 3 === 0} />
      ))}
    </div>
  );
}

/** War Room compose steps — Spectrum Agent Steps style labels. */
export const WAR_ROOM_LOAD_STEPS = [
  { id: "switch", label: "switch_view", detail: "desk · venue · explore feed" },
  { id: "fetch", label: "fetch_markets", detail: "Kalshi · Polymarket · live quotes" },
  { id: "ping", label: "place_selected_ping", detail: "prioritize pick · skip flood" },
  { id: "rails", label: "update_rails", detail: "markets · activity · detail" },
] as const;

type StepStatus = "done" | "running" | "queued";

/**
 * Spectrum “Agent Steps” timeline for War Room compose — secondary/muted chrome only.
 * Overlay only; never gates the globe.
 */
export function WarRoomAgentStepsLoader({
  tone = "dark",
  className,
}: {
  tone?: "default" | "dark";
  className?: string;
}) {
  const [active, setActive] = useState(0);
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setElapsed(Math.max(0, (Date.now() - startedAt) / 1000));
    }, 100);
    const advance = window.setInterval(() => {
      setActive((s) => Math.min(s + 1, WAR_ROOM_LOAD_STEPS.length - 1));
    }, 850);
    return () => {
      window.clearInterval(tick);
      window.clearInterval(advance);
    };
  }, [startedAt]);

  const dark = tone === "dark";

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "w-full max-w-[22rem] rounded-xl border px-3 py-2.5 text-left shadow-[0_12px_36px_rgba(0,0,0,0.35)] backdrop-blur-md",
        dark
          ? "border-white/12 bg-black/78 text-slate-200"
          : "border-border/70 bg-background/95 text-foreground shadow-sm",
        className,
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <p
          className={cn(
            "text-[10px] font-semibold uppercase tracking-[0.14em]",
            dark ? "text-slate-400" : "text-muted-foreground",
          )}
        >
          Agent steps
        </p>
        <span className={cn("font-mono text-[10px] tabular-nums", dark ? "text-slate-500" : "text-muted-foreground")}>
          {elapsed.toFixed(1)}s
        </span>
      </div>
      <ol className="space-y-2">
        {WAR_ROOM_LOAD_STEPS.map((step, i) => {
          const status: StepStatus = i < active ? "done" : i === active ? "running" : "queued";
          return (
            <li key={step.id} className="flex items-start gap-2.5">
              <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                {status === "done" ? (
                  <Check className={cn("size-3.5", dark ? "text-emerald-400" : "text-emerald-600")} aria-hidden />
                ) : status === "running" ? (
                  <Loader2
                    className={cn("size-3.5 animate-spin", dark ? "text-sky-300" : "text-secondary")}
                    aria-hidden
                  />
                ) : (
                  <span
                    className={cn(
                      "size-1.5 rounded-full",
                      dark ? "bg-white/25" : "bg-muted-foreground/40",
                    )}
                    aria-hidden
                  />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <span
                    className={cn(
                      "font-mono text-[11px]",
                      status === "running"
                        ? dark
                          ? "text-white"
                          : "text-foreground"
                        : status === "done"
                          ? dark
                            ? "text-slate-400"
                            : "text-muted-foreground"
                          : dark
                            ? "text-slate-600"
                            : "text-muted-foreground/60",
                    )}
                  >
                    {step.label}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] uppercase tracking-[0.08em]",
                      status === "running"
                        ? dark
                          ? "text-sky-300/90"
                          : "text-secondary"
                        : dark
                          ? "text-slate-600"
                          : "text-muted-foreground/50",
                    )}
                  >
                    {status}
                    {status === "running" ? ` ${elapsed.toFixed(1)}s` : null}
                  </span>
                </div>
                {status !== "queued" ? (
                  <p
                    className={cn(
                      "mt-0.5 truncate font-mono text-[10px]",
                      dark ? "text-slate-500" : "text-muted-foreground",
                    )}
                  >
                    {step.detail}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
