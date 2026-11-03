"use client";

import { Fragment } from "react";
import { cn } from "@/lib/utils";
import type { Countdown } from "./useBlackFriday";

const UNITS: { key: keyof Countdown; label: string }[] = [
  { key: "days", label: "days" },
  { key: "hours", label: "hrs" },
  { key: "minutes", label: "mins" },
  { key: "seconds", label: "secs" },
];

/** Days / hrs / mins / secs. `tone="inverse"` sits on the dark banner; `tone="surface"` follows the page theme. */
export function CountdownTiles({
  countdown,
  tone = "surface",
  className,
}: {
  countdown: Countdown;
  tone?: "inverse" | "surface";
  className?: string;
}) {
  const inverse = tone === "inverse";
  return (
    <div
      role="timer"
      aria-label={`Offer ends in ${countdown.days} days, ${countdown.hours} hours, ${countdown.minutes} minutes`}
      className={cn("flex items-start gap-1", className)}
    >
      {UNITS.map((unit, index) => (
        <Fragment key={unit.key}>
          {index > 0 ? (
            <span
              aria-hidden
              className={cn("pt-[3px] font-mono text-[12px] leading-none", inverse ? "text-white/30" : "text-muted-foreground/50")}
            >
              :
            </span>
          ) : null}
          <span className="flex flex-col items-center gap-[3px]" aria-hidden>
            <span
              className={cn(
                "min-w-[26px] rounded-[5px] px-1 py-[3px] text-center font-mono text-[12px] font-semibold leading-none tabular-nums",
                inverse
                  ? "bg-white/[0.08] text-white ring-1 ring-inset ring-white/10"
                  : "bg-muted text-foreground ring-1 ring-inset ring-border",
              )}
            >
              {String(countdown[unit.key]).padStart(2, "0")}
            </span>
            <span
              className={cn(
                "font-mono text-[8.5px] uppercase leading-none tracking-[0.12em]",
                inverse ? "text-white/45" : "text-muted-foreground",
              )}
            >
              {unit.label}
            </span>
          </span>
        </Fragment>
      ))}
    </div>
  );
}
