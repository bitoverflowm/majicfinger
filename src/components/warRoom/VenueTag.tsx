"use client";

import { cn } from "@/lib/utils";

import { venueLabel } from "./format";

/** Shared War Room venue/source chip — Kalshi green, Polymarket blue, News violet, plus extended sources. */
export function VenueTag({
  venue,
  dark = false,
  className,
  label,
}: {
  venue: string;
  dark?: boolean;
  className?: string;
  /** Override display text (defaults to venueLabel). */
  label?: string;
}) {
  const v = String(venue || "")
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-");

  const tone =
    v === "kalshi" || v === "kalshi-trader"
      ? "bg-[#28CC95]/20 text-[#28CC95]"
      : v === "polymarket"
        ? dark
          ? "bg-[#2E5CFF]/20 text-[#8da4ff]"
          : "bg-[#2E5CFF]/15 text-[#2E5CFF]"
        : v === "news"
          ? dark
            ? "bg-violet-400/20 text-violet-200"
            : "bg-violet-500/15 text-violet-700"
          : v === "binance"
            ? dark
              ? "bg-amber-400/20 text-amber-200"
              : "bg-amber-500/15 text-amber-700"
            : v === "chainlink"
              ? dark
                ? "bg-sky-400/20 text-sky-200"
                : "bg-sky-500/15 text-sky-700"
              : v === "holders" || v === "whale" || v === "whales" || v === "all-trades"
                ? dark
                  ? "bg-orange-400/20 text-orange-200"
                  : "bg-orange-500/15 text-orange-700"
                : v === "equities" || v === "equity"
                  ? dark
                    ? "bg-emerald-400/20 text-emerald-200"
                    : "bg-emerald-500/15 text-emerald-700"
                  : v === "weather" || v === "nws"
                    ? dark
                      ? "bg-cyan-400/20 text-cyan-200"
                      : "bg-cyan-500/15 text-cyan-700"
                    : v === "flight" || v === "flights" || v === "flight-patterns"
                      ? dark
                        ? "bg-indigo-400/20 text-indigo-200"
                        : "bg-indigo-500/15 text-indigo-700"
                      : v === "satellite" || v === "incidents" || v === "global-incidents"
                        ? dark
                          ? "bg-rose-400/20 text-rose-200"
                          : "bg-rose-500/15 text-rose-700"
                        : dark
                          ? "bg-white/10 text-slate-300"
                          : "bg-muted text-muted-foreground";

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded px-1 py-px text-[9px] font-semibold uppercase tracking-wide",
        tone,
        className,
      )}
    >
      {label || venueLabel(venue)}
    </span>
  );
}
